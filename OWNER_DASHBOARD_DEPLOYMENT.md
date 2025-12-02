# 🚀 Owner Dashboard - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Owner Dashboard to production, including pre-deployment checks, API integration, testing procedures, and post-deployment monitoring.

---

## 📋 Pre-Deployment Checklist

### Frontend Verification

- [x] All 8 components implemented and tested
- [x] Main dashboard page complete
- [x] TypeScript compilation successful
- [x] No ESLint errors or warnings
- [x] Responsive design verified (mobile + desktop)
- [x] Animations tested and optimized
- [x] Loading states implemented
- [x] Empty states designed
- [x] Error boundaries in place
- [x] Mock data comprehensive

### Backend Requirements (Before Deployment)

- [ ] All 7 TRPC routes implemented
- [ ] Database schema supports analytics queries
- [ ] Required indexes created
- [ ] Query performance tested
- [ ] Caching strategy implemented
- [ ] Rate limiting configured
- [ ] API documentation updated
- [ ] Backend unit tests passing

### Database Preparation

- [ ] Run database migrations
- [ ] Create required indexes (see below)
- [ ] Test query performance
- [ ] Set up read replicas (if needed)
- [ ] Configure connection pooling
- [ ] Enable query logging

### Environment Configuration

- [ ] Production environment variables set
- [ ] API keys configured
- [ ] Database connection strings updated
- [ ] Redis/cache connection configured
- [ ] Monitoring tools integrated
- [ ] Error tracking enabled (Sentry, etc.)

---

## 🗄️ Database Setup

### Required Indexes

Execute these SQL commands before deployment:

```sql
-- Sales queries optimization
CREATE INDEX IF NOT EXISTS idx_sale_outlet_date 
  ON sale(outlet_id, sold_at) 
  WHERE status = 'COMPLETED';

CREATE INDEX IF NOT EXISTS idx_sale_status_date 
  ON sale(status, sold_at);

CREATE INDEX IF NOT EXISTS idx_sale_outlet_status 
  ON sale(outlet_id, status);

-- Sale items for category analysis
CREATE INDEX IF NOT EXISTS idx_sale_item_product 
  ON sale_item(product_id, subtotal);

CREATE INDEX IF NOT EXISTS idx_sale_item_sale 
  ON sale_item(sale_id, quantity);

-- Inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_outlet_stock 
  ON inventory(outlet_id, stock);

CREATE INDEX IF NOT EXISTS idx_inventory_product 
  ON inventory(product_id, stock);

-- Shift queries
CREATE INDEX IF NOT EXISTS idx_shift_outlet_open 
  ON shift(outlet_id, open_time);

CREATE INDEX IF NOT EXISTS idx_shift_user_open 
  ON shift(user_id, open_time);

CREATE INDEX IF NOT EXISTS idx_shift_close_time 
  ON shift(close_time);

-- Audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_outlet_created 
  ON audit_log(outlet_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_user_created 
  ON audit_log(user_id, created_at);

-- Product queries
CREATE INDEX IF NOT EXISTS idx_product_category 
  ON product(category_id);

CREATE INDEX IF NOT EXISTS idx_product_min_stock 
  ON product(min_stock);
```

### Database Migrations

```bash
# Run migrations
npm run db:migrate

# Verify migrations
npm run db:studio
```

---

## 🔌 API Integration Steps

### Step 1: Create TRPC Routes

Implement the following routes in `src/server/api/routers/analytics.ts`:

1. **getKpiSummary** - KPI metrics with trends
2. **getSalesTrend** - Sales chart data
3. **getCategoryBreakdown** - Category composition
4. **getOutletComparison** - Outlet performance

And in respective routers:

5. **inventory.listLowStock** - Low stock alerts
6. **shifts.listActiveShifts** - Shift monitoring
7. **audit.getRecentActivities** - Activity log

See `docs/OWNER_DASHBOARD_INTEGRATION.md` for detailed specifications.

### Step 2: Update Frontend

Replace mock data in `src/app/dashboard/owner/page.tsx`:

```typescript
// Remove mock data
const mockData = useMemo(() => { /* ... */ }, []);

// Add TRPC queries
const { data: kpiData } = api.analytics.getKpiSummary.useQuery({
  outletId: selectedOutlet === "all" ? undefined : selectedOutlet,
  dateRange,
  compareWithPrevious: true,
});

// Repeat for all 7 queries
```

### Step 3: Test Integration

```bash
# Start development server
npm run dev

# Test each section:
# 1. Check KPI cards load
# 2. Verify charts render
# 3. Test outlet table
# 4. Check low stock alerts
# 5. Monitor shift tracking
# 6. Review activity log
```

---

## 🧪 Testing Procedures

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage
```

**Required Coverage**:
- Components: > 80%
- Utils: > 90%
- Hooks: > 85%

### Integration Tests

Test each API endpoint:

```typescript
// Example test
describe("Analytics API", () => {
  it("returns KPI summary with trends", async () => {
    const result = await caller.analytics.getKpiSummary({
      dateRange: { from: new Date(), to: new Date() },
    });
    
    expect(result.totalSales.current).toBeGreaterThan(0);
    expect(result.totalSales.trend).toBeDefined();
  });
});
```

### E2E Tests

Run Playwright tests:

```bash
# Run E2E tests
npm run test:e2e

# Run specific tests
npm run test:e2e -- dashboard-owner.spec.ts
```

**Critical User Flows**:
1. Owner logs in → sees dashboard
2. Filter by outlet → data updates
3. Change date range → charts refresh
4. Click outlet row → navigate to detail
5. Click "Lihat Semua" → go to products
6. Export data → download CSV

### Performance Testing

```bash
# Run Lighthouse CI
npx lighthouse-ci autorun

# Run load tests (k6 or similar)
k6 run load-test.js
```

**Performance Targets**:
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90
- API Response Time: < 500ms (p95)

---

## 🔒 Security Checklist

### Authentication & Authorization

- [ ] Role-based access control (OWNER only)
- [ ] Session management secure
- [ ] JWT tokens configured properly
- [ ] CSRF protection enabled
- [ ] Rate limiting on API endpoints

### Data Security

- [ ] Sensitive data encrypted at rest
- [ ] TLS/SSL enabled for all connections
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS protection in place
- [ ] CORS configured correctly

### API Security

- [ ] API keys not exposed in frontend
- [ ] Environment variables secured
- [ ] Input validation on all endpoints
- [ ] Output sanitization
- [ ] Error messages don't leak sensitive info

---

## 📦 Build & Deploy

### Build Process

```bash
# Install dependencies
npm ci

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build for production
npm run build

# Test production build locally
npm run start
```

### Environment Variables

Create `.env.production`:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Next Auth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# Optional: Redis (for caching)
REDIS_URL="redis://your-redis-host:6379"

# Optional: Real-time (Pusher/Ably)
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="your-cluster"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="GA-XXXXXXXXX"

# Optional: Error Tracking
SENTRY_DSN="your-sentry-dsn"
```

### Deployment Commands

**Vercel**:
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Docker**:
```bash
# Build image
docker build -t toko-pos .

# Run container
docker run -p 3000:3000 toko-pos
```

**Traditional Server**:
```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "toko-pos" -- start

# Or with systemd
systemctl start toko-pos
```

---

## 🔍 Post-Deployment Verification

### Immediate Checks (First 5 Minutes)

1. **Access Check**
   - [ ] Dashboard loads at `/dashboard/owner`
   - [ ] Requires OWNER role
   - [ ] Redirects non-owners appropriately

2. **Data Loading**
   - [ ] KPI cards display real data
   - [ ] Charts render correctly
   - [ ] Tables populate with data
   - [ ] No console errors

3. **Filters Working**
   - [ ] Outlet selector updates data
   - [ ] Date range picker changes results
   - [ ] All presets work correctly

4. **Responsive Design**
   - [ ] Desktop layout correct
   - [ ] Mobile layout adapts
   - [ ] Tablet view works
   - [ ] No layout breaks

5. **Performance**
   - [ ] Page loads in < 3s
   - [ ] Charts animate smoothly
   - [ ] No janky scrolling
   - [ ] API responses fast

### First Hour Monitoring

Monitor these metrics:

- **Error Rate**: Should be < 0.1%
- **Response Time**: P95 < 500ms
- **Page Load Time**: Average < 3s
- **User Sessions**: Track adoption
- **API Calls**: Verify caching working

### First Day Monitoring

- [ ] Check error logs for any issues
- [ ] Review user feedback
- [ ] Monitor database performance
- [ ] Check memory usage
- [ ] Verify caching effectiveness
- [ ] Review API rate limits

---

## 📊 Monitoring & Alerting

### Application Monitoring

**Metrics to Track**:
- Page load times
- API response times
- Error rates
- User sessions
- Feature usage

**Tools**:
- Vercel Analytics
- Google Analytics
- New Relic / Datadog
- Sentry for errors

### Database Monitoring

**Metrics to Track**:
- Query execution time
- Connection pool usage
- Slow query log
- Index usage
- Cache hit rate

**Alerts to Set Up**:
- Query time > 1s
- Connection pool > 80%
- Error rate > 1%
- CPU usage > 80%

### API Monitoring

**Metrics to Track**:
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Cache hit rate

**Alerts to Set Up**:
- Response time > 1s (p95)
- Error rate > 5%
- Request rate spike (>3x normal)

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: Dashboard not loading
- Check user has OWNER role
- Verify authentication token
- Check console for errors
- Review server logs

**Issue**: Data not updating
- Check API endpoints are deployed
- Verify database connection
- Check TRPC routes configured
- Review query filters

**Issue**: Charts not rendering
- Check Recharts library loaded
- Verify data format correct
- Check for numeric NaN values
- Review console errors

**Issue**: Slow performance
- Check database indexes created
- Verify caching enabled
- Review query optimization
- Check network requests

**Issue**: Mobile layout broken
- Check Tailwind classes correct
- Verify responsive breakpoints
- Test on real devices
- Review viewport meta tag

---

## 📈 Success Metrics

### Week 1 KPIs

- **Adoption Rate**: > 50% of owners use dashboard
- **Error Rate**: < 1%
- **Average Session**: 3-5 minutes
- **User Satisfaction**: Collect feedback

### Month 1 KPIs

- **Adoption Rate**: > 80% of owners
- **Daily Active Users**: All owners
- **Average Session**: 5-10 minutes
- **Feature Usage**: All sections used
- **User Satisfaction**: > 4/5 stars

### Business Impact (3 Months)

- **Decision Speed**: 50% faster
- **Alert Response**: 80% faster
- **Operational Efficiency**: 30% improvement
- **User Retention**: > 95%

---

## 🔄 Rollback Plan

### If Critical Issues Found

**Step 1: Immediate Response**
```bash
# Revert to previous deployment
vercel rollback

# Or with Git
git revert HEAD
git push origin main
```

**Step 2: Investigate**
- Review error logs
- Check monitoring dashboards
- Gather user reports
- Identify root cause

**Step 3: Fix & Redeploy**
- Fix critical issues
- Test thoroughly
- Deploy fix
- Monitor closely

### Feature Flags (Optional)

Consider using feature flags for gradual rollout:

```typescript
// Example with feature flag
const showOwnerDashboard = useFeatureFlag("owner-dashboard");

if (!showOwnerDashboard) {
  return <OldDashboard />;
}

return <NewOwnerDashboard />;
```

---

## 📚 Documentation Updates

After successful deployment:

- [ ] Update API documentation
- [ ] Record demo video
- [ ] Create user training materials
- [ ] Update changelog
- [ ] Write blog post (optional)
- [ ] Notify users of new feature

---

## 👥 User Training

### For Owners

**Training Session** (30 minutes):
1. Dashboard overview (5 min)
2. Key features walkthrough (10 min)
3. Common tasks demo (10 min)
4. Q&A (5 min)

**Resources**:
- Quick start guide: `docs/OWNER_DASHBOARD_README.md`
- Video tutorial: (record and link)
- FAQ document
- Support contact

### For Admins

**Admin Briefing** (15 minutes):
1. Technical overview
2. Support procedures
3. Common issues
4. Escalation path

---

## 📞 Support Plan

### Support Channels

- **Email**: support@company.com
- **Slack**: #owner-dashboard-support
- **Phone**: Emergency hotline
- **Docs**: `/docs` folder

### On-Call Schedule

**Week 1 Post-Launch**:
- 24/7 on-call engineer
- Daily standups to review issues
- Hotfix process ready

**Ongoing**:
- Standard support hours
- Escalation procedures
- Bug tracking system

---

## ✅ Final Go/No-Go Checklist

### Technical Readiness

- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance meets targets
- [ ] Security audit complete
- [ ] Database optimized
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Rollback plan ready

### Business Readiness

- [ ] User training scheduled
- [ ] Documentation complete
- [ ] Support team briefed
- [ ] Stakeholders informed
- [ ] Marketing materials ready (if applicable)

### Deployment Readiness

- [ ] Production environment ready
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] Backup plan in place
- [ ] Communication plan ready

---

## 🎉 Launch Day Procedure

### Morning (Pre-Launch)

**Time: -2 hours**
1. Team standup
2. Final verification of all systems
3. Review rollback plan
4. Confirm support coverage

**Time: -1 hour**
1. Database backup
2. Final smoke tests
3. Notify stakeholders
4. Prepare monitoring dashboards

### Launch

**Time: 0:00**
1. Execute deployment
2. Monitor logs in real-time
3. Verify all checks pass
4. Test critical user flows
5. Send launch announcement

### Post-Launch

**Time: +1 hour**
1. Monitor error rates
2. Check performance metrics
3. Review user feedback
4. Address any issues

**Time: +24 hours**
1. Review metrics dashboard
2. Gather user feedback
3. Document any issues
4. Plan improvements

---

## 📊 Launch Communication

### Internal Announcement

**To**: All team members
**Subject**: 🚀 Owner Dashboard Now Live!

**Body**:
```
Team,

The new Owner Dashboard is now live in production!

Access: https://your-domain.com/dashboard/owner
Role Required: OWNER

Key Features:
- Real-time KPI tracking
- Multi-outlet comparison
- Live shift monitoring
- Inventory alerts
- Activity timeline

Please monitor for issues and report any feedback to #owner-dashboard-support.

Great work everyone!
```

### User Announcement

**To**: All business owners
**Subject**: 📊 Introducing Your New Owner Dashboard

**Body**:
```
Dear [Owner Name],

We're excited to announce a powerful new feature: the Owner Dashboard!

Get real-time insights into your business:
✅ Track sales across all outlets
✅ Monitor staff performance
✅ Receive inventory alerts
✅ View activity timeline

Access it now: [Link]
Watch the tutorial: [Video Link]

Need help? Contact support@company.com

Best regards,
[Your Team]
```

---

## 🎯 Success!

Congratulations on deploying the Owner Dashboard!

**Remember**:
- Monitor closely for the first 24 hours
- Respond quickly to user feedback
- Iterate based on usage data
- Celebrate the win with your team! 🎉

---

**Deployment Version**: 1.0.0
**Last Updated**: December 2024
**Status**: Ready for Production Deployment
**Estimated Deployment Time**: 2-4 hours
**Risk Level**: Low (with proper testing)

---

**Good luck with the launch! 🚀**