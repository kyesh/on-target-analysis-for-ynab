# Token Storage Strategy for YNAB OAuth Implementation

## Recommended Architecture: Hybrid JWT + Database Approach

### Overview

For the YNAB Off-Target Assignment Analysis application, we recommend a **hybrid approach** that combines JWT-based sessions for stateless operation with encrypted database storage for sensitive tokens.

## Storage Architecture

### 1. Session Management: JWT Tokens (Client-Side)

```typescript
// Session data stored in httpOnly cookies (JWT)
interface SessionData {
  userId: string; // YNAB user ID (hashed)
  sessionId: string; // Unique session identifier
  expiresAt: number; // Session expiration timestamp
  tokenRef: string; // Reference to encrypted tokens in database
}
```

### 2. Token Storage: Encrypted Database (Server-Side)

```typescript
// Encrypted tokens stored in Cloud SQL PostgreSQL
interface TokenRecord {
  id: string; // Primary key
  userId: string; // YNAB user ID (hashed)
  sessionId: string; // Session reference
  encryptedAccessToken: string; // AES-256 encrypted access token
  encryptedRefreshToken: string; // AES-256 encrypted refresh token
  expiresAt: Date; // Token expiration
  createdAt: Date; // Creation timestamp
  lastUsed: Date; // Last access timestamp
}
```

### 3. Encryption Key Management: Google Secret Manager

```typescript
// Encryption keys managed in Google Secret Manager
interface EncryptionKeys {
  tokenEncryptionKey: string; // AES-256 key for token encryption
  sessionSigningKey: string; // HMAC key for JWT signing
  keyVersion: number; // For key rotation
}
```

## Implementation Details

### Database Schema (Cloud SQL PostgreSQL)

```sql
-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_expires_at (expires_at)
);

-- Automatic cleanup of expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour
SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');
```

### Token Encryption Service

```typescript
// src/lib/auth/token-encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class TokenEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  static async encrypt(plaintext: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine iv + tag + encrypted data
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  }

  static async decrypt(encryptedData: string): Promise<string> {
    const key = await this.getEncryptionKey();

    // Extract iv, tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, this.IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(
      encryptedData.slice(
        this.IV_LENGTH * 2,
        (this.IV_LENGTH + this.TAG_LENGTH) * 2
      ),
      'hex'
    );
    const encrypted = encryptedData.slice(
      (this.IV_LENGTH + this.TAG_LENGTH) * 2
    );

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private static async getEncryptionKey(): Promise<Buffer> {
    // Retrieve from Google Secret Manager
    const {
      SecretManagerServiceClient,
    } = require('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();

    const [version] = await client.accessSecretVersion({
      name: `projects/${process.env.GCP_PROJECT_ID}/secrets/token-encryption-key/versions/latest`,
    });

    return Buffer.from(version.payload.data, 'base64');
  }
}
```

### Session Management Service

```typescript
// src/lib/auth/session-manager.ts
import { SignJWT, jwtVerify } from 'jose';
import { TokenEncryption } from './token-encryption';
import { db } from '@/lib/database';

export class SessionManager {
  private static readonly SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private static readonly COOKIE_NAME = 'ynab-session';

  static async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    // Encrypt tokens
    const encryptedAccessToken = await TokenEncryption.encrypt(accessToken);
    const encryptedRefreshToken = await TokenEncryption.encrypt(refreshToken);

    // Store in database
    await db.userSessions.create({
      data: {
        userId: this.hashUserId(userId),
        sessionId,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt,
      },
    });

    // Create JWT session cookie
    const sessionJWT = await this.createSessionJWT({
      userId: this.hashUserId(userId),
      sessionId,
      expiresAt: expiresAt.getTime(),
      tokenRef: sessionId,
    });

    return sessionJWT;
  }

  static async getTokens(
    sessionJWT: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      // Verify and decode JWT
      const sessionData = await this.verifySessionJWT(sessionJWT);
      if (!sessionData || sessionData.expiresAt < Date.now()) {
        return null;
      }

      // Retrieve from database
      const tokenRecord = await db.userSessions.findUnique({
        where: { sessionId: sessionData.sessionId },
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return null;
      }

      // Decrypt tokens
      const accessToken = await TokenEncryption.decrypt(
        tokenRecord.encryptedAccessToken
      );
      const refreshToken = await TokenEncryption.decrypt(
        tokenRecord.encryptedRefreshToken
      );

      // Update last used timestamp
      await db.userSessions.update({
        where: { sessionId: sessionData.sessionId },
        data: { lastUsed: new Date() },
      });

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  static async updateTokens(
    sessionJWT: string,
    newAccessToken: string,
    newRefreshToken: string
  ): Promise<void> {
    const sessionData = await this.verifySessionJWT(sessionJWT);
    if (!sessionData) throw new Error('Invalid session');

    const encryptedAccessToken = await TokenEncryption.encrypt(newAccessToken);
    const encryptedRefreshToken =
      await TokenEncryption.encrypt(newRefreshToken);

    await db.userSessions.update({
      where: { sessionId: sessionData.sessionId },
      data: {
        encryptedAccessToken,
        encryptedRefreshToken,
        lastUsed: new Date(),
      },
    });
  }

  static async destroySession(sessionJWT: string): Promise<void> {
    const sessionData = await this.verifySessionJWT(sessionJWT);
    if (sessionData) {
      await db.userSessions.delete({
        where: { sessionId: sessionData.sessionId },
      });
    }
  }

  private static async createSessionJWT(data: any): Promise<string> {
    const secret = await this.getJWTSecret();
    return await new SignJWT(data)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);
  }

  private static async verifySessionJWT(jwt: string): Promise<any> {
    const secret = await this.getJWTSecret();
    const { payload } = await jwtVerify(jwt, secret);
    return payload;
  }

  private static async getJWTSecret(): Promise<Uint8Array> {
    // Retrieve from Google Secret Manager
    const {
      SecretManagerServiceClient,
    } = require('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();

    const [version] = await client.accessSecretVersion({
      name: `projects/${process.env.GCP_PROJECT_ID}/secrets/session-signing-key/versions/latest`,
    });

    return new TextEncoder().encode(version.payload.data);
  }

  private static hashUserId(userId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId).digest('hex');
  }
}
```

## Why This Architecture?

### 1. Security Benefits

- **Encrypted token storage**: Tokens never stored in plaintext
- **Stateless sessions**: JWT allows horizontal scaling
- **Secure key management**: Google Secret Manager for encryption keys
- **Automatic cleanup**: Expired sessions automatically removed

### 2. Scalability Benefits

- **Horizontal scaling**: JWT sessions work across multiple Cloud Run instances
- **Database efficiency**: Minimal database queries for session validation
- **Caching friendly**: Session data can be cached without security concerns

### 3. Operational Benefits

- **Container restarts**: Sessions persist across container restarts
- **Backup/recovery**: Standard database backup procedures
- **Monitoring**: Database metrics and session analytics

## Cloud SQL PostgreSQL Setup

### Database Configuration

```yaml
# cloudsql-instance.yaml
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLInstance
metadata:
  name: ynab-analysis-db
spec:
  databaseVersion: POSTGRES_14
  region: us-central1
  settings:
    tier: db-f1-micro # Start small, can scale up
    diskSize: 10
    diskType: PD_SSD
    backupConfiguration:
      enabled: true
      startTime: '03:00'
      retainedBackups: 7
    ipConfiguration:
      requireSsl: true
      authorizedNetworks: [] # Use private IP
    maintenanceWindow:
      day: 7 # Sunday
      hour: 4 # 4 AM
```

### Connection from Cloud Run

```typescript
// src/lib/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL, // Cloud SQL connection string
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

## Key Rotation Strategy

### Automated Key Rotation

```typescript
// src/lib/auth/key-rotation.ts
export class KeyRotation {
  static async rotateEncryptionKey(): Promise<void> {
    // 1. Generate new encryption key
    const newKey = crypto.randomBytes(32).toString('base64');

    // 2. Store new key version in Secret Manager
    const client = new SecretManagerServiceClient();
    await client.addSecretVersion({
      parent: `projects/${process.env.GCP_PROJECT_ID}/secrets/token-encryption-key`,
      payload: { data: Buffer.from(newKey, 'base64') },
    });

    // 3. Re-encrypt all existing tokens with new key
    await this.reencryptAllTokens();

    // 4. Disable old key version after grace period
    setTimeout(() => this.disableOldKeyVersion(), 24 * 60 * 60 * 1000); // 24 hours
  }

  private static async reencryptAllTokens(): Promise<void> {
    // Batch process all active sessions
    const sessions = await db.userSessions.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    for (const session of sessions) {
      try {
        // Decrypt with old key, encrypt with new key
        const accessToken = await TokenEncryption.decrypt(
          session.encryptedAccessToken
        );
        const refreshToken = await TokenEncryption.decrypt(
          session.encryptedRefreshToken
        );

        const newEncryptedAccessToken =
          await TokenEncryption.encrypt(accessToken);
        const newEncryptedRefreshToken =
          await TokenEncryption.encrypt(refreshToken);

        await db.userSessions.update({
          where: { id: session.id },
          data: {
            encryptedAccessToken: newEncryptedAccessToken,
            encryptedRefreshToken: newEncryptedRefreshToken,
          },
        });
      } catch (error) {
        console.error(`Failed to re-encrypt session ${session.id}:`, error);
        // Delete corrupted session
        await db.userSessions.delete({ where: { id: session.id } });
      }
    }
  }
}
```

## Cost Analysis

### Database Costs (Cloud SQL)

- **db-f1-micro**: ~$7/month (development)
- **db-g1-small**: ~$25/month (production)
- **Storage**: ~$0.17/GB/month
- **Backup**: ~$0.08/GB/month

### Total Additional Cost: ~$10-30/month

This is justified by the security and scalability benefits for a production application.
