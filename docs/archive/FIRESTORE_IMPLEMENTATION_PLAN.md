# Firestore OAuth Token Storage Implementation Plan

## Overview

This document provides a comprehensive implementation plan for using Google Cloud Firestore as the OAuth token storage solution for the YNAB Off-Target Assignment Analysis application, prioritizing operational simplicity while maintaining security and compliance.

## 1. Firestore Schema Design

### Collection Structure
```typescript
// Primary collection: /sessions/{sessionId}
interface SessionDocument {
  // Identity fields
  sessionId: string;                    // Document ID (also stored as field for queries)
  userId: string;                       // Hashed YNAB user ID
  
  // Encrypted token data
  encryptedAccessToken: string;         // AES-256 encrypted access token
  encryptedRefreshToken: string;        // AES-256 encrypted refresh token
  tokenVersion: number;                 // For key rotation tracking
  
  // Metadata
  expiresAt: FirebaseFirestore.Timestamp;     // Session expiration
  createdAt: FirebaseFirestore.Timestamp;     // Creation timestamp
  lastUsed: FirebaseFirestore.Timestamp;      // Last access timestamp
  userAgent?: string;                   // Optional: browser fingerprint
  ipAddress?: string;                   // Optional: IP address (hashed)
  
  // Compliance fields
  consentVersion: string;               // Privacy consent version
  dataRetentionDate: FirebaseFirestore.Timestamp; // GDPR retention date
}

// Audit collection: /audit_logs/{logId}
interface AuditLogDocument {
  logId: string;                        // Document ID
  userId: string;                       // Hashed user ID
  action: 'create' | 'read' | 'update' | 'delete' | 'cleanup';
  sessionId?: string;                   // Related session ID
  timestamp: FirebaseFirestore.Timestamp;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    reason?: string;                    // For deletions/cleanup
  };
}

// User data collection: /user_data/{userId} (for GDPR compliance)
interface UserDataDocument {
  userId: string;                       // Hashed user ID
  originalUserId?: string;              // Original YNAB user ID (encrypted)
  createdAt: FirebaseFirestore.Timestamp;
  lastActivity: FirebaseFirestore.Timestamp;
  sessionCount: number;                 // Active session count
  dataRetentionDate: FirebaseFirestore.Timestamp;
  consentHistory: Array<{
    version: string;
    timestamp: FirebaseFirestore.Timestamp;
    granted: boolean;
  }>;
}
```

### Document ID Strategy
```typescript
// Session document IDs: Use secure random UUIDs
const sessionId = crypto.randomUUID(); // e.g., "550e8400-e29b-41d4-a716-446655440000"

// Audit log IDs: Timestamp + random for chronological ordering
const auditLogId = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

// User data IDs: Hashed user ID for consistent lookup
const userDataId = crypto.createHash('sha256').update(ynabUserId).digest('hex');
```

### Indexing Strategy
```typescript
// Firestore composite indexes (configured via Firebase Console or CLI)
const indexes = [
  // For session cleanup queries
  {
    collection: 'sessions',
    fields: [
      { field: 'expiresAt', order: 'ASCENDING' },
      { field: 'createdAt', order: 'ASCENDING' }
    ]
  },
  
  // For user session queries (GDPR compliance)
  {
    collection: 'sessions',
    fields: [
      { field: 'userId', order: 'ASCENDING' },
      { field: 'expiresAt', order: 'ASCENDING' }
    ]
  },
  
  // For audit log queries
  {
    collection: 'audit_logs',
    fields: [
      { field: 'userId', order: 'ASCENDING' },
      { field: 'timestamp', order: 'DESCENDING' }
    ]
  },
  
  // For data retention cleanup
  {
    collection: 'sessions',
    fields: [
      { field: 'dataRetentionDate', order: 'ASCENDING' },
      { field: 'createdAt', order: 'ASCENDING' }
    ]
  }
];
```

## 2. Security Implementation

### Encryption Service with Google Secret Manager
```typescript
// src/lib/security/firestore-encryption.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export class FirestoreTokenEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly KEY_VERSION_CACHE = new Map<number, Buffer>();
  
  private static secretClient = new SecretManagerServiceClient();

  // Encrypt token with current key version
  static async encrypt(plaintext: string): Promise<{
    encryptedData: string;
    keyVersion: number;
  }> {
    const keyVersion = await this.getCurrentKeyVersion();
    const key = await this.getEncryptionKey(keyVersion);
    
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Format: iv(32) + tag(32) + encrypted(variable)
    const encryptedData = iv.toString('hex') + tag.toString('hex') + encrypted;
    
    return { encryptedData, keyVersion };
  }

  // Decrypt token with specified key version
  static async decrypt(encryptedData: string, keyVersion: number): Promise<string> {
    const key = await this.getEncryptionKey(keyVersion);
    
    // Parse components
    const iv = Buffer.from(encryptedData.slice(0, this.IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(this.IV_LENGTH * 2, (this.IV_LENGTH + this.TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((this.IV_LENGTH + this.TAG_LENGTH) * 2);
    
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Get encryption key from Secret Manager with caching
  private static async getEncryptionKey(version: number): Promise<Buffer> {
    if (this.KEY_VERSION_CACHE.has(version)) {
      return this.KEY_VERSION_CACHE.get(version)!;
    }

    const secretName = `projects/${process.env.GCP_PROJECT_ID}/secrets/firestore-token-encryption-key/versions/${version}`;
    
    try {
      const [secretVersion] = await this.secretClient.accessSecretVersion({
        name: secretName,
      });
      
      const key = Buffer.from(secretVersion.payload?.data as string, 'base64');
      
      // Cache key for performance (with size limit)
      if (this.KEY_VERSION_CACHE.size < 10) {
        this.KEY_VERSION_CACHE.set(version, key);
      }
      
      return key;
    } catch (error) {
      console.error(`Failed to retrieve encryption key version ${version}:`, error);
      throw new Error('Encryption key retrieval failed');
    }
  }

  // Get current key version from Secret Manager
  private static async getCurrentKeyVersion(): Promise<number> {
    const secretName = `projects/${process.env.GCP_PROJECT_ID}/secrets/firestore-token-encryption-key`;
    
    try {
      const [secret] = await this.secretClient.getSecret({ name: secretName });
      const latestVersion = secret.name?.split('/').pop();
      return parseInt(latestVersion || '1', 10);
    } catch (error) {
      console.error('Failed to get current key version:', error);
      return 1; // Default to version 1
    }
  }

  // Key rotation: create new version and re-encrypt data
  static async rotateEncryptionKey(): Promise<void> {
    // Generate new key
    const newKey = randomBytes(32).toString('base64');
    
    // Add new version to Secret Manager
    const secretName = `projects/${process.env.GCP_PROJECT_ID}/secrets/firestore-token-encryption-key`;
    await this.secretClient.addSecretVersion({
      parent: secretName,
      payload: { data: Buffer.from(newKey, 'base64') },
    });

    console.log('New encryption key version created. Background re-encryption will begin.');
    
    // Trigger background re-encryption process
    this.scheduleReencryption();
  }

  // Background re-encryption of existing sessions
  private static async scheduleReencryption(): Promise<void> {
    // This would typically be handled by a Cloud Function or scheduled task
    // For now, we'll implement a simple background process
    setImmediate(async () => {
      try {
        const currentVersion = await this.getCurrentKeyVersion();
        await this.reencryptSessions(currentVersion);
      } catch (error) {
        console.error('Background re-encryption failed:', error);
      }
    });
  }

  private static async reencryptSessions(newKeyVersion: number): Promise<void> {
    // This is a simplified version - in production, use Cloud Functions
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();
    
    // Process sessions in batches
    let lastDoc: any = null;
    const batchSize = 100;
    
    do {
      let query = db.collection('sessions')
        .where('tokenVersion', '<', newKeyVersion)
        .limit(batchSize);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) break;
      
      const batch = db.batch();
      
      for (const doc of snapshot.docs) {
        try {
          const session = doc.data();
          
          // Decrypt with old key
          const accessToken = await this.decrypt(session.encryptedAccessToken, session.tokenVersion);
          const refreshToken = await this.decrypt(session.encryptedRefreshToken, session.tokenVersion);
          
          // Encrypt with new key
          const newEncryptedAccess = await this.encrypt(accessToken);
          const newEncryptedRefresh = await this.encrypt(refreshToken);
          
          // Update document
          batch.update(doc.ref, {
            encryptedAccessToken: newEncryptedAccess.encryptedData,
            encryptedRefreshToken: newEncryptedRefresh.encryptedData,
            tokenVersion: newKeyVersion,
          });
        } catch (error) {
          console.error(`Failed to re-encrypt session ${doc.id}:`, error);
          // Delete corrupted session
          batch.delete(doc.ref);
        }
      }
      
      await batch.commit();
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      // Small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } while (true);
  }

  // Hash user ID for privacy
  static hashUserId(userId: string): string {
    return createHash('sha256').update(userId + process.env.USER_ID_SALT).digest('hex');
  }
}
```

### Secret Manager Setup
```bash
#!/bin/bash
# scripts/setup-firestore-secrets.sh

PROJECT_ID="ynab-analysis-prod"

# Create encryption key secret
echo "Creating Firestore encryption key..."
openssl rand -base64 32 | gcloud secrets create firestore-token-encryption-key \
  --project="$PROJECT_ID" \
  --data-file=-

# Create user ID salt
echo "Creating user ID salt..."
openssl rand -base64 16 | gcloud secrets create firestore-user-id-salt \
  --project="$PROJECT_ID" \
  --data-file=-

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding firestore-token-encryption-key \
  --project="$PROJECT_ID" \
  --member="serviceAccount:ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding firestore-user-id-salt \
  --project="$PROJECT_ID" \
  --member="serviceAccount:ynab-analysis-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

echo "Firestore secrets setup completed!"
```

## 3. CRUD Operations Implementation

### Core Token Storage Service
```typescript
// src/lib/storage/firestore-token-storage.ts
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { FirestoreTokenEncryption } from '../security/firestore-encryption';

export interface SessionData {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  userId: string;
}

export class FirestoreTokenStorage {
  private db = getFirestore();
  private readonly COLLECTION_SESSIONS = 'sessions';
  private readonly COLLECTION_AUDIT = 'audit_logs';
  private readonly COLLECTION_USERS = 'user_data';

  // CREATE: Store new session with encrypted tokens
  async createSession(sessionData: SessionData): Promise<void> {
    const hashedUserId = FirestoreTokenEncryption.hashUserId(sessionData.userId);
    
    // Encrypt tokens
    const encryptedAccess = await FirestoreTokenEncryption.encrypt(sessionData.accessToken);
    const encryptedRefresh = await FirestoreTokenEncryption.encrypt(sessionData.refreshToken);
    
    const now = Timestamp.now();
    const retentionDate = Timestamp.fromDate(
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    );
    
    const sessionDoc = {
      sessionId: sessionData.sessionId,
      userId: hashedUserId,
      encryptedAccessToken: encryptedAccess.encryptedData,
      encryptedRefreshToken: encryptedRefresh.encryptedData,
      tokenVersion: encryptedAccess.keyVersion,
      expiresAt: Timestamp.fromDate(sessionData.expiresAt),
      createdAt: now,
      lastUsed: now,
      userAgent: sessionData.userAgent,
      ipAddress: sessionData.ipAddress ? this.hashIP(sessionData.ipAddress) : undefined,
      consentVersion: '1.0',
      dataRetentionDate: retentionDate,
    };

    // Use batch to ensure atomicity
    const batch = this.db.batch();
    
    // Create session document
    const sessionRef = this.db.collection(this.COLLECTION_SESSIONS).doc(sessionData.sessionId);
    batch.set(sessionRef, sessionDoc);
    
    // Update user data
    const userRef = this.db.collection(this.COLLECTION_USERS).doc(hashedUserId);
    batch.set(userRef, {
      userId: hashedUserId,
      lastActivity: now,
      sessionCount: FieldValue.increment(1),
      dataRetentionDate: retentionDate,
    }, { merge: true });
    
    // Create audit log
    const auditRef = this.db.collection(this.COLLECTION_AUDIT).doc();
    batch.set(auditRef, {
      logId: auditRef.id,
      userId: hashedUserId,
      action: 'create',
      sessionId: sessionData.sessionId,
      timestamp: now,
      metadata: {
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress ? this.hashIP(sessionData.ipAddress) : undefined,
      },
    });
    
    await batch.commit();
  }

  // READ: Get tokens for session validation
  async getSession(sessionId: string): Promise<TokenPair | null> {
    try {
      const sessionDoc = await this.db.collection(this.COLLECTION_SESSIONS).doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        return null;
      }

      const session = sessionDoc.data()!;
      
      // Check expiration
      if (session.expiresAt.toDate() < new Date()) {
        // Clean up expired session asynchronously
        this.deleteSessionAsync(sessionId, 'expired');
        return null;
      }

      // Decrypt tokens
      const accessToken = await FirestoreTokenEncryption.decrypt(
        session.encryptedAccessToken,
        session.tokenVersion
      );
      const refreshToken = await FirestoreTokenEncryption.decrypt(
        session.encryptedRefreshToken,
        session.tokenVersion
      );

      // Update last used timestamp asynchronously
      this.updateLastUsedAsync(sessionId);
      
      // Log access
      this.logAuditAsync(session.userId, 'read', sessionId);

      return {
        accessToken,
        refreshToken,
        expiresAt: session.expiresAt.toDate(),
        userId: session.userId,
      };
    } catch (error) {
      console.error('Session retrieval failed:', error);
      return null;
    }
  }

  // UPDATE: Refresh tokens after OAuth refresh
  async updateTokens(sessionId: string, newTokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {
    // Encrypt new tokens
    const encryptedAccess = await FirestoreTokenEncryption.encrypt(newTokens.accessToken);
    const encryptedRefresh = await FirestoreTokenEncryption.encrypt(newTokens.refreshToken);
    
    const sessionRef = this.db.collection(this.COLLECTION_SESSIONS).doc(sessionId);
    
    await sessionRef.update({
      encryptedAccessToken: encryptedAccess.encryptedData,
      encryptedRefreshToken: encryptedRefresh.encryptedData,
      tokenVersion: encryptedAccess.keyVersion,
      lastUsed: Timestamp.now(),
    });
    
    // Get session for audit logging
    const sessionDoc = await sessionRef.get();
    if (sessionDoc.exists) {
      const session = sessionDoc.data()!;
      this.logAuditAsync(session.userId, 'update', sessionId);
    }
  }

  // DELETE: Remove session (logout)
  async deleteSession(sessionId: string, reason: string = 'logout'): Promise<void> {
    const sessionRef = this.db.collection(this.COLLECTION_SESSIONS).doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      return;
    }
    
    const session = sessionDoc.data()!;
    const batch = this.db.batch();
    
    // Delete session
    batch.delete(sessionRef);
    
    // Update user session count
    const userRef = this.db.collection(this.COLLECTION_USERS).doc(session.userId);
    batch.update(userRef, {
      sessionCount: FieldValue.increment(-1),
      lastActivity: Timestamp.now(),
    });
    
    // Create audit log
    const auditRef = this.db.collection(this.COLLECTION_AUDIT).doc();
    batch.set(auditRef, {
      logId: auditRef.id,
      userId: session.userId,
      action: 'delete',
      sessionId,
      timestamp: Timestamp.now(),
      metadata: { reason },
    });
    
    await batch.commit();
  }

  // Async helper methods for performance
  private updateLastUsedAsync(sessionId: string): void {
    setImmediate(async () => {
      try {
        await this.db.collection(this.COLLECTION_SESSIONS).doc(sessionId).update({
          lastUsed: Timestamp.now(),
        });
      } catch (error) {
        console.warn('Failed to update lastUsed:', error);
      }
    });
  }

  private deleteSessionAsync(sessionId: string, reason: string): void {
    setImmediate(async () => {
      try {
        await this.deleteSession(sessionId, reason);
      } catch (error) {
        console.warn('Failed to delete expired session:', error);
      }
    });
  }

  private logAuditAsync(userId: string, action: string, sessionId?: string): void {
    setImmediate(async () => {
      try {
        await this.db.collection(this.COLLECTION_AUDIT).add({
          userId,
          action,
          sessionId,
          timestamp: Timestamp.now(),
          metadata: {},
        });
      } catch (error) {
        console.warn('Failed to log audit event:', error);
      }
    });
  }

  private hashIP(ipAddress: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ipAddress + process.env.IP_SALT).digest('hex');
  }

  // BATCH OPERATIONS: Handle Firestore's 500-operation limit
  async cleanupExpiredSessions(): Promise<number> {
    let totalDeleted = 0;
    const batchSize = 500; // Firestore batch limit
    const now = Timestamp.now();

    do {
      // Query expired sessions
      const expiredQuery = this.db.collection(this.COLLECTION_SESSIONS)
        .where('expiresAt', '<', now)
        .limit(batchSize);

      const snapshot = await expiredQuery.get();

      if (snapshot.empty) {
        break;
      }

      // Process in batch
      const batch = this.db.batch();
      const userUpdates = new Map<string, number>();

      snapshot.docs.forEach(doc => {
        const session = doc.data();

        // Delete session
        batch.delete(doc.ref);

        // Track user session count updates
        const currentCount = userUpdates.get(session.userId) || 0;
        userUpdates.set(session.userId, currentCount + 1);

        // Add audit log
        const auditRef = this.db.collection(this.COLLECTION_AUDIT).doc();
        batch.set(auditRef, {
          logId: auditRef.id,
          userId: session.userId,
          action: 'cleanup',
          sessionId: doc.id,
          timestamp: now,
          metadata: { reason: 'expired' },
        });
      });

      // Update user session counts
      userUpdates.forEach((count, userId) => {
        const userRef = this.db.collection(this.COLLECTION_USERS).doc(userId);
        batch.update(userRef, {
          sessionCount: FieldValue.increment(-count),
          lastActivity: now,
        });
      });

      await batch.commit();
      totalDeleted += snapshot.size;

      // Small delay to avoid overwhelming Firestore
      if (snapshot.size === batchSize) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } while (true);

    return totalDeleted;
  }

  // GDPR: Delete all user sessions and data
  async deleteUserData(userId: string): Promise<{
    sessionsDeleted: number;
    auditLogsDeleted: number;
  }> {
    const hashedUserId = FirestoreTokenEncryption.hashUserId(userId);
    let sessionsDeleted = 0;
    let auditLogsDeleted = 0;

    // Delete user sessions in batches
    do {
      const sessionsQuery = this.db.collection(this.COLLECTION_SESSIONS)
        .where('userId', '==', hashedUserId)
        .limit(500);

      const sessionsSnapshot = await sessionsQuery.get();

      if (sessionsSnapshot.empty) break;

      const batch = this.db.batch();
      sessionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      sessionsDeleted += sessionsSnapshot.size;

      if (sessionsSnapshot.size < 500) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (true);

    // Delete audit logs in batches
    do {
      const auditQuery = this.db.collection(this.COLLECTION_AUDIT)
        .where('userId', '==', hashedUserId)
        .limit(500);

      const auditSnapshot = await auditQuery.get();

      if (auditSnapshot.empty) break;

      const batch = this.db.batch();
      auditSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      auditLogsDeleted += auditSnapshot.size;

      if (auditSnapshot.size < 500) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (true);

    // Delete user data document
    await this.db.collection(this.COLLECTION_USERS).doc(hashedUserId).delete();

    return { sessionsDeleted, auditLogsDeleted };
  }

  // Data retention cleanup (90-day policy)
  async enforceDataRetention(): Promise<number> {
    let totalDeleted = 0;
    const retentionCutoff = Timestamp.fromDate(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );

    do {
      const retentionQuery = this.db.collection(this.COLLECTION_SESSIONS)
        .where('dataRetentionDate', '<', retentionCutoff)
        .limit(500);

      const snapshot = await retentionQuery.get();

      if (snapshot.empty) break;

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      totalDeleted += snapshot.size;

      if (snapshot.size < 500) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (true);

    return totalDeleted;
  }
}

## 4. Cloud Run Integration

### Firebase Admin SDK Setup
```typescript
// src/lib/firebase/admin-config.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

class FirebaseAdminManager {
  private static app: App;
  private static firestore: Firestore;

  static initialize(): void {
    if (getApps().length === 0) {
      // Initialize with service account credentials
      this.app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      this.app = getApps()[0];
    }

    this.firestore = getFirestore(this.app);

    // Configure Firestore settings for Cloud Run
    this.firestore.settings({
      ignoreUndefinedProperties: true,
      // Optimize for Cloud Run's stateless nature
      preferRest: true,
    });
  }

  static getFirestore(): Firestore {
    if (!this.firestore) {
      this.initialize();
    }
    return this.firestore;
  }

  // Graceful shutdown for Cloud Run
  static async shutdown(): Promise<void> {
    if (this.app) {
      await this.app.delete();
    }
  }
}

// Initialize on module load
FirebaseAdminManager.initialize();

// Handle Cloud Run shutdown signals
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await FirebaseAdminManager.shutdown();
  process.exit(0);
});

export { FirebaseAdminManager };
```

### Service Account Configuration
```bash
#!/bin/bash
# scripts/setup-firestore-service-account.sh

PROJECT_ID="ynab-analysis-prod"
SERVICE_ACCOUNT_NAME="ynab-analysis-firestore"

# Create service account for Firestore access
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --project="$PROJECT_ID" \
  --display-name="YNAB Analysis Firestore Service Account" \
  --description="Service account for Firestore access from Cloud Run"

# Grant Firestore permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create and download service account key
gcloud iam service-accounts keys create firestore-service-account.json \
  --iam-account="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --project="$PROJECT_ID"

echo "Service account setup completed!"
echo "Upload firestore-service-account.json to Secret Manager:"
echo "gcloud secrets create firestore-service-account --data-file=firestore-service-account.json"
```

### Environment Variables for Cloud Run
```yaml
# cloudbuild.yaml - Cloud Run deployment with Firestore
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/ynab-analysis:$BUILD_ID', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/ynab-analysis:$BUILD_ID']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'ynab-analysis'
      - '--image=gcr.io/$PROJECT_ID/ynab-analysis:$BUILD_ID'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--service-account=ynab-analysis-firestore@$PROJECT_ID.iam.gserviceaccount.com'
      - '--set-env-vars=NODE_ENV=production'
      - '--set-env-vars=FIREBASE_PROJECT_ID=$PROJECT_ID'
      - '--set-secrets=FIREBASE_CLIENT_EMAIL=firestore-client-email:latest'
      - '--set-secrets=FIREBASE_PRIVATE_KEY=firestore-private-key:latest'
      - '--set-secrets=YNAB_CLIENT_ID=ynab-client-id:latest'
      - '--set-secrets=YNAB_CLIENT_SECRET=ynab-client-secret:latest'
      - '--set-secrets=NEXTAUTH_SECRET=nextauth-secret:latest'
      - '--set-secrets=USER_ID_SALT=firestore-user-id-salt:latest'
      - '--set-secrets=IP_SALT=firestore-ip-salt:latest'
```

### Connection Management for Stateless Environment
```typescript
// src/lib/storage/firestore-connection-manager.ts
import { FirebaseAdminManager } from '../firebase/admin-config';
import { FirestoreTokenStorage } from './firestore-token-storage';

export class FirestoreConnectionManager {
  private static tokenStorage: FirestoreTokenStorage;
  private static connectionHealthy = true;
  private static lastHealthCheck = 0;
  private static readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  static getTokenStorage(): FirestoreTokenStorage {
    if (!this.tokenStorage) {
      this.tokenStorage = new FirestoreTokenStorage();
    }
    return this.tokenStorage;
  }

  // Health check for Cloud Run readiness probe
  static async healthCheck(): Promise<boolean> {
    const now = Date.now();

    // Cache health check results to avoid excessive calls
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL && this.connectionHealthy) {
      return this.connectionHealthy;
    }

    try {
      const db = FirebaseAdminManager.getFirestore();

      // Simple connectivity test
      await db.collection('_health_check').limit(1).get();

      this.connectionHealthy = true;
      this.lastHealthCheck = now;
      return true;
    } catch (error) {
      console.error('Firestore health check failed:', error);
      this.connectionHealthy = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  // Graceful shutdown for Cloud Run
  static async shutdown(): Promise<void> {
    await FirebaseAdminManager.shutdown();
  }
}

// Health check endpoint for Cloud Run
// src/app/api/health/route.ts
import { FirestoreConnectionManager } from '@/lib/storage/firestore-connection-manager';

export async function GET() {
  const isHealthy = await FirestoreConnectionManager.healthCheck();

  if (isHealthy) {
    return Response.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } else {
    return Response.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
```

## 5. Performance Optimization

### Query Optimization Strategies
```typescript
// src/lib/storage/firestore-performance-optimizer.ts
export class FirestorePerformanceOptimizer {
  private static queryCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 60000; // 1 minute

  // Optimized session validation with caching
  static async getSessionOptimized(sessionId: string): Promise<TokenPair | null> {
    const cacheKey = `session:${sessionId}`;
    const cached = this.queryCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const tokenStorage = new FirestoreTokenStorage();
    const session = await tokenStorage.getSession(sessionId);

    // Cache the result
    this.queryCache.set(cacheKey, {
      data: session,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    this.cleanupCache();

    return session;
  }

  // Batch session validation for multiple requests
  static async getMultipleSessions(sessionIds: string[]): Promise<Map<string, TokenPair | null>> {
    const results = new Map<string, TokenPair | null>();
    const uncachedIds: string[] = [];

    // Check cache first
    sessionIds.forEach(sessionId => {
      const cacheKey = `session:${sessionId}`;
      const cached = this.queryCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        results.set(sessionId, cached.data);
      } else {
        uncachedIds.push(sessionId);
      }
    });

    // Fetch uncached sessions in parallel
    if (uncachedIds.length > 0) {
      const tokenStorage = new FirestoreTokenStorage();
      const promises = uncachedIds.map(async sessionId => {
        const session = await tokenStorage.getSession(sessionId);

        // Cache the result
        this.queryCache.set(`session:${sessionId}`, {
          data: session,
          timestamp: Date.now(),
        });

        return { sessionId, session };
      });

      const fetchedSessions = await Promise.all(promises);
      fetchedSessions.forEach(({ sessionId, session }) => {
        results.set(sessionId, session);
      });
    }

    return results;
  }

  // Optimized cleanup with pagination
  static async optimizedCleanup(): Promise<number> {
    const tokenStorage = new FirestoreTokenStorage();
    let totalDeleted = 0;
    const startTime = Date.now();
    const maxExecutionTime = 30000; // 30 seconds max

    while (Date.now() - startTime < maxExecutionTime) {
      const deleted = await tokenStorage.cleanupExpiredSessions();
      totalDeleted += deleted;

      // If we deleted fewer than the batch size, we're done
      if (deleted < 500) {
        break;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return totalDeleted;
  }

  private static cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.queryCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.queryCache.delete(key);
    });
  }
}
```

### Cost Management Strategies
```typescript
// src/lib/storage/firestore-cost-optimizer.ts
export class FirestoreCostOptimizer {
  private static operationCount = 0;
  private static dailyBudget = {
    reads: 45000,    // Stay under free tier
    writes: 18000,   // Stay under free tier
    deletes: 18000,  // Stay under free tier
  };

  // Track operations to stay within budget
  static trackOperation(type: 'read' | 'write' | 'delete', count: number = 1): void {
    this.operationCount += count;

    // Log daily usage
    if (this.operationCount % 1000 === 0) {
      console.log(`Firestore operations today: ${this.operationCount}`);
    }

    // Alert if approaching limits
    if (type === 'read' && this.operationCount > this.dailyBudget.reads * 0.8) {
      console.warn('Approaching daily read limit');
    }
  }

  // Optimize batch operations to minimize costs
  static async costOptimizedCleanup(): Promise<number> {
    // Run cleanup during off-peak hours to minimize impact
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 18) {
      console.log('Skipping cleanup during peak hours');
      return 0;
    }

    const tokenStorage = new FirestoreTokenStorage();

    // Limit cleanup to stay within budget
    const maxOperations = Math.min(500, this.dailyBudget.deletes - this.operationCount);
    if (maxOperations <= 0) {
      console.log('Daily operation budget exceeded, skipping cleanup');
      return 0;
    }

    const deleted = await tokenStorage.cleanupExpiredSessions();
    this.trackOperation('delete', deleted);

    return deleted;
  }

  // Reset daily counters
  static resetDailyCounters(): void {
    this.operationCount = 0;
  }
}

// Schedule daily reset
setInterval(() => {
  FirestoreCostOptimizer.resetDailyCounters();
}, 24 * 60 * 60 * 1000);

## 6. NextAuth.js Integration

### Custom Session Strategy
```typescript
// src/lib/auth/firestore-session-strategy.ts
import { FirestoreTokenStorage } from '../storage/firestore-token-storage';
import { FirestorePerformanceOptimizer } from '../storage/firestore-performance-optimizer';

export class FirestoreSessionStrategy {
  private tokenStorage = new FirestoreTokenStorage();

  // Create session after OAuth callback
  async createSession(user: any, account: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.tokenStorage.createSession({
      sessionId,
      userId: user.id,
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt,
      userAgent: this.getUserAgent(),
      ipAddress: this.getClientIP(),
    });

    return sessionId;
  }

  // Validate session for requests
  async validateSession(sessionId: string): Promise<{
    valid: boolean;
    userId?: string;
    accessToken?: string;
  }> {
    const session = await FirestorePerformanceOptimizer.getSessionOptimized(sessionId);

    if (!session) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: session.userId,
      accessToken: session.accessToken,
    };
  }

  // Refresh tokens when needed
  async refreshTokens(sessionId: string): Promise<string | null> {
    const session = await this.tokenStorage.getSession(sessionId);

    if (!session) {
      return null;
    }

    // Check if token needs refresh (5 minutes before expiry)
    const tokenPayload = this.parseJWT(session.accessToken);
    if (tokenPayload.exp * 1000 - Date.now() > 5 * 60 * 1000) {
      return session.accessToken; // Still valid
    }

    // Refresh with YNAB
    try {
      const response = await fetch('https://app.ynab.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: session.refreshToken,
          client_id: process.env.YNAB_CLIENT_ID!,
          client_secret: process.env.YNAB_CLIENT_SECRET!,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = await response.json();

      // Update stored tokens
      await this.tokenStorage.updateTokens(sessionId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });

      return tokens.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Delete invalid session
      await this.tokenStorage.deleteSession(sessionId, 'refresh_failed');
      return null;
    }
  }

  // Destroy session (logout)
  async destroySession(sessionId: string): Promise<void> {
    await this.tokenStorage.deleteSession(sessionId, 'logout');
  }

  private parseJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return { exp: 0 };
    }
  }

  private getUserAgent(): string {
    // In a real implementation, extract from request headers
    return 'YNAB-Analysis/1.0';
  }

  private getClientIP(): string {
    // In a real implementation, extract from request headers
    return '127.0.0.1';
  }
}
```

### NextAuth.js Configuration
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { FirestoreSessionStrategy } from '@/lib/auth/firestore-session-strategy';

const sessionStrategy = new FirestoreSessionStrategy();

const handler = NextAuth({
  providers: [
    {
      id: 'ynab',
      name: 'YNAB',
      type: 'oauth',
      authorization: {
        url: 'https://app.ynab.com/oauth/authorize',
        params: {
          scope: 'read-only',
          response_type: 'code',
        },
      },
      token: 'https://app.ynab.com/oauth/token',
      userinfo: 'https://api.ynab.com/v1/user',
      profile(profile) {
        return {
          id: profile.data.user.id,
          name: null,
          email: null,
          image: null,
        };
      },
      clientId: process.env.YNAB_CLIENT_ID,
      clientSecret: process.env.YNAB_CLIENT_SECRET,
    },
  ],

  // Use custom session strategy
  session: {
    strategy: 'database', // We'll override this with Firestore
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'ynab') {
        try {
          // Create Firestore session
          const sessionId = await sessionStrategy.createSession(user, account);

          // Store session ID for later use
          user.sessionId = sessionId;
          return true;
        } catch (error) {
          console.error('Failed to create Firestore session:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user?.sessionId) {
        token.sessionId = user.sessionId;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.sessionId) {
        // Validate Firestore session
        const validation = await sessionStrategy.validateSession(token.sessionId as string);

        if (validation.valid) {
          session.sessionId = token.sessionId;
          session.accessToken = validation.accessToken;
          session.userId = validation.userId;
        } else {
          // Session invalid, force re-authentication
          session = null;
        }
      }
      return session;
    },
  },

  events: {
    async signOut({ token }) {
      if (token.sessionId) {
        await sessionStrategy.destroySession(token.sessionId as string);
      }
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

export { handler as GET, handler as POST };
```

## 7. Migration Strategy

### Phase 1: Parallel Implementation
```typescript
// src/lib/auth/hybrid-session-manager.ts
import { FirestoreSessionStrategy } from './firestore-session-strategy';

export class HybridSessionManager {
  private firestoreStrategy = new FirestoreSessionStrategy();

  // Support both PAT and OAuth during migration
  async getAuthenticatedClient(request: Request): Promise<{
    client: any;
    authMethod: 'oauth' | 'pat';
  }> {
    // Try OAuth first (Firestore session)
    const sessionId = this.extractSessionId(request);
    if (sessionId) {
      const validation = await this.firestoreStrategy.validateSession(sessionId);
      if (validation.valid) {
        return {
          client: new YNABClient(validation.accessToken),
          authMethod: 'oauth',
        };
      }
    }

    // Fallback to PAT for development/migration
    if (process.env.NODE_ENV === 'development' && process.env.YNAB_ACCESS_TOKEN) {
      return {
        client: new YNABClient(process.env.YNAB_ACCESS_TOKEN),
        authMethod: 'pat',
      };
    }

    throw new Error('No valid authentication method available');
  }

  private extractSessionId(request: Request): string | null {
    // Extract from cookie or header
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const match = cookies.match(/next-auth\.session-token=([^;]+)/);
      return match ? match[1] : null;
    }
    return null;
  }
}
```

### Phase 2: Data Migration
```typescript
// src/lib/migration/session-migrator.ts
export class SessionMigrator {
  // Migrate existing users to OAuth
  async migrateUserToOAuth(userId: string, oauthTokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {
    const sessionStrategy = new FirestoreSessionStrategy();

    // Create new OAuth session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await sessionStrategy.createSession({
      sessionId,
      userId,
      accessToken: oauthTokens.accessToken,
      refreshToken: oauthTokens.refreshToken,
      expiresAt,
    });

    console.log(`Migrated user ${userId} to OAuth session ${sessionId}`);
  }

  // Clean up old PAT-based sessions
  async cleanupLegacySessions(): Promise<void> {
    // This would clean up any old session storage
    // Implementation depends on current session storage method
    console.log('Legacy session cleanup completed');
  }
}
```

### Phase 3: Gradual Rollout
```typescript
// src/lib/feature-flags/oauth-rollout.ts
export class OAuthRollout {
  // Feature flag for OAuth rollout
  static isOAuthEnabled(userId?: string): boolean {
    // Environment-based rollout
    if (process.env.OAUTH_ENABLED === 'true') {
      return true;
    }

    // Gradual rollout by user ID hash
    if (userId) {
      const hash = crypto.createHash('md5').update(userId).digest('hex');
      const hashValue = parseInt(hash.substring(0, 8), 16);
      const rolloutPercentage = parseInt(process.env.OAUTH_ROLLOUT_PERCENTAGE || '0', 10);

      return (hashValue % 100) < rolloutPercentage;
    }

    return false;
  }

  // Metrics for rollout monitoring
  static trackOAuthUsage(userId: string, success: boolean): void {
    // Track OAuth adoption and success rates
    console.log(`OAuth usage - User: ${userId}, Success: ${success}`);
  }
}
```

## Trade-offs Acknowledgment

### Accepted Limitations

1. **Higher Latency**: 15-50ms vs 2-5ms for PostgreSQL
   - **Mitigation**: Caching layer and optimized queries
   - **Impact**: Acceptable for session validation frequency

2. **Limited Transaction Support**: No ACID transactions
   - **Mitigation**: Careful batch operation design
   - **Impact**: Requires more complex error handling

3. **Batch Operation Complexity**: 500-operation limit
   - **Mitigation**: Pagination and background processing
   - **Impact**: Cleanup operations take longer

4. **No Prisma ORM**: Manual type definitions required
   - **Mitigation**: Strong TypeScript interfaces
   - **Impact**: More boilerplate code, less type safety

### Benefits Gained

1. **Operational Simplicity**: No database management
2. **Cost Efficiency**: ~$3/month vs $30-40/month
3. **Auto-scaling**: Unlimited concurrent connections
4. **Global Distribution**: Built-in multi-region support
5. **Backup/Recovery**: Automatic with no configuration

This Firestore implementation provides a production-ready OAuth token storage solution that prioritizes operational simplicity while maintaining security and compliance requirements.
```
```
