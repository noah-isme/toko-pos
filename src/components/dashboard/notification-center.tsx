"use client";

import { useState } from "react";
import { Bell, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
};

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Low Stock Alert",
    message: "5 produk hampir habis. Segera lakukan restocking.",
    type: "warning",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    read: false,
    actionLabel: "Lihat Produk",
    actionHref: "/management/stock",
  },
  {
    id: "2",
    title: "Shift Aktif",
    message: "Shift kasir telah dibuka sejak 08:00",
    type: "info",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: true,
  },
  {
    id: "3",
    title: "Target Tercapai",
    message: "Penjualan hari ini sudah mencapai target!",
    type: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    read: true,
  },
];

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getTypeColor = (type: Notification["type"]) => {
    const colors = {
      info: "bg-blue-50 text-blue-700 border-blue-200",
      warning: "bg-amber-50 text-amber-700 border-amber-200",
      success: "bg-emerald-50 text-emerald-700 border-emerald-200",
      error: "bg-red-50 text-red-700 border-red-200",
    };
    return colors[type];
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-96 max-w-[calc(100vw-2rem)]"
            >
              <Card className="shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} baru
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Tandai semua
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Tidak ada notifikasi
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                            !notification.read ? "bg-blue-50/50" : ""
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            {!notification.read && (
                              <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(
                                    notification.type,
                                  )}`}
                                >
                                  {notification.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(notification.timestamp, {
                                    addSuffix: true,
                                    locale: id,
                                  })}
                                </p>
                                {notification.actionLabel && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    {notification.actionLabel} →
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="border-t px-4 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-600"
                    >
                      Lihat semua notifikasi
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
