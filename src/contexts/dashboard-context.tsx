"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type WidgetType =
  | "kpi"
  | "revenue-chart"
  | "activity-feed"
  | "modules"
  | "snapshot";

export type DashboardPreset = "owner" | "manager" | "cashier" | "custom";

export type WidgetConfig = {
  id: WidgetType;
  enabled: boolean;
  order: number;
};

type DashboardSettings = {
  preset: DashboardPreset;
  widgets: WidgetConfig[];
};

type DashboardContextType = {
  settings: DashboardSettings;
  updatePreset: (preset: DashboardPreset) => void;
  toggleWidget: (widgetId: WidgetType) => void;
  reorderWidgets: (widgetIds: WidgetType[]) => void;
  resetToDefault: () => void;
};

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

const defaultWidgets: WidgetConfig[] = [
  { id: "kpi", enabled: true, order: 0 },
  { id: "modules", enabled: true, order: 1 },
  { id: "revenue-chart", enabled: true, order: 2 },
  { id: "activity-feed", enabled: true, order: 3 },
  { id: "snapshot", enabled: true, order: 4 },
];

const presetConfigs: Record<DashboardPreset, WidgetConfig[]> = {
  owner: [
    { id: "kpi", enabled: true, order: 0 },
    { id: "revenue-chart", enabled: true, order: 1 },
    { id: "modules", enabled: true, order: 2 },
    { id: "snapshot", enabled: true, order: 3 },
    { id: "activity-feed", enabled: true, order: 4 },
  ],
  manager: [
    { id: "modules", enabled: true, order: 0 },
    { id: "kpi", enabled: true, order: 1 },
    { id: "snapshot", enabled: true, order: 2 },
    { id: "activity-feed", enabled: true, order: 3 },
    { id: "revenue-chart", enabled: false, order: 4 },
  ],
  cashier: [
    { id: "modules", enabled: true, order: 0 },
    { id: "kpi", enabled: true, order: 1 },
    { id: "snapshot", enabled: false, order: 2 },
    { id: "activity-feed", enabled: false, order: 3 },
    { id: "revenue-chart", enabled: false, order: 4 },
  ],
  custom: defaultWidgets,
};

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>({
    preset: "owner",
    widgets: defaultWidgets,
  });

  useEffect(() => {
    const saved = localStorage.getItem("toko-pos:dashboard-settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load dashboard settings", e);
      }
    }
  }, []);

  const saveSettings = (newSettings: DashboardSettings) => {
    setSettings(newSettings);
    localStorage.setItem(
      "toko-pos:dashboard-settings",
      JSON.stringify(newSettings),
    );
  };

  const updatePreset = (preset: DashboardPreset) => {
    saveSettings({
      preset,
      widgets: presetConfigs[preset],
    });
  };

  const toggleWidget = (widgetId: WidgetType) => {
    const newWidgets = settings.widgets.map((w) =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w,
    );
    saveSettings({
      preset: "custom",
      widgets: newWidgets,
    });
  };

  const reorderWidgets = (widgetIds: WidgetType[]) => {
    const newWidgets = widgetIds.map((id, index) => {
      const widget = settings.widgets.find((w) => w.id === id);
      return widget ? { ...widget, order: index } : { id, enabled: true, order: index };
    });
    saveSettings({
      preset: "custom",
      widgets: newWidgets,
    });
  };

  const resetToDefault = () => {
    saveSettings({
      preset: "owner",
      widgets: presetConfigs.owner,
    });
  };

  return (
    <DashboardContext.Provider
      value={{
        settings,
        updatePreset,
        toggleWidget,
        reorderWidgets,
        resetToDefault,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}
