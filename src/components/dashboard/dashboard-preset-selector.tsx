"use client";

import { LayoutDashboard, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDashboard, DashboardPreset } from "@/contexts/dashboard-context";
import { cn } from "@/lib/utils";

type PresetInfo = {
  id: DashboardPreset;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const presets: PresetInfo[] = [
  {
    id: "owner",
    label: "Owner View",
    description: "Focus on revenue, trends, and overall performance",
    icon: LayoutDashboard,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "manager",
    label: "Manager View",
    description: "Operations-focused with modules and snapshots",
    icon: Users,
    color: "text-blue-600 bg-blue-50",
  },
  {
    id: "cashier",
    label: "Cashier View",
    description: "Simplified view with essential modules only",
    icon: User,
    color: "text-amber-600 bg-amber-50",
  },
];

export function DashboardPresetSelector() {
  const { settings, updatePreset } = useDashboard();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Preset: {settings.preset}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dashboard Presets</DialogTitle>
          <DialogDescription>
            Choose a preset layout optimized for different roles
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-3">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isActive = settings.preset === preset.id;

            return (
              <Card
                key={preset.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isActive && "ring-2 ring-emerald-500",
                )}
                onClick={() => updatePreset(preset.id)}
              >
                <CardContent className="p-6 space-y-4">
                  <div className={cn("rounded-lg p-3 w-fit", preset.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {preset.label}
                    </h3>
                    <p className="text-sm text-gray-600">{preset.description}</p>
                  </div>
                  {isActive && (
                    <div className="text-xs font-medium text-emerald-600">
                      ✓ Active
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
