"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type Preset = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth";

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset>("today");

  const presets: Array<{ value: Preset; label: string }> = [
    { value: "today", label: "Hari Ini" },
    { value: "yesterday", label: "Kemarin" },
    { value: "last7days", label: "7 Hari Terakhir" },
    { value: "last30days", label: "30 Hari Terakhir" },
    { value: "thisMonth", label: "Bulan Ini" },
  ];

  const getDateRangeForPreset = (preset: Preset): DateRange => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    switch (preset) {
      case "today":
        return { from: today, to: todayEnd };
      case "yesterday":
        return {
          from: startOfDay(subDays(now, 1)),
          to: endOfDay(subDays(now, 1)),
        };
      case "last7days":
        return { from: startOfDay(subDays(now, 6)), to: todayEnd };
      case "last30days":
        return { from: startOfDay(subDays(now, 29)), to: todayEnd };
      case "thisMonth":
        return {
          from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
          to: todayEnd,
        };
      default:
        return { from: today, to: todayEnd };
    }
  };

  const handlePresetChange = (preset: Preset) => {
    setSelectedPreset(preset);
    const range = getDateRangeForPreset(preset);
    onChange(range);
  };

  const formatDateRange = (range: DateRange) => {
    const sameDay =
      format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd");

    if (sameDay) {
      return format(range.from, "d MMM yyyy", { locale: idLocale });
    }

    const sameMonth =
      format(range.from, "yyyy-MM") === format(range.to, "yyyy-MM");

    if (sameMonth) {
      return `${format(range.from, "d", { locale: idLocale })} - ${format(
        range.to,
        "d MMM yyyy",
        { locale: idLocale },
      )}`;
    }

    return `${format(range.from, "d MMM", { locale: idLocale })} - ${format(
      range.to,
      "d MMM yyyy",
      { locale: idLocale },
    )}`;
  };

  return (
    <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center", className)}>
      {/* Desktop View */}
      <div className="hidden items-center gap-2 lg:flex">
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {formatDateRange(value)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              variant={selectedPreset === preset.value ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePresetChange(preset.value)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile View */}
      <div className="flex flex-col gap-2 lg:hidden">
        <Select
          value={selectedPreset}
          onValueChange={(value) => handlePresetChange(value as Preset)}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">Periode:</span>
          <span className="text-xs font-medium text-foreground">
            {formatDateRange(value)}
          </span>
        </div>
      </div>
    </div>
  );
}
