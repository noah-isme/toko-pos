// Simulate tRPC batch response format
const successResponse = [
  {
    result: {
      data: {
        date: "2025-12-03T17:00:00.000Z",
        totals: {
          totalGross: 168000,
          totalDiscount: 22350,
          totalNet: 145650,
          totalItems: 12,
          totalCash: 145650,
          totalTax: 0
        },
        sales: [
          {
            id: "test-id",
            outletId: "cmgxy8e5j0000jyyqn6jux0yh",
            receiptNumber: "TRX-1764807621223",
            totalNet: 145650,
            soldAt: "2025-12-03T17:00:00.000Z",
            paymentMethods: ["CASH"],
            items: [
              {
                productName: "Test Product",
                quantity: 6,
                unitPrice: 10000
              }
            ]
          }
        ]
      }
    }
  }
];

console.log("Expected tRPC response format:");
console.log(JSON.stringify(successResponse, null, 2));
