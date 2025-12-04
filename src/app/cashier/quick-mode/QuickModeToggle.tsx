"use client";

import { useState, useEffect } from "react";
import { Zap, LayoutGrid } from "lucide-react";

interface QuickModeToggleProps {
  isQuickMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export function QuickModeToggle({ isQuickMode, onToggle }: QuickModeToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    onToggle(!isQuickMode);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
      {/* Normal Mode Button */}
      <button
        onClick={() => !isQuickMode || handleToggle()}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${
            !isQuickMode
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }
          ${isAnimating ? "scale-95" : ""}
        `}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Normal</span>
      </button>

      {/* Quick Mode Button */}
      <button
        onClick={() => isQuickMode || handleToggle()}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 relative
          ${
            isQuickMode
              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }
          ${isAnimating ? "scale-95" : ""}
        `}
      >
        <Zap className={`w-4 h-4 ${isQuickMode ? "animate-pulse" : ""}`} />
        <span className="hidden sm:inline">Quick</span>
        {isQuickMode && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Mode Label (Desktop only) */}
      <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
        <span className="text-xs text-gray-500">
          {isQuickMode ? "Mode Cepat" : "Mode Normal"}
        </span>
      </div>
    </div>
  );
}

// Hook for managing Quick Mode state with localStorage persistence
export function useQuickMode() {
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cashier-quick-mode");
      if (saved !== null) {
        setIsQuickMode(saved === "true");
      }
    } catch (error) {
      console.error("Failed to load quick mode preference:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage when changed
  const toggleQuickMode = (enabled: boolean) => {
    setIsQuickMode(enabled);
    try {
      localStorage.setItem("cashier-quick-mode", String(enabled));
    } catch (error) {
      console.error("Failed to save quick mode preference:", error);
    }
  };

  return {
    isQuickMode,
    isLoaded,
    toggleQuickMode,
  };
}
