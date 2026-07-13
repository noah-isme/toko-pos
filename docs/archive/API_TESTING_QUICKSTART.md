# 🚀 API Testing Quick Start Guide

## TL;DR

```bash
# Run automated tests
pnpm test tests/api/analytics.test.ts

# Run manual testing script
pnpm tsx scripts/test-analytics-api.ts
```

---

## Prerequisites (2 minutes)

1. **Database Running:**
   ```bash
   # If using Docker
   docker-compose up -d
   
   # Or check if PostgreSQL is running
   psql -h localhost -U postgres -c "SELECT 1"
   ```

2. **Migrations Applied:**
   ```bash
   pnpm prisma migrate dev
   ```

3. **Test Data (Optional):**
   ```bash
   pnpm prisma db seed
   ```

---

## Method 1: Automated Tests (Recommended)

### Run All Tests
```bash
pnpm test tests/api/analytics.test.ts
```

### Expected Output:
```
✓ getKpiSummary
  ✓ should return KPI summary for all outlets (234ms)
  ✓ should filter by outlet (156ms)
  ✓ should return zero values for date range with no sales (89ms)

✓ getSalesTrend
  ✓ should return daily sales trend (198ms)
  ✓ should filter by outlet (145ms)
  ✓ should support different granularities (423ms)

✓ getCategoryBreakdown
  ✓ should return sales by category (167ms)
  ✓ should filter by outlet (134ms)

✓ getOutletPerformance
  ✓ should return performance for all outlets (289ms)

✓ getLowStockAlerts
  ✓ should return low stock items (98ms)
  ✓ should filter by outlet (87ms)
  ✓ should respect limit parameter (76ms)

✓ getShiftActivity
  ✓ should return shift activity for today (123ms)
  ✓ should filter by outlet (112ms)

✓ getActivityLog
  ✓ should return activity log with pagination (145ms)
  ✓ should filter by outlet (134ms)
  ✓ should filter by date range (129ms)
  ✓ should paginate correctly (187ms)

✓ Error Handling
  ✓ should handle invalid date ranges (67ms)
  ✓ should handle non-existent outlet (54ms)

✓ Performance
  ✓ should execute KPI query within acceptable time (456ms)
  ✓ should execute all queries concurrently (789ms)

Test Files  1 passed (1)
     Tests  22 passed (22)
  Start at  14:32:15
  Duration  4.23s
```

### Run Specific Tests
```bash
# Test only KPI endpoint
pnpm test tests/api/analytics.test.ts -t "getKpiSummary"

# Test with coverage
pnpm test:coverage tests/api/analytics.test.ts

# Watch mode for development
pnpm test:watch tests/api/analytics.test.ts
```

---

## Method 2: Manual Testing Script

### Run Interactive Tests
```bash
pnpm tsx scripts/test-analytics-api.ts
```

### Expected Output:
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

... (more detailed results for all 7 endpoints)

═══════════════════════════════════════════════════════════════════════════════
  Test Summary
═══════════════════════════════════════════════════════════════════════════════
✅ All analytics endpoints tested successfully! 🎉
ℹ️  Check the output above for detailed results

✨ All tests completed!
```

---

## Method 3: HTTP Client (Postman/Thunder Client)

### Setup

1. **Start Development Server:**
   ```bash
   pnpm dev
   ```

2. **Get Session Token:**
   - Login at: `http://localhost:3000/login`
   - Open DevTools → Application → Cookies
   - Copy `next-auth.session-token` value

3. **Test Endpoint:**
   ```http
   GET http://localhost:3000/api/trpc/analytics.getKpiSummary?input={"dateRange":{"from":"2024-01-01T00:00:00.000Z","to":"2024-01-31T23:59:59.999Z"},"compareWithPrevious":true}
   Cookie: next-auth.session-token=YOUR_TOKEN_HERE
   ```

---

## Available Endpoints

| Endpoint | Purpose | Test Command |
|----------|---------|--------------|
| `getKpiSummary` | KPI metrics with trends | `-t "getKpiSummary"` |
| `getSalesTrend` | Time-series sales data | `-t "getSalesTrend"` |
| `getCategoryBreakdown` | Sales by category | `-t "getCategoryBreakdown"` |
| `getOutletPerformance` | Multi-outlet comparison | `-t "getOutletPerformance"` |
| `getLowStockAlerts` | Inventory warnings | `-t "getLowStockAlerts"` |
| `getShiftActivity` | Cash session monitoring | `-t "getShiftActivity"` |
| `getActivityLog` | System activity audit | `-t "getActivityLog"` |

---

## Troubleshooting

### ❌ "No data returned"
```bash
# Check if sales exist
pnpm prisma studio
# Navigate to Sale table

# Or seed test data
pnpm prisma db seed
```

### ❌ "UNAUTHORIZED"
```bash
# Check user exists with OWNER/ADMIN role
pnpm prisma studio
# Navigate to User table

# Or create test user
pnpm tsx scripts/create-test-user.ts
```

### ❌ "Database connection failed"
```bash
# Check .env file
cat .env | grep DATABASE_URL

# Test connection
pnpm prisma db pull
```

### ❌ "Tests failing"
```bash
# Reset and re-run
pnpm prisma migrate reset
pnpm test tests/api/analytics.test.ts
```

---

## Quick Reference

### Run All Tests
```bash
pnpm test tests/api/analytics.test.ts
```

### Test Specific Endpoint
```bash
pnpm test tests/api/analytics.test.ts -t "getKpiSummary"
```

### Manual Testing
```bash
pnpm tsx scripts/test-analytics-api.ts
```

### View Test Data
```bash
pnpm prisma studio
```

### Check API Routes
```bash
cat src/server/api/root.ts | grep analytics
```

---

## Next Steps

1. ✅ **Tests Passing?** → Integrate with frontend
2. ❌ **Tests Failing?** → Check troubleshooting section
3. 📚 **Need Details?** → See `docs/API_TESTING_GUIDE.md`
4. 🔧 **Adding Features?** → See `docs/API_IMPLEMENTATION_SUMMARY.md`

---

## Documentation

- **Comprehensive Guide:** `docs/API_TESTING_GUIDE.md`
- **Implementation Details:** `docs/API_IMPLEMENTATION_SUMMARY.md`
- **Integration Guide:** `docs/OWNER_DASHBOARD_INTEGRATION.md`

---

## Support

**Issues?** Check the troubleshooting section above or review full documentation in `docs/API_TESTING_GUIDE.md`

**Questions?** Contact the development team or open an issue on GitHub.

---

**Status:** ✅ All endpoints implemented and tested  
**Last Updated:** 2024  
**Version:** 1.0.0