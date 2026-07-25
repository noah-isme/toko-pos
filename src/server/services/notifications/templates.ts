import type { NotificationTemplate } from "./index";

export const notificationTemplates = {
  lowStockAlert: (data: {
    productName: string;
    sku: string;
    currentStock: number;
    minStock: number;
    outletName: string;
  }): NotificationTemplate => ({
    subject: `⚠️ Low Stock Alert: ${data.productName} (${data.sku})`,
    text: `Low stock alert for ${data.productName} (${data.sku}) at ${data.outletName}.

Current stock: ${data.currentStock}
Minimum threshold: ${data.minStock}

Please restock this item soon.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #92400e; margin: 0 0 8px;">⚠️ Low Stock Alert</h2>
          <p style="margin: 0; color: #92400e;">${data.productName} (${data.sku}) at ${data.outletName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Current Stock:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${data.currentStock}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Minimum Threshold:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.minStock}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Outlet:</strong></td>
            <td style="padding: 8px;">${data.outletName}</td>
          </tr>
        </table>
        <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">Please restock this item soon to avoid stockouts.</p>
      </div>
    `,
    whatsappBody: `⚠️ *Low Stock Alert*\n\n*${data.productName}* (${data.sku})\n📍 ${data.outletName}\n📦 Current: ${data.currentStock} | Min: ${data.minStock}\n\nPlease restock soon.`,
  }),

  lowStockCleared: (data: {
    productName: string;
    sku: string;
    currentStock: number;
    outletName: string;
  }): NotificationTemplate => ({
    subject: `✅ Low Stock Cleared: ${data.productName} (${data.sku})`,
    text: `Low stock alert cleared for ${data.productName} (${data.sku}) at ${data.outletName}.

Current stock: ${data.currentStock}

The item has been restocked.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #065f46; margin: 0 0 8px;">✅ Low Stock Cleared</h2>
          <p style="margin: 0; color: #065f46;">${data.productName} (${data.sku}) at ${data.outletName}</p>
        </div>
        <p style="color: #374151;">Current stock: <strong>${data.currentStock}</strong></p>
        <p style="color: #6b7280; font-size: 14px;">The item has been restocked and is no longer below the minimum threshold.</p>
      </div>
    `,
    whatsappBody: `✅ *Low Stock Cleared*\n\n*${data.productName}* (${data.sku})\n📍 ${data.outletName}\n📦 Current: ${data.currentStock}\n\nItem has been restocked.`,
  }),

  paymentReceived: (data: {
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    outletName: string;
    cashierName: string;
  }): NotificationTemplate => ({
    subject: `💰 Payment Received: ${data.receiptNumber}`,
    text: `Payment received for transaction ${data.receiptNumber}.

Amount: ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Method: ${data.paymentMethod}
Outlet: ${data.outletName}
Cashier: ${data.cashierName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #065f46; margin: 0 0 8px;">💰 Payment Received</h2>
          <p style="margin: 0; color: #065f46;">Transaction: ${data.receiptNumber}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 18px; font-weight: bold; color: #059669;">${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Method:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Outlet:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.outletName}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Cashier:</strong></td>
            <td style="padding: 8px;">${data.cashierName}</td>
          </tr>
        </table>
      </div>
    `,
    whatsappBody: `💰 *Payment Received*\n\n*${data.receiptNumber}*\n💵 ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n💳 ${data.paymentMethod}\n📍 ${data.outletName}\n👤 ${data.cashierName}`,
  }),

  shiftOpened: (data: {
    outletName: string;
    cashierName: string;
    openingCash: number;
    openedAt: Date;
  }): NotificationTemplate => ({
    subject: `🔓 Shift Opened: ${data.outletName}`,
    text: `Shift opened at ${data.outletName}.

Cashier: ${data.cashierName}
Opening Cash: ${data.openingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Time: ${data.openedAt.toLocaleString("id-ID")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #1e40af; margin: 0 0 8px;">🔓 Shift Opened</h2>
          <p style="margin: 0; color: #1e40af;">${data.outletName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Cashier:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.cashierName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Opening Cash:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.openingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Time:</strong></td>
            <td style="padding: 8px;">${data.openedAt.toLocaleString("id-ID")}</td>
          </tr>
        </table>
      </div>
    `,
    whatsappBody: `🔓 *Shift Opened*\n\n📍 ${data.outletName}\n👤 ${data.cashierName}\n💵 Opening: ${data.openingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n🕐 ${data.openedAt.toLocaleString("id-ID")}`,
  }),

  shiftClosed: (data: {
    outletName: string;
    cashierName: string;
    openingCash: number;
    closingCash: number;
    expectedCash: number;
    difference: number;
    closedAt: Date;
  }): NotificationTemplate => ({
    subject: `🔒 Shift Closed: ${data.outletName} ${data.difference >= 0 ? "✅" : "⚠️"}`,
    text: `Shift closed at ${data.outletName}.

Cashier: ${data.cashierName}
Opening Cash: ${data.openingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Expected Cash: ${data.expectedCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Closing Cash: ${data.closingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Difference: ${data.difference >= 0 ? "+" : ""}${data.difference.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Time: ${data.closedAt.toLocaleString("id-ID")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${data.difference >= 0 ? "#d1fae5" : "#fee2e2"}; border: 1px solid ${data.difference >= 0 ? "#10b981" : "#ef4444"}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: ${data.difference >= 0 ? "#065f46" : "#991b1b"}; margin: 0 0 8px;">🔒 Shift Closed ${data.difference >= 0 ? "✅" : "⚠️"}</h2>
          <p style="margin: 0; color: ${data.difference >= 0 ? "#065f46" : "#991b1b"};">${data.outletName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Cashier:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.cashierName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Opening Cash:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.openingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Expected Cash:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.expectedCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Closing Cash:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.closingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Difference:</strong></td>
            <td style="padding: 8px; color: ${data.difference >= 0 ? "#059669" : "#dc2626"}; font-weight: bold;">${data.difference >= 0 ? "+" : ""}${data.difference.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Time:</strong></td>
            <td style="padding: 8px;">${data.closedAt.toLocaleString("id-ID")}</td>
          </tr>
        </table>
      </div>
    `,
    whatsappBody: `🔒 *Shift Closed* ${data.difference >= 0 ? "✅" : "⚠️"}\n\n📍 ${data.outletName}\n👤 ${data.cashierName}\n💵 Opening: ${data.openingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n💰 Expected: ${data.expectedCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n💵 Closing: ${data.closingCash.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n📊 Diff: ${data.difference >= 0 ? "+" : ""}${data.difference.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n🕐 ${data.closedAt.toLocaleString("id-ID")}`,
  }),

  dailyReport: (data: {
    date: string;
    outletName: string;
    totalSales: number;
    totalTransactions: number;
    itemsSold: number;
    avgTransaction: number;
    cashSales: number;
    qrisSales: number;
    cardSales: number;
  }): NotificationTemplate => ({
    subject: `📊 Daily Report: ${data.outletName} - ${data.date}`,
    text: `Daily Sales Report for ${data.outletName} on ${data.date}

Total Sales: ${data.totalSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Total Transactions: ${data.totalTransactions}
Items Sold: ${data.itemsSold}
Avg Transaction: ${data.avgTransaction.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}

Payment Breakdown:
- Cash: ${data.cashSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
- QRIS: ${data.qrisSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
- Card: ${data.cardSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #374151; margin: 0 0 8px;">📊 Daily Sales Report</h2>
          <p style="margin: 0; color: #6b7280;">${data.outletName} • ${data.date}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Total Sales</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 20px; font-weight: bold; color: #059669;">${data.totalSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Transactions</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.totalTransactions}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>Items Sold</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.itemsSold}</td>
          </tr>
          <tr>
            <td style="padding: 12px;"><strong>Avg/Transaction</strong></td>
            <td style="padding: 12px; text-align: right;">${data.avgTransaction.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
        </table>
        <h3 style="color: #374151; margin: 16px 0 8px;">Payment Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">💵 Cash</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.cashSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">📱 QRIS</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.qrisSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px;">💳 Card</td>
            <td style="padding: 8px; text-align: right;">${data.cardSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
        </table>
      </div>
    `,
    whatsappBody: `📊 *Daily Report*\n${data.outletName} • ${data.date}\n\n💰 Total: ${data.totalSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n🧾 Transactions: ${data.totalTransactions}\n📦 Items: ${data.itemsSold}\n📈 Avg: ${data.avgTransaction.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n\n💵 Cash: ${data.cashSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n📱 QRIS: ${data.qrisSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n💳 Card: ${data.cardSales.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}`,
  }),

  stockTransferRequested: (data: {
    transferNumber: string;
    fromOutlet: string;
    toOutlet: string;
    itemCount: number;
    requestedBy: string;
  }): NotificationTemplate => ({
    subject: `📦 Stock Transfer Requested: ${data.transferNumber}`,
    text: `Stock transfer requested.

Transfer: ${data.transferNumber}
From: ${data.fromOutlet}
To: ${data.toOutlet}
Items: ${data.itemCount}
Requested by: ${data.requestedBy}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #92400e; margin: 0 0 8px;">📦 Stock Transfer Requested</h2>
          <p style="margin: 0; color: #92400e;">${data.transferNumber}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.fromOutlet}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>To:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.toOutlet}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Items:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.itemCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Requested by:</strong></td>
            <td style="padding: 8px;">${data.requestedBy}</td>
          </tr>
        </table>
      </div>
    `,
    whatsappBody: `📦 *Stock Transfer Requested*\n\n*${data.transferNumber}*\n📤 From: ${data.fromOutlet}\n📥 To: ${data.toOutlet}\n📦 Items: ${data.itemCount}\n👤 By: ${data.requestedBy}`,
  }),

  stockOpnameCompleted: (data: {
    outletName: string;
    performedBy: string;
    totalItems: number;
    discrepancies: number;
    completedAt: Date;
  }): NotificationTemplate => ({
    subject: `📋 Stock Opname Completed: ${data.outletName}`,
    text: `Stock opname completed at ${data.outletName}.

Performed by: ${data.performedBy}
Total items checked: ${data.totalItems}
Discrepancies found: ${data.discrepancies}
Completed at: ${data.completedAt.toLocaleString("id-ID")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #1e40af; margin: 0 0 8px;">📋 Stock Opname Completed</h2>
          <p style="margin: 0; color: #1e40af;">${data.outletName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Performed by:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.performedBy}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total items:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.totalItems}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Discrepancies:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: ${data.discrepancies > 0 ? "#dc2626" : "#059669"}; font-weight: bold;">${data.discrepancies}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Completed at:</strong></td>
            <td style="padding: 8px;">${data.completedAt.toLocaleString("id-ID")}</td>
          </tr>
        </table>
      </div>
    `,
    whatsappBody: `📋 *Stock Opname Completed*\n\n📍 ${data.outletName}\n👤 By: ${data.performedBy}\n📦 Items: ${data.totalItems}\n⚠️ Discrepancies: ${data.discrepancies}\n🕐 ${data.completedAt.toLocaleString("id-ID")}`,
  }),

  receivingCompleted: (data: {
    outletName: string;
    supplierName: string;
    invoiceNumber: string | null;
    itemCount: number;
    totalValue: number;
    receivedBy: string;
  }): NotificationTemplate => ({
    subject: `📥 Receiving Completed: ${data.outletName}`,
    text: `Receiving completed at ${data.outletName}.

Supplier: ${data.supplierName}
Invoice: ${data.invoiceNumber ?? "N/A"}
Items received: ${data.itemCount}
Total value: ${data.totalValue.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
Received by: ${data.receivedBy}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="color: #065f46; margin: 0 0 8px;">📥 Receiving Completed</h2>
          <p style="margin: 0; color: #065f46;">${data.outletName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Supplier:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.supplierName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Invoice:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.invoiceNumber ?? "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Items:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.itemCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total Value:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.totalValue.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Received by:</strong></td>
            <td style="padding: 8px;">${data.receivedBy}</td>
          </tr>
        </table>
      </div>
    `,
    whatsappBody: `📥 *Receiving Completed*\n\n📍 ${data.outletName}\n🏪 Supplier: ${data.supplierName}\n🧾 Invoice: ${data.invoiceNumber ?? "N/A"}\n📦 Items: ${data.itemCount}\n💰 Value: ${data.totalValue.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}\n👤 By: ${data.receivedBy}`,
  }),
};

export function getTemplate<T extends Record<string, unknown>>(
  name: keyof typeof notificationTemplates,
  data: T,
): NotificationTemplate {
  const templateFn = notificationTemplates[name] as unknown as (data: T) => NotificationTemplate;
  if (!templateFn) {
    throw new Error(`Template "${name}" not found`);
  }
  return templateFn(data);
}