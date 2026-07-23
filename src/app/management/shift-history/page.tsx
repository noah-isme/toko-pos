"use client";

import { useState } from "react";
import { Loader2, Clock, Check, ArrowLeft } from "lucide-react";

import { api } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ShiftHistoryPage() {
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [limit, setLimit] = useState("20");

  const outletsQuery = api.outlets.list.useQuery();
  const sessionsQuery = api.cashSessions.list.useQuery(
    {
      outletId: selectedOutletId,
      limit: parseInt(limit, 10) || 20,
    },
    { enabled: Boolean(selectedOutletId) },
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Riwayat Shift</h1>
              <p className="text-muted-foreground mt-1">
                Daftar sesi kasir (buka/tutup shift) per outlet.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardDescription>Pilih outlet dan jumlah data.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Outlet</label>
              <Select
                value={selectedOutletId}
                onValueChange={setSelectedOutletId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outletsQuery.data?.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <label className="text-sm font-medium">Jumlah</label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {sessionsQuery.isLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat riwayat shift...
          </div>
        )}

        {/* Empty */}
        {!sessionsQuery.isLoading && sessionsQuery.data?.length === 0 && (
          <Card className="p-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Belum Ada Riwayat</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Belum ada sesi kasir yang dicatat untuk outlet ini.
            </p>
          </Card>
        )}

        {/* Desktop Table */}
        {sessionsQuery.data && sessionsQuery.data.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Buka Shift</TableHead>
                  <TableHead>Tutup Shift</TableHead>
                  <TableHead className="text-right">Kas Awal</TableHead>
                  <TableHead className="text-right">Kas Akhir</TableHead>
                  <TableHead className="text-right">Ekspektasi</TableHead>
                  <TableHead className="text-right">Selisih</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsQuery.data.map((session) => {
                  const openingCash = Number(session.openingCash);
                  const closingCash = session.closingCash
                    ? Number(session.closingCash)
                    : null;
                  const expectedCash = session.expectedCash
                    ? Number(session.expectedCash)
                    : null;
                  const difference =
                    closingCash !== null && expectedCash !== null
                      ? closingCash - expectedCash
                      : null;

                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.user?.name ?? "—"}
                      </TableCell>
                      <TableCell>{formatDateTime(session.openTime)}</TableCell>
                      <TableCell>
                        {session.closeTime ? (
                          formatDateTime(session.closeTime)
                        ) : (
                          <span className="text-muted-foreground">Masih aktif</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(openingCash)}
                      </TableCell>
                      <TableCell className="text-right">
                        {closingCash !== null ? (
                          formatCurrency(closingCash)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {expectedCash !== null ? (
                          formatCurrency(expectedCash)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {difference !== null ? (
                          <Badge
                            className={
                              difference === 0
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : difference > 0
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {difference > 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.closeTime ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <Check className="mr-1 h-3 w-3" />
                            Selesai
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            Aktif
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
