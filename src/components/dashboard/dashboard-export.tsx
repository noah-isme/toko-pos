"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";

type DashboardExportProps = {
  data: {
    userName: string;
    outletName: string;
    outletCode: string;
    date: string;
    metrics: {
      revenue: number;
      transactions: number;
      items: number;
    };
    recentTransactions?: Array<{
      receiptNumber: string;
      time: string;
      amount: number;
    }>;
  };
};

export function DashboardExport({ data }: DashboardExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Toko POS - Dashboard Report", pageWidth / 2, 20, {
        align: "center",
      });

      // Outlet info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Outlet: ${data.outletName} (${data.outletCode})`, 14, 30);
      doc.text(`Tanggal: ${data.date}`, 14, 36);
      doc.text(`User: ${data.userName}`, 14, 42);

      // Line separator
      doc.line(14, 46, pageWidth - 14, 46);

      // KPI Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Key Performance Indicators", 14, 56);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Penjualan Hari Ini:`, 14, 66);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(data.metrics.revenue), 60, 66);

      doc.setFont("helvetica", "normal");
      doc.text(`Total Transaksi:`, 14, 72);
      doc.setFont("helvetica", "bold");
      doc.text(data.metrics.transactions.toString(), 60, 72);

      doc.setFont("helvetica", "normal");
      doc.text(`Total Item Terjual:`, 14, 78);
      doc.setFont("helvetica", "bold");
      doc.text(data.metrics.items.toString(), 60, 78);

      // Recent Transactions Table
      if (data.recentTransactions && data.recentTransactions.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Transaksi Terbaru", 14, 92);

        autoTable(doc, {
          startY: 96,
          head: [["No. Struk", "Waktu", "Total"]],
          body: data.recentTransactions.map((tx) => [
            tx.receiptNumber,
            tx.time,
            formatCurrency(tx.amount),
          ]),
          theme: "grid",
          headStyles: { fillColor: [16, 185, 129] }, // emerald-500
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Generated on ${new Date().toLocaleString("id-ID")}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" },
        );
      }

      // Save
      const filename = `dashboard-${data.outletCode}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Gagal export PDF. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToPDF}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <FileText className="h-4 w-4 animate-pulse" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  );
}
