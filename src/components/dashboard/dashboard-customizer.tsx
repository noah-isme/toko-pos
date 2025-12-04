"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff } from "lucide-react";
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
import { useDashboard, WidgetType } from "@/contexts/dashboard-context";

type WidgetItem = {
  id: WidgetType;
  label: string;
  description: string;
};

const widgetLabels: WidgetItem[] = [
  {
    id: "kpi",
    label: "KPI Cards",
    description: "Penjualan, Transaksi, Total Item",
  },
  {
    id: "modules",
    label: "Main Modules",
    description: "Kasir, Produk, Laporan",
  },
  {
    id: "revenue-chart",
    label: "Revenue Chart",
    description: "Trend penjualan 7 hari",
  },
  {
    id: "activity-feed",
    label: "Activity Feed",
    description: "Aktivitas terbaru",
  },
  {
    id: "snapshot",
    label: "Operational Snapshot",
    description: "Shift, Stok, Transaksi",
  },
];

function SortableWidgetItem({
  widget,
  enabled,
  onToggle,
}: {
  widget: WidgetItem;
  enabled: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{widget.label}</p>
        <p className="text-xs text-gray-500">{widget.description}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={enabled ? "text-emerald-600" : "text-gray-400"}
      >
        {enabled ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function DashboardCustomizer() {
  const { settings, toggleWidget, reorderWidgets } = useDashboard();
  const [items, setItems] = useState(
    settings.widgets
      .sort((a, b) => a.order - b.order)
      .map((w) => w.id),
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as WidgetType);
        const newIndex = items.indexOf(over.id as WidgetType);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        reorderWidgets(newOrder);
        return newOrder;
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Drag to reorder widgets, click eye icon to show/hide
          </DialogDescription>
        </DialogHeader>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {items.map((widgetId) => {
                const widget = widgetLabels.find((w) => w.id === widgetId);
                const config = settings.widgets.find((w) => w.id === widgetId);
                if (!widget || !config) return null;

                return (
                  <SortableWidgetItem
                    key={widgetId}
                    widget={widget}
                    enabled={config.enabled}
                    onToggle={() => toggleWidget(widgetId)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </DialogContent>
    </Dialog>
  );
}
