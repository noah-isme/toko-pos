"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/client";
import { useOutlet } from "@/lib/outlet-context";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function InventoryDebugPage() {
  const { currentOutlet } = useOutlet();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Query products
  const productsQuery = api.products.list.useQuery({ search: "" });

  // Query inventory
  const inventoryQuery = api.inventory.getAllInventory.useQuery(
    { outletId: currentOutlet?.id ?? "" },
    {
      enabled: Boolean(currentOutlet?.id),
    },
  );

  useEffect(() => {
    if (currentOutlet) {
      addLog(`🏪 Current outlet: ${currentOutlet.name} (${currentOutlet.id})`);
    } else {
      addLog(`⚠️ No outlet selected`);
    }
  }, [currentOutlet]);

  useEffect(() => {
    if (productsQuery.data) {
      addLog(`📦 Products loaded: ${productsQuery.data.length} items`);
    }
  }, [productsQuery.data]);

  useEffect(() => {
    if (inventoryQuery.data) {
      addLog(`📊 Inventory data loaded: ${inventoryQuery.data.length} records`);
      inventoryQuery.data.forEach((inv, idx) => {
        if (idx < 5) {
          addLog(`   └─ Product ${inv.productId}: ${inv.quantity} units`);
        }
      });
      if (inventoryQuery.data.length > 5) {
        addLog(`   └─ ... and ${inventoryQuery.data.length - 5} more`);
      }
    }
  }, [inventoryQuery.data]);

  useEffect(() => {
    if (inventoryQuery.isError) {
      addLog(
        `❌ Inventory query error: ${inventoryQuery.error?.message ?? "Unknown error"}`,
      );
    }
  }, [inventoryQuery.isError, inventoryQuery.error]);

  const handleRefresh = () => {
    addLog("🔄 Refreshing data...");
    void productsQuery.refetch();
    void inventoryQuery.refetch();
  };

  // Create inventory map
  const inventoryMap = new Map<string, number>();
  (inventoryQuery.data ?? []).forEach((inv) => {
    inventoryMap.set(inv.productId, inv.quantity);
  });

  // Combine products with inventory
  const productsWithStock = (productsQuery.data ?? []).map((product) => ({
    ...product,
    stock: inventoryMap.get(product.id) ?? 0,
  }));

  const statusCounts = {
    withStock: productsWithStock.filter((p) => p.stock > 0).length,
    withZeroStock: productsWithStock.filter((p) => p.stock === 0).length,
    total: productsWithStock.length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Debug Page</h1>
          <p className="text-muted-foreground">Debugging stock display issue</p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Outlet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Outlet</CardTitle>
        </CardHeader>
        <CardContent>
          {currentOutlet ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-semibold">{currentOutlet.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                ID: {currentOutlet.id}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="w-5 h-5" />
              <span>No outlet selected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Products Query</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              {productsQuery.isLoading ? (
                <Badge variant="secondary">Loading...</Badge>
              ) : productsQuery.isError ? (
                <Badge variant="destructive">Error</Badge>
              ) : (
                <Badge variant="default" className="bg-green-500">
                  Success
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Count:</span>
              <span className="font-bold">
                {productsQuery.data?.length ?? 0}
              </span>
            </div>
            {productsQuery.isError && (
              <div className="text-sm text-red-500 mt-2">
                {productsQuery.error?.message}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Query</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              {inventoryQuery.isLoading ? (
                <Badge variant="secondary">Loading...</Badge>
              ) : inventoryQuery.isError ? (
                <Badge variant="destructive">Error</Badge>
              ) : (
                <Badge variant="default" className="bg-green-500">
                  Success
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Count:</span>
              <span className="font-bold">
                {inventoryQuery.data?.length ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Enabled:</span>
              <span>{Boolean(currentOutlet?.id) ? "✅" : "❌"}</span>
            </div>
            {inventoryQuery.isError && (
              <div className="text-sm text-red-500 mt-2">
                {inventoryQuery.error?.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {statusCounts.withStock}
              </div>
              <div className="text-sm text-muted-foreground">With Stock</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {statusCounts.withZeroStock}
              </div>
              <div className="text-sm text-muted-foreground">Zero Stock</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{statusCounts.total}</div>
              <div className="text-sm text-muted-foreground">
                Total Products
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products with Stock */}
      <Card>
        <CardHeader>
          <CardTitle>Products & Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {productsWithStock.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found
              </div>
            ) : (
              productsWithStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {product.sku} | ID: {product.id.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${
                          product.stock > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {product.stock}
                      </div>
                      <div className="text-xs text-muted-foreground">units</div>
                    </div>
                    {product.stock > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No logs yet
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-muted/50 rounded hover:bg-muted"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Raw Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Inventory Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64">
            {JSON.stringify(inventoryQuery.data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
