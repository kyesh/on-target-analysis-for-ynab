# YNAB Off-Target Assignment Analysis - API Documentation

**Version:** 1.0  
**Last Updated:** June 2025  
**Status:** Production Ready

## Overview

This document describes the REST API endpoints for the YNAB Off-Target Assignment Analysis application. All endpoints are designed to work with YNAB API data and provide comprehensive budget target alignment analysis.

## Base URL

```
http://localhost:3000/api
```

## Authentication

The application uses server-side YNAB Personal Access Token authentication. No client-side authentication is required for API endpoints.

## Core Endpoints

### 1. Configuration Status

#### `GET /api/config`

Check application configuration status.

**Response:**
```json
{
  "valid": true,
  "timestamp": "2025-06-11T00:00:00.000Z"
}
```

**Error Response:**
```json
{
  "valid": false,
  "error": "Configuration validation failed",
  "missingVars": ["YNAB_ACCESS_TOKEN"],
  "timestamp": "2025-06-11T00:00:00.000Z"
}
```

### 2. YNAB Connection Test

#### `GET /api/ynab/test-connection`

Test YNAB API connectivity and rate limit status.

**Response:**
```json
{
  "connected": true,
  "rateLimit": {
    "limit": 200,
    "remaining": 198,
    "resetTime": "2025-06-11T01:00:00.000Z"
  },
  "timestamp": "2025-06-11T00:00:00.000Z"
}
```

### 3. Budget Management

#### `GET /api/budgets`

Retrieve all available YNAB budgets with date ranges.

**Response:**
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": "b627e926-57f9-431e-aa30-d824a8a3fdb9",
        "name": "Team MK",
        "lastModified": "2025-06-10T23:09:21Z",
        "firstMonth": "2024-04-01",
        "lastMonth": "2025-06-01",
        "currencyFormat": {
          "iso_code": "USD",
          "currency_symbol": "$",
          "decimal_digits": 2
        }
      }
    ],
    "count": 12
  },
  "metadata": {
    "generatedAt": "2025-06-11T00:00:00.000Z",
    "cacheStats": {
      "size": 1,
      "keys": ["budgets"]
    }
  }
}
```

### 4. Monthly Analysis

#### `GET /api/analysis/monthly`

Perform comprehensive monthly budget target alignment analysis.

**Query Parameters:**
- `budgetId` (optional): YNAB budget ID. Uses default budget if not provided.
- `month` (optional): Month in YYYY-MM-DD format. Uses safe default if not provided.

**Example Request:**
```
GET /api/analysis/monthly?budgetId=b627e926-57f9-431e-aa30-d824a8a3fdb9&month=2024-12-01
```

**Response:**
```json
{
  "success": true,
  "data": {
    "selectedMonth": "2024-12-01",
    "monthlyAnalysis": {
      "month": "2024-12-01",
      "budgetId": "b627e926-57f9-431e-aa30-d824a8a3fdb9",
      "budgetName": "Team MK",
      "totalAssigned": 13066950,
      "totalTargeted": 19009120,
      "onTargetAmount": 2506320,
      "overTargetAmount": 2126820,
      "noTargetAmount": 6048690,
      "underTargetAmount": 14116320,
      "onTargetPercentage": 19.18,
      "overTargetPercentage": 16.28,
      "noTargetPercentage": 46.29,
      "underTargetPercentage": 108.03,
      "categoriesAnalyzed": 116,
      "categoriesWithTargets": 30,
      "categoriesOverTarget": 6,
      "categoriesUnderTarget": 19,
      "categoriesWithoutTargets": 86,
      "lastUpdated": "2025-06-11T00:00:00.000Z"
    },
    "topOverTargetCategories": [
      {
        "categoryId": "4a15ece2-bc9e-4bf1-8903-0e36cf2217b5",
        "categoryName": "Au Pair Stipend",
        "categoryGroupName": "Vernon Expenses - Tier 1",
        "assigned": 1075000,
        "target": 215000,
        "variance": 860000,
        "variancePercentage": 400,
        "targetType": "NEED",
        "month": "2024-12-01"
      }
    ],
    "topUnderTargetCategories": [
      {
        "categoryId": "9b50c461-8bef-493b-a7d6-a1b07e6e015c",
        "categoryName": "25 - Camp Michigania",
        "categoryGroupName": "Vacation - Tier 1.5",
        "assigned": 0,
        "target": 5240000,
        "variance": -5240000,
        "variancePercentage": -100,
        "targetType": "NEED",
        "month": "2024-12-01"
      }
    ],
    "categoriesWithoutTargets": [
      {
        "id": "d4eebf14-78f7-4eed-85ce-846af3607719",
        "name": "Marie transfer out",
        "categoryGroupName": "Ect",
        "assigned": 2108000,
        "target": null,
        "targetType": null,
        "variance": 0,
        "alignmentStatus": "no-target",
        "percentageOfTarget": null,
        "isHidden": false,
        "hasTarget": false
      }
    ],
    "keyMetrics": {
      "targetAlignmentScore": 0,
      "budgetDisciplineRating": "Needs Improvement",
      "totalVariance": 15709900,
      "averageTargetAchievement": 24.37
    }
  },
  "metadata": {
    "budgetId": "b627e926-57f9-431e-aa30-d824a8a3fdb9",
    "budgetName": "Team MK",
    "month": "2024-12-01",
    "budgetRange": {
      "firstMonth": "2024-04-01",
      "lastMonth": "2025-06-01"
    },
    "generatedAt": "2025-06-11T00:00:00.000Z",
    "cacheStats": {
      "size": 3,
      "keys": ["budgets", "month:b627e926-57f9-431e-aa30-d824a8a3fdb9:2024-12-01"]
    }
  }
}
```

**Error Response (Invalid Month):**
```json
{
  "success": false,
  "error": {
    "type": "invalid_month",
    "message": "Month 2025-06-01 is after budget end date 2024-06-01",
    "statusCode": 400,
    "availableRange": {
      "firstMonth": "2024-01-01",
      "lastMonth": "2024-06-01"
    }
  }
}
```

#### `POST /api/analysis/monthly`

Perform analysis with custom configuration.

**Request Body:**
```json
{
  "budgetId": "b627e926-57f9-431e-aa30-d824a8a3fdb9",
  "month": "2024-12-01",
  "config": {
    "toleranceMilliunits": 1000,
    "includeHiddenCategories": false,
    "includeDeletedCategories": false,
    "minimumAssignmentThreshold": 0
  }
}
```

**Response:** Same format as GET endpoint.

## Month Validation System

The API implements comprehensive month validation to prevent invalid YNAB API calls:

### Validation Rules

1. **Format Validation**: Month must be in `YYYY-MM-DD` format (first day of month)
2. **Budget Range Validation**: Month must be within budget's `firstMonth` and `lastMonth` range
3. **Date Parsing**: Uses UTC timezone handling to prevent timezone-related issues

### Default Month Selection Logic

When no month is provided, the API selects a safe default:

1. **Current Month**: If current month is within budget range
2. **Budget Last Month**: If current month is after budget range  
3. **Budget First Month**: If current month is before budget range

### Error Handling

- **400 Bad Request**: Invalid month format or out of range
- **404 Not Found**: Budget not found
- **500 Internal Server Error**: YNAB API errors or processing failures

## Rate Limiting

- **YNAB API Limit**: 200 requests per hour per access token
- **Caching**: 5-10 minute TTL to minimize API calls
- **Rate Limit Headers**: Included in connection test response

## Data Format

### Currency Values

All monetary values are in **milliunits** (YNAB format):
- 1000 milliunits = $1.00
- Negative values indicate overspending or debt

### Target Calculation Method

The API uses an enhanced target extraction method for more accurate monthly analysis:

**Monthly Target Calculation** (VERIFIED with YNAB API Documentation):
- **MF (Monthly Funding)**: Uses `goal_target` (represents monthly funding amount)
- **TB/TBD (Target Balance)**: Uses `goal_under_funded` (**VERIFIED** as "Needed This Month") when available
- **NEED (Plan Your Spending)**: Uses `goal_target` (represents monthly spending target)
- **DEBT (Debt Payoff)**: Uses `goal_under_funded` (**VERIFIED** as "Needed This Month") when available

**Fallback Logic**: If `goal_under_funded` is null/undefined, falls back to `goal_target`

**Field Verification**: `goal_under_funded` officially defined as "The amount of funding still needed in the current month to stay on track towards completing the goal within the current goal period" (Microsoft YNAB API Documentation)

### Date Format

All dates use **YYYY-MM-DD** format in UTC timezone.

### Category Alignment Status

- `on-target`: Assigned amount matches target (within tolerance)
- `over-target`: Assigned amount exceeds target
- `under-target`: Assigned amount is less than target  
- `no-target`: Category has assignment but no target set

## Caching Strategy

- **Budget Data**: 10 minutes (budgets change infrequently)
- **Month Data**: 5 minutes (can change during active budgeting)
- **Cache Keys**: Structured as `type:budgetId:month` for efficient invalidation

## Debug Endpoints

### `POST /api/debug/clear-cache` (Development Only)

Clear all cached data for debugging purposes.

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "timestamp": "2025-06-11T00:00:00.000Z"
}
```

**Note:** Only available in development environment.
