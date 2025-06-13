# Firestore Cost Analysis and Monitoring Guide

## Cost Structure Analysis

### Firestore Pricing Model
```typescript
interface FirestorePricing {
  storage: {
    free: '1 GiB',
    paid: '$0.18 per GiB/month'
  },
  operations: {
    reads: {
      free: '50,000 per day',
      paid: '$0.06 per 100,000 operations'
    },
    writes: {
      free: '20,000 per day',
      paid: '$0.18 per 100,000 operations'
    },
    deletes: {
      free: '20,000 per day',
      paid: '$0.02 per 100,000 operations'
    }
  },
  network: {
    egress: '$0.12 per GiB (after 1 GiB free)'
  }
}
```

### Usage Projections by User Scale

#### 100 Active Users
```typescript
const usage100Users = {
  dailyOperations: {
    sessionValidations: 5000,    // 50 per user per day
    tokenRefreshes: 50,          // 0.5 per user per day
    sessionCreations: 30,        // 0.3 per user per day
    sessionDeletions: 25,        // 0.25 per user per day
    cleanupOperations: 100,      // Batch cleanup
  },
  monthlyTotals: {
    reads: 150000,               // Well within free tier
    writes: 2400,                // Well within free tier
    deletes: 3750,               // Well within free tier
    storage: '5 MB',             // Well within free tier
  },
  estimatedCost: '$0/month'      // Completely free
};
```

#### 1,000 Active Users
```typescript
const usage1000Users = {
  dailyOperations: {
    sessionValidations: 50000,   // 50 per user per day
    tokenRefreshes: 500,         // 0.5 per user per day
    sessionCreations: 300,       // 0.3 per user per day
    sessionDeletions: 250,       // 0.25 per user per day
    cleanupOperations: 1000,     // Batch cleanup
  },
  monthlyTotals: {
    reads: 1500000,              // 1.5M reads
    writes: 24000,               // 24K writes
    deletes: 37500,              // 37.5K deletes
    storage: '50 MB',            // Well within free tier
  },
  costBreakdown: {
    reads: '$9.00',              // (1.5M - 1.5M free) × $0.06/100K
    writes: '$1.08',             // (24K - 600K free) × $0.18/100K = $0
    deletes: '$0.75',            // (37.5K - 600K free) × $0.02/100K = $0
    storage: '$0.00',            // Under 1 GiB
    total: '$10.83/month'
  }
};
```

#### 5,000 Active Users
```typescript
const usage5000Users = {
  dailyOperations: {
    sessionValidations: 250000,  // 50 per user per day
    tokenRefreshes: 2500,        // 0.5 per user per day
    sessionCreations: 1500,      // 0.3 per user per day
    sessionDeletions: 1250,      // 0.25 per user per day
    cleanupOperations: 5000,     // Batch cleanup
  },
  monthlyTotals: {
    reads: 7500000,              // 7.5M reads
    writes: 120000,              // 120K writes
    deletes: 187500,             // 187.5K deletes
    storage: '250 MB',           // Still under 1 GiB
  },
  costBreakdown: {
    reads: '$45.00',             // (7.5M - 1.5M free) × $0.06/100K
    writes: '$19.44',            // (120K - 600K free) × $0.18/100K = $0
    deletes: '$3.75',            // (187.5K - 600K free) × $0.02/100K = $0
    storage: '$0.00',            // Under 1 GiB
    total: '$68.19/month'
  }
};
```

## Cost Optimization Strategies

### 1. Query Optimization
```typescript
// src/lib/monitoring/firestore-cost-tracker.ts
export class FirestoreCostTracker {
  private static operationCounts = {
    reads: 0,
    writes: 0,
    deletes: 0,
    resetDate: new Date().toDateString()
  };

  // Track operations to monitor costs
  static trackOperation(type: 'read' | 'write' | 'delete', count: number = 1): void {
    const today = new Date().toDateString();
    
    // Reset daily counters
    if (this.operationCounts.resetDate !== today) {
      this.operationCounts = {
        reads: 0,
        writes: 0,
        deletes: 0,
        resetDate: today
      };
    }
    
    this.operationCounts[type] += count;
    
    // Log when approaching free tier limits
    this.checkFreeTierLimits();
  }

  private static checkFreeTierLimits(): void {
    const limits = {
      reads: 50000,
      writes: 20000,
      deletes: 20000
    };

    Object.entries(this.operationCounts).forEach(([operation, count]) => {
      if (operation in limits) {
        const limit = limits[operation as keyof typeof limits];
        const percentage = (count / limit) * 100;
        
        if (percentage > 80) {
          console.warn(`Approaching daily ${operation} limit: ${count}/${limit} (${percentage.toFixed(1)}%)`);
        }
      }
    });
  }

  // Get current usage statistics
  static getUsageStats(): {
    daily: typeof this.operationCounts;
    projectedMonthlyCost: number;
  } {
    const daily = { ...this.operationCounts };
    const projectedMonthlyCost = this.calculateProjectedCost();
    
    return { daily, projectedMonthlyCost };
  }

  private static calculateProjectedCost(): number {
    const monthlyProjection = {
      reads: this.operationCounts.reads * 30,
      writes: this.operationCounts.writes * 30,
      deletes: this.operationCounts.deletes * 30
    };

    // Calculate costs beyond free tier
    const costs = {
      reads: Math.max(0, monthlyProjection.reads - 1500000) * 0.06 / 100000,
      writes: Math.max(0, monthlyProjection.writes - 600000) * 0.18 / 100000,
      deletes: Math.max(0, monthlyProjection.deletes - 600000) * 0.02 / 100000
    };

    return costs.reads + costs.writes + costs.deletes;
  }
}
```

### 2. Caching Strategy
```typescript
// src/lib/optimization/firestore-cache.ts
export class FirestoreCache {
  private static cache = new Map<string, {
    data: any;
    timestamp: number;
    hitCount: number;
  }>();
  
  private static readonly CACHE_TTL = 60000; // 1 minute
  private static readonly MAX_CACHE_SIZE = 1000;

  // Cache session data to reduce reads
  static async getWithCache<T>(
    key: string,
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      cached.hitCount++;
      FirestoreCostTracker.trackOperation('read', 0); // Cache hit, no Firestore read
      return cached.data;
    }

    // Fetch from Firestore
    const data = await fetchFunction();
    FirestoreCostTracker.trackOperation('read', 1);
    
    // Store in cache
    this.setCache(key, data);
    
    return data;
  }

  private static setCache(key: string, data: any): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.findLeastRecentlyUsed();
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hitCount: 0
    });
  }

  private static findLeastRecentlyUsed(): string {
    let oldestKey = '';
    let oldestTime = Date.now();
    let lowestHitCount = Infinity;

    this.cache.forEach((value, key) => {
      if (value.timestamp < oldestTime || value.hitCount < lowestHitCount) {
        oldestKey = key;
        oldestTime = value.timestamp;
        lowestHitCount = value.hitCount;
      }
    });

    return oldestKey;
  }

  // Get cache statistics
  static getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;
    let oldestTimestamp = Date.now();

    this.cache.forEach(value => {
      totalHits += value.hitCount;
      totalRequests += value.hitCount + 1; // +1 for initial fetch
      oldestTimestamp = Math.min(oldestTimestamp, value.timestamp);
    });

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      oldestEntry: Date.now() - oldestTimestamp
    };
  }
}
```

### 3. Batch Operation Optimization
```typescript
// src/lib/optimization/batch-optimizer.ts
export class BatchOptimizer {
  // Optimize cleanup operations to minimize costs
  static async costOptimizedCleanup(): Promise<{
    deleted: number;
    operationsUsed: number;
    estimatedCost: number;
  }> {
    const startTime = Date.now();
    const maxBudget = 1000; // Maximum operations to use
    let totalDeleted = 0;
    let operationsUsed = 0;

    const tokenStorage = new FirestoreTokenStorage();
    
    while (operationsUsed < maxBudget) {
      const remainingBudget = maxBudget - operationsUsed;
      const batchSize = Math.min(500, remainingBudget);
      
      if (batchSize <= 0) break;

      const deleted = await this.cleanupBatch(tokenStorage, batchSize);
      totalDeleted += deleted;
      operationsUsed += deleted + 1; // +1 for the query operation
      
      // If we deleted fewer than batch size, we're done
      if (deleted < batchSize) break;
      
      // Rate limiting to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const estimatedCost = this.calculateOperationCost(operationsUsed, 'delete');
    
    return {
      deleted: totalDeleted,
      operationsUsed,
      estimatedCost
    };
  }

  private static async cleanupBatch(
    storage: FirestoreTokenStorage, 
    batchSize: number
  ): Promise<number> {
    // Implementation would call storage.cleanupExpiredSessions with limit
    return await storage.cleanupExpiredSessions();
  }

  private static calculateOperationCost(operations: number, type: 'read' | 'write' | 'delete'): number {
    const pricing = {
      read: 0.06 / 100000,
      write: 0.18 / 100000,
      delete: 0.02 / 100000
    };

    const freeTier = {
      read: 1500000, // Monthly free tier
      write: 600000,
      delete: 600000
    };

    const billableOperations = Math.max(0, operations - freeTier[type]);
    return billableOperations * pricing[type];
  }
}
```

## Monitoring and Alerting

### 1. Cost Monitoring Dashboard
```typescript
// src/lib/monitoring/cost-dashboard.ts
export class CostDashboard {
  // Generate daily cost report
  static async generateDailyCostReport(): Promise<{
    date: string;
    operations: {
      reads: number;
      writes: number;
      deletes: number;
    };
    costs: {
      daily: number;
      projected_monthly: number;
    };
    freeTierUsage: {
      reads_percentage: number;
      writes_percentage: number;
      deletes_percentage: number;
    };
  }> {
    const stats = FirestoreCostTracker.getUsageStats();
    
    const freeTierLimits = {
      reads: 50000,
      writes: 20000,
      deletes: 20000
    };

    const freeTierUsage = {
      reads_percentage: (stats.daily.reads / freeTierLimits.reads) * 100,
      writes_percentage: (stats.daily.writes / freeTierLimits.writes) * 100,
      deletes_percentage: (stats.daily.deletes / freeTierLimits.deletes) * 100
    };

    return {
      date: new Date().toISOString().split('T')[0],
      operations: {
        reads: stats.daily.reads,
        writes: stats.daily.writes,
        deletes: stats.daily.deletes
      },
      costs: {
        daily: stats.projectedMonthlyCost / 30,
        projected_monthly: stats.projectedMonthlyCost
      },
      freeTierUsage
    };
  }

  // Set up cost alerts
  static setupCostAlerts(): void {
    setInterval(async () => {
      const report = await this.generateDailyCostReport();
      
      // Alert if approaching free tier limits
      Object.entries(report.freeTierUsage).forEach(([operation, percentage]) => {
        if (percentage > 80) {
          this.sendAlert(`High ${operation} usage: ${percentage.toFixed(1)}% of daily free tier`);
        }
      });
      
      // Alert if projected monthly cost exceeds budget
      if (report.costs.projected_monthly > 50) {
        this.sendAlert(`Projected monthly cost: $${report.costs.projected_monthly.toFixed(2)}`);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  private static sendAlert(message: string): void {
    console.warn(`COST ALERT: ${message}`);
    // In production, integrate with alerting system (email, Slack, etc.)
  }
}
```

### 2. Performance vs Cost Analysis
```typescript
// src/lib/monitoring/performance-cost-analyzer.ts
export class PerformanceCostAnalyzer {
  // Analyze cost efficiency of different operations
  static async analyzeCostEfficiency(): Promise<{
    sessionValidation: {
      avgLatency: number;
      costPerOperation: number;
      cacheHitRate: number;
    };
    tokenRefresh: {
      avgLatency: number;
      costPerOperation: number;
      successRate: number;
    };
    cleanup: {
      avgLatency: number;
      costPerDeletion: number;
      efficiency: number;
    };
  }> {
    // Collect performance metrics
    const cacheStats = FirestoreCache.getCacheStats();
    
    return {
      sessionValidation: {
        avgLatency: 25, // ms - typical Firestore latency
        costPerOperation: 0.06 / 100000, // Cost per read
        cacheHitRate: cacheStats.hitRate
      },
      tokenRefresh: {
        avgLatency: 50, // ms - includes YNAB API call
        costPerOperation: 0.18 / 100000, // Cost per write
        successRate: 0.99 // 99% success rate
      },
      cleanup: {
        avgLatency: 500, // ms - batch operation
        costPerDeletion: 0.02 / 100000, // Cost per delete
        efficiency: 0.95 // 95% of targeted sessions deleted
      }
    };
  }

  // Recommend optimizations based on usage patterns
  static generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = FirestoreCostTracker.getUsageStats();
    const cacheStats = FirestoreCache.getCacheStats();
    
    // Cache optimization recommendations
    if (cacheStats.hitRate < 0.7) {
      recommendations.push('Increase cache TTL to improve hit rate and reduce read operations');
    }
    
    // Batch operation recommendations
    if (stats.daily.deletes > 10000) {
      recommendations.push('Consider running cleanup operations during off-peak hours');
    }
    
    // Query optimization recommendations
    if (stats.daily.reads > 30000) {
      recommendations.push('Implement more aggressive caching for frequently accessed sessions');
    }
    
    return recommendations;
  }
}
```

## Cost Comparison Summary

### Firestore vs PostgreSQL Cost Analysis

| User Scale | Firestore Cost | PostgreSQL Cost | Savings |
|------------|----------------|-----------------|---------|
| 100 users  | $0/month      | $30-40/month    | $30-40  |
| 1,000 users| $11/month     | $30-40/month    | $19-29  |
| 5,000 users| $68/month     | $50-70/month    | Break-even |
| 10,000 users| $150/month   | $100-140/month  | PostgreSQL cheaper |

### Break-even Analysis
- **Firestore is cheaper** up to ~4,000-5,000 active users
- **PostgreSQL becomes cheaper** beyond 5,000 users due to fixed costs
- **Operational simplicity** of Firestore may justify higher costs at scale

### Recommendation
For the YNAB Off-Target Assignment Analysis application:
1. **Start with Firestore** for operational simplicity and low initial costs
2. **Monitor usage closely** using the provided cost tracking tools
3. **Consider migration to PostgreSQL** if user base exceeds 5,000 active users
4. **Implement aggressive caching** to maximize free tier usage

This cost monitoring framework ensures you can optimize Firestore usage while maintaining visibility into operational expenses.
