# 🧪 API Testing Guide - Owner Dashboard Analytics

This guide provides comprehensive instructions for testing all Owner Dashboard analytics API endpoints.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Available Endpoints](#available-endpoints)
4. [Testing Methods](#testing-methods)
5. [Automated Tests](#automated-tests)
6. [Manual Testing](#manual-testing)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Setup

- ✅ Database is running and migrated
- ✅ Environment variables are configured
- ✅ At least one user with OWNER or ADMIN role exists
- ✅ At least one active outlet exists
- ✅ Some sales data exists (for meaningful results)

### Install Dependencies

```bash
pnpm install
```

### Database Setup

```bash
# Run migrations
pnpm prisma migrate dev

# Seed database (optional, for test data)
pnpm prisma db seed
```

---

## Quick Start

### Run All Tests

```bash
# Run automated test suite
pnpm test tests/api/analytics.test.ts

# Run manual testing script
pnpm tsx scripts/test-analytics-api.ts
```

### Quick Health Check

```bash
# Verify all endpoints are accessible
pnpm tsx scripts/test-analytics-api.ts
```

---

## Available Endpoints

All analytics endpoints are under the `analytics` router:

| Endpoint | Purpose | Key Features |
|----------|---------|--------------|
| `getKpiSummary` | KPI metrics with trends | Sales, transactions, items, profit |
| `getSalesTrend` | Time-series sales data | Hourly, daily, weekly, monthly |
| `getCategoryBreakdown` | Sales by category | Percentages, transactions |
| `getOutletPerformance` | Multi-outlet comparison | Trends, rankings |
| `getLowStockAlerts` | Inventory warnings | Critical, low, warning levels |
| `getShiftActivity` | Cash session monitoring | Active/closed shifts |
| `getActivityLog` | System activity audit | Paginated, filterable |

---

## Testing Methods

### Method 1: Automated Tests (Recommended)

**Best for:** CI/CD pipelines, regression testing, development

```bash
# Run all analytics tests
pnpm test tests/api/analytics.test.ts

# Run with coverage
pnpm test:coverage tests/api/analytics.test.ts

# Run specific test suite
pnpm test tests/api/analytics.test.ts -t "getKpiSummary"

# Watch mode for development
pnpm test:watch tests/api/analytics.test.ts
```

### Method 2: Manual Testing Script

**Best for:** Quick verification, debugging, data exploration

```bash
# Run full test suite
pnpm tsx scripts/test-analytics-api.ts

# The script will:
# - Find existing user and outlet data
# - Test all endpoints with various parameters
# - Display formatted results
# - Report any errors
```

### Method 3: HTTP Client (Postman/Thunder Client)

**Best for:** API documentation, client integration testing

See [HTTP Client Testing](#http-client-testing) section below.

---

## Automated Tests

### Test Structure

```typescript
tests/api/analytics.test.ts
├── Setup & Teardown
│   ├── Create test user (OWNER role)
│   ├── Create test outlet
│   ├── Create test products
│   ├── Create test sales (7 days)
│   └── Cleanup after tests
├── KPI Summary Tests
│   ├── All outlets with comparison
│   ├── Single outlet
│   └── Zero results handling
├── Sales Trend Tests
│   ├── Different granularities
│   └── Outlet filtering
├── Category Breakdown Tests
├── Outlet Performance Tests
├── Low Stock Alerts Tests
├── Shift Activity Tests
├── Activity Log Tests
├── Error Handling Tests
└── Performance Tests
```

### Running Tests

```bash
# All analytics tests
pnpm test tests/api/analytics.test.ts

# Specific test suite
pnpm test tests/api/analytics.test.ts -t "getKpiSummary"

# With verbose output
pnpm test tests/api/analytics.test.ts --reporter=verbose

# With coverage
pnpm test:coverage tests/api/analytics.test.ts
```

### Expected Results

```
✓ getKpiSummary
  ✓ should return KPI summary for all outlets (XXms)
  ✓ should filter by outlet (XXms)
  ✓ should return zero values for empty date range (XXms)

✓ getSalesTrend
  ✓ should return daily sales trend (XXms)
  ✓ should filter by outlet (XXms)
  ✓ should support different granularities (XXms)

... (more tests)

Test Files  1 passed (1)
     Tests  XX passed (XX)
  Start at  HH:MM:SS
  Duration  XXXms
```

---

## Manual Testing

### Using the Test Script

The manual testing script (`scripts/test-analytics-api.ts`) provides interactive testing:

```bash
pnpm tsx scripts/test-analytics-api.ts
```

#### Output Example

```
🚀 Analytics API Testing Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══════════════════════════════════════════════════════════════════════════════
  Step 1: Setup Test Environment
═══════════════════════════════════════════════════════════════════════════════
✅ Found user: John Doe (OWNER)
✅ Found outlet: Main Store
ℹ️  Test Date Range: 2024-01-01T00:00:00.000Z to 2024-01-08T23:59:59.999Z

═══════════════════════════════════════════════════════════════════════════════
  Step 2: Test KPI Summary
═══════════════════════════════════════════════════════════════════════════════
ℹ️  Testing KPI Summary endpoint...

📊 Test 1: All outlets with comparison
✅ Response received
{
  "totalSales": 28500000,
  "totalTransactions": 156,
  "itemsSold": 423,
  "profit": 7125000,
  "avgTransaction": 182692.31,
  "topCategory": "Electronics"
}
   Trend: up 12.5%

... (more test results)

═══════════════════════════════════════════════════════════════════════════════
  Test Summary
═══════════════════════════════════════════════════════════════════════════════
✅ All analytics endpoints tested successfully! 🎉
ℹ️  Check the output above for detailed results

✨ All tests completed!
```

---

## API Reference

### 1. Get KPI Summary

**Endpoint:** `analytics.getKpiSummary`

**Purpose:** Get key performance indicators with trend comparison

**Input:**
```typescript
{
  outletId?: string;              // Optional: filter by outlet
  dateRange: {
    from: Date;                   // Start date
    to: Date;                     // End date
  };
  compareWithPrevious?: boolean;  // Default: true
}
```

**Output:**
```typescript
{
  totalSales: {
    current: number;
    previous?: number;
    trend?: { value: number; direction: "up" | "down" | "neutral" };
  };
  totalTransactions: { /* same structure */ };
  itemsSold: { /* same structure */ };
  profit: { /* same structure */ };
  averageTransactionValue: { /* same structure */ };
  topSellingCategory?: string;
}
```

**Example Test:**
```typescript
const result = await caller.analytics.getKpiSummary({
  outletId: "outlet-123",
  dateRange: {
    from: new Date("2024-01-01"),
    to: new Date("2024-01-31"),
  },
  compareWithPrevious: true,
});
```

**Expected Response:**
```json
{
  "totalSales": {
    "current": 28500000,
    "previous": 25400000,
    "trend": {
      "value": 12.2,
      "direction": "up"
    }
  },
  "totalTransactions": {
    "current": 156,
    "previous": 142,
    "trend": {
      "value": 9.9,
      "direction": "up"
    }
  }
}
```

---

### 2. Get Sales Trend

**Endpoint:** `analytics.getSalesTrend`

**Purpose:** Get time-series sales data for charting

**Input:**
```typescript
{
  outletId?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  granularity?: "hour" | "day" | "week" | "month";  // Default: "day"
}
```

**Output:**
```typescript
Array<{
  timestamp: string;      // ISO date string
  sales: number;          // Total sales
  transactions: number;   // Number of transactions
  items: number;          // Items sold
}>
```

**Example Test:**
```typescript
const result = await caller.analytics.getSalesTrend({
  dateRange: {
    from: new Date("2024-01-01"),
    to: new Date("2024-01-07"),
  },
  granularity: "day",
});
```

**Expected Response:**
```json
[
  {
    "timestamp": "2024-01-01",
    "sales": 4250000,
    "transactions": 23,
    "items": 67
  },
  {
    "timestamp": "2024-01-02",
    "sales": 3890000,
    "transactions": 19,
    "items": 54
  }
]
```

---

### 3. Get Category Breakdown

**Endpoint:** `analytics.getCategoryBreakdown`

**Purpose:** Get sales breakdown by product category

**Input:**
```typescript
{
  outletId?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}
```

**Output:**
```typescript
Array<{
  category: string;
  sales: number;
  transactions: number;
  items: number;
  percentage: number;   // Percentage of total sales
}>
```

**Example Test:**
```typescript
const result = await caller.analytics.getCategoryBreakdown({
  dateRange: {
    from: new Date("2024-01-01"),
    to: new Date("2024-01-31"),
  },
});
```

**Expected Response:**
```json
[
  {
    "category": "Electronics",
    "sales": 12500000,
    "transactions": 89,
    "items": 156,
    "percentage": 43.9
  },
  {
    "category": "Accessories",
    "sales": 8300000,
    "transactions": 112,
    "items": 234,
    "percentage": 29.1
  }
]
```

---

### 4. Get Outlet Performance

**Endpoint:** `analytics.getOutletPerformance`

**Purpose:** Compare performance across all outlets

**Input:**
```typescript
{
  dateRange: {
    from: Date;
    to: Date;
  };
}
```

**Output:**
```typescript
Array<{
  outletId: string;
  outletName: string;
  sales: number;
  transactions: number;
  items: number;
  profit: number;
  averageTransactionValue: number;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
}>
```

**Example Test:**
```typescript
const result = await caller.analytics.getOutletPerformance({
  dateRange: {
    from: new Date("2024-01-01"),
    to: new Date("2024-01-31"),
  },
});
```

---

### 5. Get Low Stock Alerts

**Endpoint:** `analytics.getLowStockAlerts`

**Purpose:** Get products with low inventory levels

**Input:**
```typescript
{
  outletId?: string;
  threshold?: number;   // Default: 10
  limit?: number;       // Default: 10
}
```

**Output:**
```typescript
Array<{
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  outletId: string;
  outletName: string;
  currentStock: number;
  reorderPoint?: number;
  daysUntilStockout?: number;
  status: "critical" | "low" | "warning";
}>
```

**Example Test:**
```typescript
const result = await caller.analytics.getLowStockAlerts({
  outletId: "outlet-123",
  threshold: 20,
  limit: 5,
});
```

---

### 6. Get Shift Activity

**Endpoint:** `analytics.getShiftActivity`

**Purpose:** Monitor active and recent cash sessions

**Input:**
```typescript
{
  outletId?: string;
  date?: Date;   // Default: today
}
```

**Output:**
```typescript
Array<{
  sessionId: string;
  outletId: string;
  outletName: string;
  cashierName: string;
  openTime: string;
  closeTime?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  difference?: number;
  totalSales: number;
  totalTransactions: number;
  status: "active" | "closed";
}>
```

---

### 7. Get Activity Log

**Endpoint:** `analytics.getActivityLog`

**Purpose:** Retrieve system activity audit log

**Input:**
```typescript
{
  outletId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;   // Default: 20
  offset?: number;  // Default: 0
}
```

**Output:**
```typescript
{
  activities: Array<{
    id: string;
    timestamp: string;
    type: string;
    user: string;
    outlet: string;
    description: string;
    metadata?: Record<string, any>;
  }>;
  total: number;
  hasMore: boolean;
}
```

---

## HTTP Client Testing

### Setup for Postman/Thunder Client

1. **Base URL:** `http://localhost:3000/api/trpc`

2. **Authentication:** Include session cookie or auth token

3. **Headers:**
   ```
   Content-Type: application/json
   Cookie: next-auth.session-token=<your-session-token>
   ```

### Example Requests

#### KPI Summary

**Request:**
```http
GET /api/trpc/analytics.getKpiSummary?input={"dateRange":{"from":"2024-01-01T00:00:00.000Z","to":"2024-01-31T23:59:59.999Z"},"compareWithPrevious":true}
```

**cURL:**
```bash
curl -X GET 'http://localhost:3000/api/trpc/analytics.getKpiSummary' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN' \
  -G --data-urlencode 'input={"dateRange":{"from":"2024-01-01T00:00:00.000Z","to":"2024-01-31T23:59:59.999Z"},"compareWithPrevious":true}'
```

#### Sales Trend

**Request:**
```http
GET /api/trpc/analytics.getSalesTrend?input={"dateRange":{"from":"2024-01-01T00:00:00.000Z","to":"2024-01-07T23:59:59.999Z"},"granularity":"day"}
```

---

## Troubleshooting

### Common Issues

#### 1. No Data Returned

**Problem:** All endpoints return zero/empty results

**Solutions:**
- Check if sales data exists in database
- Verify date range is correct
- Ensure outlet is active
- Run: `pnpm prisma db seed` to generate test data

#### 2. Authentication Errors

**Problem:** "UNAUTHORIZED" error

**Solutions:**
- Verify session is valid
- Check user has OWNER or ADMIN role
- Re-login to get new session token

#### 3. Database Connection Errors

**Problem:** "Can't reach database server"

**Solutions:**
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Run: `docker-compose up -d` (if using Docker)

#### 4. Test Failures

**Problem:** Tests fail with timeout or errors

**Solutions:**
```bash
# Reset database
pnpm prisma migrate reset

# Re-run migrations
pnpm prisma migrate dev

# Seed test data
pnpm prisma db seed

# Run tests again
pnpm test tests/api/analytics.test.ts
```

#### 5. Performance Issues

**Problem:** Queries are slow

**Solutions:**
- Check database indexes exist
- Reduce date range for testing
- Verify database has enough data but not too much
- Check query plans with `EXPLAIN ANALYZE`

### Debugging Tips

1. **Enable Debug Logging:**
   ```typescript
   // Add to test file
   process.env.DEBUG = "trpc:*";
   ```

2. **Check Query Performance:**
   ```typescript
   const startTime = Date.now();
   await caller.analytics.getKpiSummary(...);
   console.log(`Query took ${Date.now() - startTime}ms`);
   ```

3. **Inspect Database State:**
   ```bash
   pnpm prisma studio
   ```

4. **Run Single Test:**
   ```bash
   pnpm test tests/api/analytics.test.ts -t "should return KPI summary"
   ```

---

## Performance Benchmarks

### Expected Response Times

| Endpoint | Typical | Acceptable | Action Required |
|----------|---------|------------|-----------------|
| getKpiSummary | < 500ms | < 2s | > 5s |
| getSalesTrend | < 300ms | < 1s | > 3s |
| getCategoryBreakdown | < 400ms | < 1.5s | > 4s |
| getOutletPerformance | < 800ms | < 3s | > 8s |
| getLowStockAlerts | < 200ms | < 500ms | > 2s |
| getShiftActivity | < 150ms | < 500ms | > 1s |
| getActivityLog | < 200ms | < 500ms | > 1s |

### Performance Testing

```bash
# Run performance tests
pnpm test tests/api/analytics.test.ts -t "Performance"

# Benchmark all endpoints
pnpm tsx scripts/benchmark-analytics.ts  # TODO: Create this script
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm prisma migrate deploy
      - run: pnpm prisma db seed
      - run: pnpm test tests/api/analytics.test.ts
```

---

## Best Practices

### Writing Tests

1. ✅ **Test real scenarios:** Use realistic date ranges and data
2. ✅ **Test edge cases:** Empty results, invalid inputs, boundary conditions
3. ✅ **Isolate tests:** Each test should be independent
4. ✅ **Clean up:** Always clean up test data after tests
5. ✅ **Use fixtures:** Share common test data setup

### Manual Testing

1. ✅ **Verify with real data:** Test with production-like data volumes
2. ✅ **Check all filters:** Test each parameter combination
3. ✅ **Validate output:** Verify calculations are correct
4. ✅ **Test performance:** Measure response times under load
5. ✅ **Document results:** Keep a log of test results

### API Development

1. ✅ **Write tests first:** TDD approach for new endpoints
2. ✅ **Add input validation:** Validate all inputs with Zod schemas
3. ✅ **Handle errors gracefully:** Return meaningful error messages
4. ✅ **Optimize queries:** Use database indexes and efficient queries
5. ✅ **Document changes:** Update this guide when adding endpoints

---

## Additional Resources

- [TRPC Documentation](https://trpc.io)
- [Vitest Documentation](https://vitest.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Owner Dashboard Integration Guide](./OWNER_DASHBOARD_INTEGRATION.md)

---

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review test output for specific errors
3. Check database state with Prisma Studio
4. Contact the backend team for API issues

---

**Last Updated:** 2024
**Version:** 1.0.0
**Maintained by:** Toko POS Development Team