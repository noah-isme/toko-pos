# 🚀 Owner Dashboard - Quick Start Guide

## What is it?

The Owner Dashboard is a **premium enterprise analytics interface** that gives business owners a real-time, comprehensive view of their entire POS operation across multiple outlets.

Think of it as your **command center** for monitoring sales, staff, inventory, and performance metrics—all in one place.

---

## 🎯 Key Features

### 📊 Real-Time KPIs
- **Total Sales** with trend indicators
- **Transaction Count** and growth metrics
- **Items Sold** across all outlets
- **Profit Margins** with period comparisons

### 📈 Visual Analytics
- **Sales Charts**: Daily/weekly/monthly trends
- **Category Breakdown**: See which products drive revenue
- **Outlet Comparison**: Identify top performers

### 🏪 Multi-Outlet Management
- View aggregated data or filter by specific outlet
- Compare performance across locations
- Track each outlet's contribution

### 👥 Staff Monitoring
- **Active Shifts**: See who's working right now with LIVE indicator
- **Shift Performance**: Sales and transaction counts per cashier
- **Historical Data**: Review past shifts

### 📦 Inventory Alerts
- **Low Stock Watchlist**: Critical items that need attention
- **Severity Levels**: Color-coded alerts (Critical/Low/Warning)
- **Quick Navigation**: Jump directly to product management

### 📝 Activity Timeline
- **Real-time Log**: All system activities in chronological order
- **User Attribution**: Know who did what
- **Event Types**: Stock movements, refunds, product edits, transfers

---

## 🚀 Getting Started

### 1. Access the Dashboard

Navigate to:
```
/dashboard/owner
```

**Required Role**: `OWNER` (or `ADMIN` with view permissions)

### 2. Select Your View

**Filter by Outlet**:
- Choose "Semua Outlet" for aggregated data
- Select a specific outlet (BSD, BR2, etc.) for detailed view

**Choose Time Period**:
- Click preset buttons: Today, Yesterday, Last 7 Days, etc.
- All metrics update automatically

### 3. Explore the Sections

From top to bottom:

1. **KPI Cards** - Your key numbers at a glance
2. **Charts** - Visual trends and breakdowns
3. **Outlet Performance** - Compare your locations
4. **Low Stock & Shifts** - Operational alerts
5. **Activity Log** - What's happening in your system

---

## 💡 Quick Actions

### Export Data
Click the **"Export Data"** button (top right on desktop, below filters on mobile) to download a CSV report of current metrics.

### Drill Down into Outlets
Click any row in the **Outlet Performance** table to view detailed reports for that specific outlet.

### Check Low Stock
Click **"Lihat Semua"** in the Low Stock Watchlist to jump to the product management page with low-stock filter applied.

### Monitor Live Operations
Look for the **🟢 LIVE** indicator in the Shift Monitoring section to see which cashiers are currently active.

---

## 📱 Mobile Experience

The Owner Dashboard is fully responsive:

- **KPI Cards**: 2-column grid for quick scanning
- **Charts**: Horizontal scroll on smaller screens
- **Tables**: Convert to cards for easy reading
- **Filters**: Stack vertically for thumb-friendly interaction

All features available on mobile—no compromises!

---

## 🎨 Understanding the Colors

### Trend Indicators
- **Green ↑**: Metrics are improving (good!)
- **Red ↓**: Metrics are declining (needs attention)
- **Gray —**: No significant change

### Stock Severity
- **Red**: Critical (0 stock or <10% of minimum)
- **Orange**: Low (10-25% of minimum)
- **Amber**: Warning (25-50% of minimum)

### Activity Events
- **Green**: Stock additions
- **Red**: Stock removals
- **Blue**: Transfers between outlets
- **Orange**: Refunds/returns
- **Violet**: Product edits
- **Gray**: User actions

---

## 🔄 Data Refresh

### Current (Mock Data)
Data updates when you change filters (outlet or date range).

### Production (After API Integration)
- **KPIs & Charts**: Refresh every 30 seconds
- **Low Stock**: Refresh every 60 seconds
- **Active Shifts**: Refresh every 30 seconds (with LIVE indicator)
- **Activity Log**: Real-time WebSocket updates (planned)

---

## 🛠️ Customization

### Date Presets
Five built-in presets:
1. **Hari Ini** (Today)
2. **Kemarin** (Yesterday)
3. **7 Hari Terakhir** (Last 7 Days)
4. **30 Hari Terakhir** (Last 30 Days)
5. **Bulan Ini** (This Month)

Custom date range selector coming in Phase 2!

### Chart Types
- **Sales Chart**: Switch between Line and Bar (default: Bar)
- **Category Chart**: Donut chart with interactive legend

---

## 📊 Reading the Data

### KPI Cards
- **Large Number**: Current value for selected period
- **Trend Badge**: Percentage change vs. previous period
- **Arrow Direction**: Up/down indicator

Example:
```
Total Penjualan
Rp 28.5M  [↑ 12%]
```
Means: Current period sales are Rp28.5M, which is 12% higher than the previous comparable period.

### Outlet Performance
- **Sales**: Total revenue for the outlet
- **Transactions**: Number of completed sales
- **Avg Ticket**: Average transaction value (Sales ÷ Transactions)
- **Status**: Trend compared to previous period

### Shift Monitoring
- **Time Range**: When the shift started (and ended, if closed)
- **Sales**: Total collected during that shift
- **Transactions**: Number of sales completed
- **LIVE**: Green pulsing dot means shift is currently active

---

## 🎯 Best Practices

### Daily Routine (Owner)
1. Check KPI cards for yesterday vs. today trends
2. Review Low Stock Watchlist—restock if needed
3. Check Shift Monitoring for current operations
4. Scan Activity Log for unusual events

### Weekly Review
1. Switch to "7 Hari Terakhir"
2. Analyze Sales Chart for patterns (weekday vs. weekend)
3. Review Outlet Performance—identify underperformers
4. Check Category Chart—adjust inventory based on top sellers

### Monthly Analysis
1. Switch to "30 Hari Terakhir"
2. Export data for offline analysis
3. Compare outlet trends
4. Set goals for next month based on profit margins

---

## 🐛 Common Issues

### "No data available"
- Check that you have the OWNER role
- Verify outlet selection (try "Semua Outlet")
- Ensure date range is valid

### Charts not showing
- Data might be empty for selected period
- Try switching date range preset
- Check browser console for errors

### Slow performance
- Reduce date range (e.g., 7 days instead of 30)
- Clear browser cache
- Check network connection

---

## 🚀 Coming Soon

### Phase 2 (Next Quarter)
- [ ] Custom date range picker (calendar)
- [ ] Real-time WebSocket updates
- [ ] Scheduled email reports
- [ ] Advanced export (PDF, Excel)
- [ ] Saved filter presets

### Phase 3 (Future)
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] Mobile app
- [ ] Multi-currency support

---

## 📚 Learn More

- **Full Documentation**: [OWNER_DASHBOARD.md](./OWNER_DASHBOARD.md)
- **Component API**: See individual component docs in `/docs`
- **Design System**: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)

---

## 🆘 Need Help?

1. Check the [Troubleshooting section](./OWNER_DASHBOARD.md#-troubleshooting)
2. Review [API Documentation](./API.md) for data structure
3. Contact: your-dev-team@company.com

---

**Happy Monitoring! 📊**