"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings as SettingsIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/client";

interface TaxFormState {
  id?: string;
  name: string;
  rate: string;
  isActive: boolean;
}

const EMPTY_FORM: TaxFormState = {
  name: "",
  rate: "",
  isActive: false,
};

export default function SettingsPage() {
  const utils = api.useContext();

  const listQuery = api.settings.listTaxSettings.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const activeQuery = api.settings.getActiveTaxSetting.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const upsertMutation = api.settings.upsertTaxSetting.useMutation({
    onSuccess: () => {
      void utils.settings.listTaxSettings.invalidate();
      void utils.settings.getActiveTaxSetting.invalidate();
    },
  });
  const activateMutation = api.settings.activateTaxSetting.useMutation({
    onSuccess: () => {
      void utils.settings.listTaxSettings.invalidate();
      void utils.settings.getActiveTaxSetting.invalidate();
    },
  });

  const [form, setForm] = useState<TaxFormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Nama pengaturan PPN wajib diisi");
      return;
    }

    const rate = Number(form.rate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Tarif harus berupa angka antara 0 sampai 100");
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        id: form.id,
        name,
        rate,
        isActive: form.isActive,
      });
      toast.success(
        form.id ? "Pengaturan PPN diperbarui" : "Pengaturan PPN ditambahkan",
      );
      setForm(EMPTY_FORM);
      setIsEditing(false);
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleEdit = (setting: {
    id: string;
    name: string;
    rate: number;
    isActive: boolean;
  }) => {
    setForm({
      id: setting.id,
      name: setting.name,
      rate: String(setting.rate),
      isActive: setting.isActive,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
  };

  const handleActivate = async (id: string) => {
    try {
      await activateMutation.mutateAsync({ id });
      toast.success("Pengaturan PPN diaktifkan");
    } catch (error) {
      toast.error("Gagal mengaktifkan pengaturan", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const isLoading = listQuery.isLoading;
  const settings = listQuery.data ?? [];
  const activeSetting = activeQuery.data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-7 w-7 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold">Pengaturan</h1>
              <p className="text-muted-foreground mt-1">
                Kelola tarif Pajak Pertambahan Nilai (PPN) untuk transaksi.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Active Tax Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  PPN Aktif Saat Ini
                </p>
                {activeQuery.isLoading ? (
                  <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
                ) : activeSetting ? (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-2xl font-bold">
                      {activeSetting.name}
                    </span>
                    <Badge className="bg-green-100 text-green-700">
                      {activeSetting.rate}%
                    </Badge>
                  </div>
                ) : (
                  <p className="mt-2 text-lg font-semibold text-muted-foreground">
                    Belum ada PPN aktif
                  </p>
                )}
              </div>
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isEditing ? "Edit Pengaturan PPN" : "Tambah Pengaturan PPN"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-name">Nama Pengaturan</Label>
                  <Input
                    id="tax-name"
                    placeholder="contoh: PPN 11%"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    maxLength={120}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tarif (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="11"
                    value={form.rate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, rate: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tax-active"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                  <Label htmlFor="tax-active" className="text-sm font-normal">
                    Jadikan PPN aktif (hanya satu yang bisa aktif)
                  </Label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={upsertMutation.isPending}
                  >
                    {upsertMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isEditing ? (
                      <Save className="mr-2 h-4 w-4" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {isEditing ? "Simpan" : "Tambah"}
                  </Button>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Batal
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* List Card */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Pengaturan PPN</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : settings.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  Belum ada pengaturan PPN. Tambahkan menggunakan formulir di
                  samping.
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.map((setting) => (
                    <div
                      key={setting.id}
                      className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                        setting.isActive
                          ? "border-green-300 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{setting.name}</span>
                          {setting.isActive && (
                            <Badge className="bg-green-100 text-green-700">
                              Aktif
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tarif: {setting.rate}%
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!setting.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={activateMutation.isPending}
                            onClick={() => handleActivate(setting.id)}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Aktifkan
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(setting)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
