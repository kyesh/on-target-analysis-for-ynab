# Token Storage Implementation Comparison

## Complete CRUD Operations: PostgreSQL vs Firestore

### PostgreSQL Implementation (Recommended)

#### Database Schema
```sql
-- PostgreSQL schema with optimized indexes
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized indexes for session operations
CREATE INDEX idx_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_id ON user_sessions(user_id);
CREATE INDEX idx_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_last_used ON user_sessions(last_used);

-- Automatic cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

#### Prisma Schema
```typescript
// schema.prisma
model UserSession {
  id                    String   @id @default(uuid())
  sessionId            String   @unique @map("session_id")
  userId               String   @map("user_id")
  encryptedAccessToken String   @map("encrypted_access_token")
  encryptedRefreshToken String  @map("encrypted_refresh_token")
  expiresAt            DateTime @map("expires_at")
  createdAt            DateTime @default(now()) @map("created_at")
  lastUsed             DateTime @default(now()) @map("last_used")

  @@index([sessionId])
  @@index([userId])
  @@index([expiresAt])
  @@map("user_sessions")
}
```

#### CRUD Implementation
```typescript
// src/lib/storage/postgresql-token-storage.ts
import { PrismaClient } from '@prisma/client';
import { TokenEncryption } from '../auth/token-encryption';

export class PostgreSQLTokenStorage {
  constructor(private prisma: PrismaClient) {}

  // CREATE: Store new session with encrypted tokens
  async createSession(sessionData: {
    sessionId: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<void> {
    const encryptedAccessToken = await TokenEncryption.encrypt(sessionData.accessToken);
    const encryptedRefreshToken = await TokenEncryption.encrypt(sessionData.refreshToken);
    
    await this.prisma.userSession.create({
      data: {
        sessionId: sessionData.sessionId,
        userId: this.hashUserId(sessionData.userId),
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt: sessionData.expiresAt,
      },
    });
  }

  // READ: Get tokens for session validation
  async getSession(sessionId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    userId: string;
  } | null> {
    const session = await this.prisma.userSession.findUnique({
      where: { sessionId },
      select: {
        encryptedAccessToken: true,
        encryptedRefreshToken: true,
        expiresAt: true,
        userId: true,
        lastUsed: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp asynchronously
    this.updateLastUsedAsync(sessionId);

    return {
      accessToken: await TokenEncryption.decrypt(session.encryptedAccessToken),
      refreshToken: await TokenEncryption.decrypt(session.encryptedRefreshToken),
      expiresAt: session.expiresAt,
      userId: session.userId,
    };
  }

  // UPDATE: Refresh tokens after OAuth refresh
  async updateTokens(sessionId: string, newTokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {
    const encryptedAccessToken = await TokenEncryption.encrypt(newTokens.accessToken);
    const encryptedRefreshToken = await TokenEncryption.encrypt(newTokens.refreshToken);

    await this.prisma.userSession.update({
      where: { sessionId },
      data: {
        encryptedAccessToken,
        encryptedRefreshToken,
        lastUsed: new Date(),
      },
    });
  }

  // DELETE: Remove session (logout)
  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.delete({
      where: { sessionId },
    });
  }

  // BATCH DELETE: Cleanup expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  // GDPR: Delete all user sessions
  async deleteUserSessions(userId: string): Promise<number> {
    const hashedUserId = this.hashUserId(userId);
    const result = await this.prisma.userSession.deleteMany({
      where: { userId: hashedUserId },
    });
    return result.count;
  }

  // Performance optimization: async last used update
  private updateLastUsedAsync(sessionId: string): void {
    setImmediate(async () => {
      try {
        await this.prisma.userSession.update({
          where: { sessionId },
          data: { lastUsed: new Date() },
        });
      } catch (error) {
        console.warn('Failed to update lastUsed:', error);
      }
    });
  }

  private hashUserId(userId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId).digest('hex');
  }
}
```

### Firestore Implementation (Alternative)

#### Collection Structure
```typescript
// Firestore document structure
interface SessionDocument {
  sessionId: string;
  userId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  lastUsed: FirebaseFirestore.Timestamp;
}

// Collection: /sessions/{sessionId}
```

#### CRUD Implementation
```typescript
// src/lib/storage/firestore-token-storage.ts
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { TokenEncryption } from '../auth/token-encryption';

export class FirestoreTokenStorage {
  private db = getFirestore();

  // CREATE: Store new session
  async createSession(sessionData: {
    sessionId: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<void> {
    const encryptedAccessToken = await TokenEncryption.encrypt(sessionData.accessToken);
    const encryptedRefreshToken = await TokenEncryption.encrypt(sessionData.refreshToken);
    
    await this.db.collection('sessions').doc(sessionData.sessionId).set({
      sessionId: sessionData.sessionId,
      userId: this.hashUserId(sessionData.userId),
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt: Timestamp.fromDate(sessionData.expiresAt),
      createdAt: Timestamp.now(),
      lastUsed: Timestamp.now(),
    });
  }

  // READ: Get tokens for session validation
  async getSession(sessionId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    userId: string;
  } | null> {
    const sessionDoc = await this.db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return null;
    }

    const session = sessionDoc.data() as SessionDocument;
    
    if (session.expiresAt.toDate() < new Date()) {
      // Clean up expired session
      this.deleteSessionAsync(sessionId);
      return null;
    }

    // Update last used timestamp asynchronously
    this.updateLastUsedAsync(sessionId);

    return {
      accessToken: await TokenEncryption.decrypt(session.encryptedAccessToken),
      refreshToken: await TokenEncryption.decrypt(session.encryptedRefreshToken),
      expiresAt: session.expiresAt.toDate(),
      userId: session.userId,
    };
  }

  // UPDATE: Refresh tokens
  async updateTokens(sessionId: string, newTokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {
    const encryptedAccessToken = await TokenEncryption.encrypt(newTokens.accessToken);
    const encryptedRefreshToken = await TokenEncryption.encrypt(newTokens.refreshToken);

    await this.db.collection('sessions').doc(sessionId).update({
      encryptedAccessToken,
      encryptedRefreshToken,
      lastUsed: Timestamp.now(),
    });
  }

  // DELETE: Remove session
  async deleteSession(sessionId: string): Promise<void> {
    await this.db.collection('sessions').doc(sessionId).delete();
  }

  // BATCH DELETE: Cleanup expired sessions (complex in Firestore)
  async cleanupExpiredSessions(): Promise<number> {
    const now = Timestamp.now();
    const expiredSessions = await this.db.collection('sessions')
      .where('expiresAt', '<', now)
      .limit(500) // Firestore batch limit
      .get();

    if (expiredSessions.empty) {
      return 0;
    }

    const batch = this.db.batch();
    expiredSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    // If there were 500 results, there might be more
    if (expiredSessions.size === 500) {
      const additionalDeleted = await this.cleanupExpiredSessions();
      return expiredSessions.size + additionalDeleted;
    }

    return expiredSessions.size;
  }

  // GDPR: Delete all user sessions (requires query + batch delete)
  async deleteUserSessions(userId: string): Promise<number> {
    const hashedUserId = this.hashUserId(userId);
    const userSessions = await this.db.collection('sessions')
      .where('userId', '==', hashedUserId)
      .get();

    if (userSessions.empty) {
      return 0;
    }

    const batch = this.db.batch();
    userSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return userSessions.size;
  }

  // Async operations for performance
  private updateLastUsedAsync(sessionId: string): void {
    setImmediate(async () => {
      try {
        await this.db.collection('sessions').doc(sessionId).update({
          lastUsed: Timestamp.now(),
        });
      } catch (error) {
        console.warn('Failed to update lastUsed:', error);
      }
    });
  }

  private deleteSessionAsync(sessionId: string): void {
    setImmediate(async () => {
      try {
        await this.db.collection('sessions').doc(sessionId).delete();
      } catch (error) {
        console.warn('Failed to delete expired session:', error);
      }
    });
  }

  private hashUserId(userId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId).digest('hex');
  }
}
```

## Performance Comparison

### Session Validation Performance Test

```typescript
// Performance testing framework
class PerformanceTest {
  async testSessionValidation(storage: TokenStorage, iterations: number = 1000): Promise<{
    avgTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
  }> {
    const times: number[] = [];
    let successes = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        const session = await storage.getSession(`test-session-${i % 100}`);
        if (session) successes++;
      } catch (error) {
        console.error('Session validation failed:', error);
      }
      
      times.push(performance.now() - start);
    }

    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: successes / iterations,
    };
  }
}

// Expected results:
// PostgreSQL: ~2-5ms average, 99.9% success rate
// Firestore: ~15-50ms average, 99.5% success rate
```

### Batch Operations Performance

```typescript
// Cleanup performance comparison
class CleanupPerformance {
  async testCleanupPerformance(storage: TokenStorage): Promise<{
    deletedCount: number;
    executionTime: number;
  }> {
    const start = performance.now();
    const deletedCount = await storage.cleanupExpiredSessions();
    const executionTime = performance.now() - start;

    return { deletedCount, executionTime };
  }
}

// Expected results:
// PostgreSQL: 1000+ deletes in ~50-100ms
// Firestore: 500 deletes in ~200-500ms (requires multiple batches for >500)
```

## Integration with Cloud Run

### Connection Management

#### PostgreSQL Connection Pooling
```typescript
// src/lib/database/connection-manager.ts
import { PrismaClient } from '@prisma/client';

class ConnectionManager {
  private static instance: PrismaClient;
  
  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        // Optimized for Cloud Run
        log: ['error'],
      });

      // Graceful shutdown
      process.on('beforeExit', async () => {
        await this.instance.$disconnect();
      });
    }

    return this.instance;
  }
}

// Cloud Run environment variables
// DATABASE_URL=postgresql://user:pass@/db?host=/cloudsql/project:region:instance
```

#### Firestore Connection
```typescript
// src/lib/database/firestore-manager.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

class FirestoreManager {
  private static db: FirebaseFirestore.Firestore;

  static getInstance(): FirebaseFirestore.Firestore {
    if (!this.db) {
      // Initialize Firebase Admin (if not already initialized)
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }

      this.db = getFirestore();
    }

    return this.db;
  }
}

// No connection pooling needed - Firestore handles this automatically
```

## Why PostgreSQL Wins for YNAB Application

### 1. **Security and Compliance**
- **ACID transactions** ensure data consistency during token updates
- **Better audit logging** with SQL-based audit tables
- **Granular access controls** with row-level security
- **Encryption at rest** with full control over encryption keys

### 2. **Performance for Session Operations**
- **Faster reads** with optimized indexes (2-5ms vs 15-50ms)
- **Efficient batch operations** for cleanup (1000+ deletes vs 500 limit)
- **Connection pooling** reduces overhead
- **Query optimization** with EXPLAIN ANALYZE

### 3. **Operational Excellence**
- **Point-in-time recovery** for disaster scenarios
- **Rich monitoring** with Cloud SQL insights
- **Automated backups** with configurable retention
- **Maintenance windows** with minimal downtime

### 4. **Development Experience**
- **Type safety** with Prisma ORM
- **SQL expertise** leverages existing team knowledge
- **Migration tools** for schema evolution
- **Testing tools** with database seeding and cleanup

**The additional $25-35/month cost is justified by the superior security, performance, and operational capabilities required for a production financial application.**
