# Database Comparison: Cloud SQL PostgreSQL vs. Firestore for OAuth Token Storage

## Executive Summary

After detailed analysis, **Cloud SQL PostgreSQL remains the recommended choice** for OAuth token storage in the YNAB application, despite Firestore's attractive free tier and NoSQL benefits. The decision is driven by security, compliance, and operational requirements specific to financial data applications.

## 1. Cost Analysis

### Cloud SQL PostgreSQL Costs
```
Instance: db-g1-small (1 vCPU, 1.7GB RAM)
Base Cost: ~$25-35/month
Storage: 20GB SSD = ~$3.40/month
Backup: 7-day retention = ~$1.60/month
Total: ~$30-40/month

Scaling costs:
- db-g1-small: $25-35/month (0-1000 users)
- db-n1-standard-1: $50-70/month (1000-5000 users)
- db-n1-standard-2: $100-140/month (5000+ users)
```

### Firestore Costs
```
Free Tier (very generous):
- 1 GiB storage
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day

Paid Pricing (beyond free tier):
- Storage: $0.18/GiB/month
- Reads: $0.06 per 100,000 operations
- Writes: $0.18 per 100,000 operations
- Deletes: $0.02 per 100,000 operations
```

### Usage Pattern Analysis for YNAB Application
```typescript
// Expected operations for 1000 active users
interface UsageEstimate {
  dailyLogins: 300;           // 30% daily active users
  sessionValidations: 15000;   // 50 validations per active user
  tokenRefreshes: 100;        // ~10% need refresh daily
  sessionCleanups: 50;        // Expired session cleanup
}

// Firestore costs at scale (1000 users):
// Reads: 15,000/day × 30 days = 450,000/month
// Cost: 450,000 × $0.06/100,000 = $2.70/month
// Writes: 400/day × 30 days = 12,000/month (within free tier)
// Storage: ~10MB (well within free tier)
// Total Firestore cost: ~$3/month vs PostgreSQL ~$35/month
```

**Cost Winner: Firestore** (significantly cheaper, especially at small scale)

## 2. Scaling Characteristics

### PostgreSQL Scaling
```sql
-- Session validation query (optimized with indexes)
SELECT expires_at, last_used 
FROM user_sessions 
WHERE session_id = $1 AND expires_at > NOW();

-- Performance characteristics:
-- - Index lookup: O(log n)
-- - Connection pooling: 5-100 connections
-- - Query time: <5ms with proper indexing
-- - Concurrent reads: Excellent
-- - Write throughput: 1000+ TPS
```

### Firestore Scaling
```typescript
// Session validation query
const sessionDoc = await db.collection('sessions').doc(sessionId).get();

// Performance characteristics:
// - Document lookup: O(1) by document ID
// - Auto-scaling: Unlimited concurrent connections
// - Query time: 10-50ms (network latency)
// - Concurrent reads: Excellent (global distribution)
// - Write throughput: 10,000+ TPS per collection
```

### Scaling Comparison Table
| Aspect | PostgreSQL | Firestore | Winner |
|--------|------------|-----------|---------|
| **Read Performance** | <5ms (indexed) | 10-50ms (network) | PostgreSQL |
| **Write Performance** | 1,000 TPS | 10,000+ TPS | Firestore |
| **Connection Limits** | 100-500 connections | Unlimited | Firestore |
| **Global Distribution** | Single region | Multi-region | Firestore |
| **Auto-scaling** | Manual scaling | Automatic | Firestore |

**Scaling Winner: Firestore** (better auto-scaling and global distribution)

## 3. Technical Compatibility

### Prisma ORM Integration

#### PostgreSQL with Prisma (Excellent)
```typescript
// schema.prisma
model UserSession {
  id                    String   @id @default(uuid())
  sessionId            String   @unique
  userId               String
  encryptedAccessToken String
  encryptedRefreshToken String
  expiresAt            DateTime
  createdAt            DateTime @default(now())
  lastUsed             DateTime @default(now())

  @@index([sessionId])
  @@index([userId])
  @@index([expiresAt])
}

// Type-safe operations
const session = await prisma.userSession.findUnique({
  where: { sessionId },
});
```

#### Firestore with Prisma (Limited Support)
```typescript
// Prisma doesn't natively support Firestore
// Must use Firebase Admin SDK directly

import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Manual type definitions required
interface SessionDocument {
  sessionId: string;
  userId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  lastUsed: Timestamp;
}

// No type safety, manual serialization
const sessionRef = db.collection('sessions').doc(sessionId);
const sessionDoc = await sessionRef.get();
const sessionData = sessionDoc.data() as SessionDocument;
```

### Encryption Workflow Integration

#### PostgreSQL Implementation
```typescript
// Seamless integration with existing encryption service
export class PostgreSQLTokenStorage {
  async storeSession(sessionData: SessionData): Promise<void> {
    const encryptedAccessToken = await TokenEncryption.encrypt(sessionData.accessToken);
    const encryptedRefreshToken = await TokenEncryption.encrypt(sessionData.refreshToken);
    
    await prisma.userSession.create({
      data: {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt: sessionData.expiresAt,
      },
    });
  }

  async getTokens(sessionId: string): Promise<TokenPair | null> {
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
    });
    
    if (!session || session.expiresAt < new Date()) return null;
    
    return {
      accessToken: await TokenEncryption.decrypt(session.encryptedAccessToken),
      refreshToken: await TokenEncryption.decrypt(session.encryptedRefreshToken),
    };
  }
}
```

#### Firestore Implementation
```typescript
// More complex due to lack of Prisma integration
export class FirestoreTokenStorage {
  async storeSession(sessionData: SessionData): Promise<void> {
    const encryptedAccessToken = await TokenEncryption.encrypt(sessionData.accessToken);
    const encryptedRefreshToken = await TokenEncryption.encrypt(sessionData.refreshToken);
    
    await db.collection('sessions').doc(sessionData.sessionId).set({
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt: Timestamp.fromDate(sessionData.expiresAt),
      createdAt: Timestamp.now(),
      lastUsed: Timestamp.now(),
    });
  }

  async getTokens(sessionId: string): Promise<TokenPair | null> {
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) return null;
    
    const session = sessionDoc.data() as SessionDocument;
    if (session.expiresAt.toDate() < new Date()) return null;
    
    return {
      accessToken: await TokenEncryption.decrypt(session.encryptedAccessToken),
      refreshToken: await TokenEncryption.decrypt(session.encryptedRefreshToken),
    };
  }
}
```

### Session Management Patterns

#### PostgreSQL Transactions
```typescript
// ACID transactions for complex operations
async updateTokensWithCleanup(sessionId: string, newTokens: TokenPair): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update current session
    await tx.userSession.update({
      where: { sessionId },
      data: {
        encryptedAccessToken: await TokenEncryption.encrypt(newTokens.accessToken),
        encryptedRefreshToken: await TokenEncryption.encrypt(newTokens.refreshToken),
        lastUsed: new Date(),
      },
    });
    
    // Clean up expired sessions for this user
    await tx.userSession.deleteMany({
      where: {
        userId: session.userId,
        expiresAt: { lt: new Date() },
      },
    });
  });
}
```

#### Firestore Batch Operations
```typescript
// Batch operations (limited transaction support)
async updateTokensWithCleanup(sessionId: string, newTokens: TokenPair): Promise<void> {
  const batch = db.batch();
  
  // Update current session
  const sessionRef = db.collection('sessions').doc(sessionId);
  batch.update(sessionRef, {
    encryptedAccessToken: await TokenEncryption.encrypt(newTokens.accessToken),
    encryptedRefreshToken: await TokenEncryption.encrypt(newTokens.refreshToken),
    lastUsed: Timestamp.now(),
  });
  
  // Note: Cannot easily clean up expired sessions in same batch
  // Would require separate query + batch operation
  
  await batch.commit();
}
```

**Technical Compatibility Winner: PostgreSQL** (better Prisma integration, ACID transactions)

## 4. Operational Considerations

### Backup and Disaster Recovery

#### PostgreSQL
```yaml
# Automated backup configuration
backup_configuration:
  enabled: true
  start_time: "03:00"
  point_in_time_recovery_enabled: true
  backup_retention_settings:
    retained_backups: 30
    retention_unit: "COUNT"

# Point-in-time recovery
gcloud sql instances clone ynab-analysis-prod \
  ynab-analysis-recovery \
  --point-in-time="2024-01-15T10:30:00Z"
```

#### Firestore
```typescript
// Firestore automatic backups (limited control)
// - Automatic multi-region replication
// - No point-in-time recovery
// - Export/import for backups

// Manual backup process
const backup = await db.collection('sessions').get();
const backupData = backup.docs.map(doc => ({
  id: doc.id,
  data: doc.data(),
}));
```

### Monitoring and Alerting

#### PostgreSQL Monitoring
```typescript
// Rich monitoring capabilities
const metrics = await cloudSQL.getMetrics({
  instance: 'ynab-analysis-prod',
  metrics: [
    'database/cpu/utilization',
    'database/memory/utilization',
    'database/disk/read_ops_count',
    'database/network/connections',
  ],
});

// Custom application metrics
const sessionMetrics = await prisma.userSession.aggregate({
  _count: { id: true },
  _avg: { lastUsed: true },
  where: { expiresAt: { gt: new Date() } },
});
```

#### Firestore Monitoring
```typescript
// Limited monitoring options
// - Basic read/write metrics
// - No query performance insights
// - Limited custom metrics

// Application-level monitoring required
const sessionCount = await db.collection('sessions')
  .where('expiresAt', '>', Timestamp.now())
  .count()
  .get();
```

### Query Performance

#### PostgreSQL Performance
```sql
-- Optimized session validation (with proper indexes)
EXPLAIN ANALYZE
SELECT expires_at, last_used 
FROM user_sessions 
WHERE session_id = 'abc123' AND expires_at > NOW();

-- Result: Index Scan, ~1-2ms execution time
-- Concurrent queries: 100+ per second
-- Connection pooling: Efficient resource usage
```

#### Firestore Performance
```typescript
// Document lookup performance
const start = Date.now();
const sessionDoc = await db.collection('sessions').doc(sessionId).get();
const duration = Date.now() - start;

// Typical performance: 10-50ms (network latency)
// Concurrent queries: Unlimited
// No connection pooling needed
```

**Operational Winner: PostgreSQL** (better monitoring, backup control, query performance)

## 5. Security and Compliance

### Encryption Strategy Support

#### PostgreSQL
```typescript
// Full control over encryption
class PostgreSQLSecurityManager {
  // Column-level encryption
  async storeEncryptedSession(session: SessionData): Promise<void> {
    await prisma.userSession.create({
      data: {
        sessionId: session.sessionId,
        userId: this.hashUserId(session.userId), // Hash PII
        encryptedAccessToken: await this.encryptWithRotation(session.accessToken),
        encryptedRefreshToken: await this.encryptWithRotation(session.refreshToken),
        expiresAt: session.expiresAt,
      },
    });
  }

  // Encryption key rotation
  async rotateEncryptionKeys(): Promise<void> {
    const sessions = await prisma.userSession.findMany();
    
    await prisma.$transaction(async (tx) => {
      for (const session of sessions) {
        const decryptedAccess = await this.decrypt(session.encryptedAccessToken);
        const decryptedRefresh = await this.decrypt(session.encryptedRefreshToken);
        
        await tx.userSession.update({
          where: { id: session.id },
          data: {
            encryptedAccessToken: await this.encryptWithNewKey(decryptedAccess),
            encryptedRefreshToken: await this.encryptWithNewKey(decryptedRefresh),
          },
        });
      }
    });
  }
}
```

#### Firestore
```typescript
// Application-level encryption only
class FirestoreSecurityManager {
  async storeEncryptedSession(session: SessionData): Promise<void> {
    await db.collection('sessions').doc(session.sessionId).set({
      sessionId: session.sessionId,
      userId: this.hashUserId(session.userId),
      encryptedAccessToken: await this.encrypt(session.accessToken),
      encryptedRefreshToken: await this.encrypt(session.refreshToken),
      expiresAt: Timestamp.fromDate(session.expiresAt),
    });
  }

  // Key rotation more complex (no transactions)
  async rotateEncryptionKeys(): Promise<void> {
    const sessions = await db.collection('sessions').get();
    const batch = db.batch();
    
    // Limited to 500 operations per batch
    for (const doc of sessions.docs.slice(0, 500)) {
      const session = doc.data();
      const decryptedAccess = await this.decrypt(session.encryptedAccessToken);
      const decryptedRefresh = await this.decrypt(session.encryptedRefreshToken);
      
      batch.update(doc.ref, {
        encryptedAccessToken: await this.encryptWithNewKey(decryptedAccess),
        encryptedRefreshToken: await this.encryptWithNewKey(decryptedRefresh),
      });
    }
    
    await batch.commit();
    // Need multiple batches for >500 sessions
  }
}
```

### GDPR/CCPA Compliance

#### PostgreSQL Compliance
```sql
-- Efficient data deletion for GDPR Article 17
DELETE FROM user_sessions 
WHERE user_id = $1;

-- Data retention enforcement
DELETE FROM user_sessions 
WHERE expires_at < NOW() - INTERVAL '90 days';

-- Audit logging
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB
);
```

#### Firestore Compliance
```typescript
// More complex data deletion
async deleteUserData(userId: string): Promise<void> {
  const sessions = await db.collection('sessions')
    .where('userId', '==', userId)
    .get();
  
  const batch = db.batch();
  sessions.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}

// No built-in audit logging
// Must implement custom audit collection
```

**Security/Compliance Winner: PostgreSQL** (better encryption control, audit capabilities, GDPR compliance)

## Final Recommendation: Cloud SQL PostgreSQL

### Decision Matrix

| Criteria | Weight | PostgreSQL Score | Firestore Score | Weighted Score |
|----------|--------|------------------|-----------------|----------------|
| **Security** | 30% | 9/10 | 6/10 | 2.7 vs 1.8 |
| **Compliance** | 25% | 9/10 | 5/10 | 2.25 vs 1.25 |
| **Technical Integration** | 20% | 9/10 | 6/10 | 1.8 vs 1.2 |
| **Operational** | 15% | 8/10 | 6/10 | 1.2 vs 0.9 |
| **Cost** | 10% | 4/10 | 9/10 | 0.4 vs 0.9 |
| **Total** | 100% | **8.35/10** | **6.05/10** | **PostgreSQL Wins** |

### Key Justifications

1. **Security Requirements**: Financial applications require enterprise-grade security
2. **Compliance Needs**: GDPR/CCPA compliance is easier with SQL databases
3. **Technical Maturity**: Prisma + PostgreSQL is a proven, type-safe stack
4. **Operational Control**: Better monitoring, backup, and disaster recovery
5. **Future-Proofing**: Easier to add complex features (analytics, reporting)

### Cost Mitigation Strategy

```typescript
// Start with smaller instance, scale as needed
const dbConfig = {
  development: 'db-f1-micro',    // $7/month
  staging: 'db-g1-small',       // $25/month  
  production: 'db-g1-small',    // $25/month initially
  scale_to: 'db-n1-standard-1', // $50/month when needed
};
```

**The additional $25-35/month cost is justified by the security, compliance, and operational benefits for a financial data application handling OAuth tokens.**
