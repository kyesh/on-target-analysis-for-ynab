# API Reference

## Overview

This document describes the REST API endpoints for the YNAB Off-Target Assignment Analysis application. All endpoints provide comprehensive budget target alignment analysis with detailed calculation breakdowns.

## Base URL

```
http://localhost:3000/api
```

## Authentication

The application uses server-side YNAB Personal Access Token authentication. No client-side authentication is required for API endpoints.

## Core Endpoints

### Configuration Status

#### `GET /api/config`

Check application configuration status and YNAB API connectivity.

**Response:**
```json
{
  "valid": true,
  "timestamp": "2025-01-15T00:00:00.000Z"
}
```

**Status Codes:**
- `200`: Configuration valid
- `500`: Configuration error

---

### Budget Management

#### `GET /api/budgets`

Retrieve all available YNAB budgets for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": "budget-uuid",
        "name": "My Budget",
        "lastModified": "2025-01-15T00:00:00.000Z",
        "firstMonth": "2024-01-01",
        "lastMonth": "2025-12-01",
        "currencyFormat": {
          "iso_code": "USD",
          "example_format": "123,456.78",
          "decimal_digits": 2,
          "decimal_separator": ".",
          "symbol_first": true,
          "group_separator": ",",
          "currency_symbol": "$",
          "display_symbol": true
        }
      }
    ]
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Invalid YNAB token
- `500`: Server error

---

### Monthly Analysis

#### `GET /api/analysis/monthly`

Generate comprehensive monthly budget analysis with target alignment calculations.

**Query Parameters:**
- `budgetId` (required): YNAB budget UUID
- `month` (required): Analysis month in YYYY-MM-DD format

**Example Request:**
```
GET /api/analysis/monthly?budgetId=budget-uuid&month=2024-12-01
```

**Response:**
```json
{
  "success": true,
  "data": {
    "selectedMonth": "2024-12-01",
    "monthlyAnalysis": {
      "month": "2024-12-01",
      "budgetId": "budget-uuid",
      "budgetName": "My Budget",
      "totalIncome": 500000,
      "totalActivity": -350000,
      "totalAssigned": 450000,
      "totalTargeted": 400000,
      "onTargetAmount": 300000,
      "overTargetAmount": 100000,
      "noTargetAmount": 50000,
      "underTargetAmount": 0,
      "onTargetPercentage": 66.67,
      "overTargetPercentage": 22.22,
      "noTargetPercentage": 11.11,
      "underTargetPercentage": 0,
      "categoriesAnalyzed": 25,
      "categoriesWithTargets": 20,
      "categoriesOverTarget": 3,
      "categoriesUnderTarget": 0,
      "categoriesWithoutTargets": 5,
      "lastUpdated": "2025-01-15T00:00:00.000Z"
    },
    "topOverTargetCategories": [
      {
        "categoryId": "category-uuid",
        "categoryName": "Groceries",
        "categoryGroupName": "Immediate Obligations",
        "assigned": 45000,
        "target": 40000,
        "variance": 5000,
        "variancePercentage": 12.5,
        "targetType": "NEED",
        "month": "2024-12-01"
      }
    ],
    "topUnderTargetCategories": [],
    "categoriesWithoutTargets": [
      {
        "id": "category-uuid",
        "name": "Miscellaneous",
        "categoryGroupName": "Just for Fun",
        "assigned": 10000,
        "neededThisMonth": 0,
        "variance": 10000,
        "hasTarget": false,
        "alignmentStatus": "no-target"
      }
    ],
    "categories": [
      {
        "id": "category-uuid",
        "name": "Groceries",
        "categoryGroupName": "Immediate Obligations",
        "assigned": 45000,
        "neededThisMonth": 40000,
        "variance": 5000,
        "percentageOfTarget": 112.5,
        "hasTarget": true,
        "alignmentStatus": "over-target",
        "debugInfo": {
          "rawFields": {
            "goal_type": "NEED",
            "goal_target": 40000,
            "goal_creation_month": "2024-01-01",
            "goal_cadence": 1,
            "goal_cadence_frequency": 1,
            "goal_day": null,
            "goal_months_to_budget": null,
            "goal_overall_left": null,
            "budgeted": 45000,
            "balance": 15000,
            "activity": -30000
          },
          "calculationRule": "Rule 1: Monthly NEED",
          "calculationDetails": {
            "calculation": "goal_target = 40000",
            "goal_cadence": 1,
            "goal_cadence_frequency": 1
          }
        }
      }
    ],
    "keyMetrics": {
      "targetAlignmentScore": 85.5,
      "budgetDisciplineRating": "excellent",
      "totalVariance": 15000,
      "averageTargetAchievement": 95.2
    }
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing or invalid parameters
- `404`: Budget or month not found
- `500`: Server error

---

### Debug Endpoints

#### `GET /api/debug/ynab-raw`

Retrieve raw YNAB API data for debugging purposes.

**Query Parameters:**
- `budgetId` (required): YNAB budget UUID
- `month` (required): Month in YYYY-MM-DD format

**Response:**
```json
{
  "success": true,
  "data": {
    "month": {
      "month": "2024-12-01",
      "income": 500000,
      "budgeted": 450000,
      "activity": -350000,
      "to_be_budgeted": 50000,
      "categories": [
        {
          "id": "category-uuid",
          "name": "Groceries",
          "budgeted": 45000,
          "activity": -30000,
          "balance": 15000,
          "goal_type": "NEED",
          "goal_target": 40000,
          "goal_creation_month": "2024-01-01",
          "goal_cadence": 1,
          "goal_cadence_frequency": 1
        }
      ]
    }
  }
}
```

## Data Types

### Currency Values

All currency values are returned in **milliunits** (1/1000 of the currency unit):
- `$45.67` = `45670` milliunits
- To convert to dollars: `milliunits / 1000`

### Date Formats

- **Month parameters**: `YYYY-MM-DD` format (e.g., `2024-12-01`)
- **Timestamps**: ISO 8601 format (e.g., `2025-01-15T00:00:00.000Z`)

### Alignment Status

Categories are classified into alignment statuses:
- `"on-target"`: Within tolerance of target amount
- `"over-target"`: Assigned more than target
- `"under-target"`: Assigned less than target
- `"no-target"`: No target set for category

### Budget Discipline Ratings

- `"excellent"`: 90-100% target alignment
- `"good"`: 75-89% target alignment
- `"fair"`: 60-74% target alignment
- `"poor"`: Below 60% target alignment

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid parameters or request format
- `401 Unauthorized`: Invalid or missing YNAB access token
- `404 Not Found`: Budget or month not found
- `429 Too Many Requests`: YNAB API rate limit exceeded
- `500 Internal Server Error`: Server-side error

### Rate Limiting

The application respects YNAB API rate limits:
- **Limit**: 200 requests per hour
- **Caching**: 5-minute cache for API responses
- **Headers**: Rate limit information included in responses

## Usage Examples

### Basic Monthly Analysis

```javascript
const response = await fetch('/api/analysis/monthly?budgetId=budget-uuid&month=2024-12-01');
const data = await response.json();

if (data.success) {
  console.log('Total assigned:', data.data.monthlyAnalysis.totalAssigned / 1000);
  console.log('Target alignment score:', data.data.keyMetrics.targetAlignmentScore);
}
```

### Debug Information Access

```javascript
const categories = data.data.categories;
categories.forEach(category => {
  if (category.debugInfo) {
    console.log(`${category.name}: ${category.debugInfo.calculationRule}`);
    console.log('Raw fields:', category.debugInfo.rawFields);
  }
});
```

This API provides comprehensive access to YNAB budget analysis with detailed calculation breakdowns and debug information for validation and troubleshooting.
