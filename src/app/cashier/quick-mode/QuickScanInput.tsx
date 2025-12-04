"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Barcode } from "lucide-react";

interface QuickScanInputProps {
  onProductSelect: (productId: string) => void;
  onBarcodeScanned?: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  enableBeep?: boolean;
  disabled?: boolean;
}

export function QuickScanInput({
  onProductSelect,
  onBarcodeScanned,
  placeholder = "Fokus: ketik atau scan barcode…",
  autoFocus = true,
  enableBeep = true,
  disabled = false,
}: QuickScanInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play beep sound
  const playBeep = useCallback(() => {
    if (enableBeep && typeof window !== "undefined") {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.1,
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.error("Failed to play beep:", error);
      }
    }
  }, [enableBeep]);

  // Auto-focus on mount and when disabled changes
  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // Global keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // ESC to clear
      if (e.key === "Escape" && isFocused) {
        e.preventDefault();
        setInputValue("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused]);

  // Handle input change with barcode detection
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Detect rapid input (barcode scanner)
    const now = Date.now();
    const timeDiff = now - lastScannedTime;

    // If input comes rapidly (< 100ms between chars), it's likely a barcode scanner
    if (timeDiff < 100 && value.length > 5) {
      setLastScannedTime(now);
    }
  };

  // Handle Enter key (manual or scanner)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Submit value (product search or barcode)
  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Play beep
    playBeep();

    // Check if it's a barcode (numeric, typically 8-13 digits)
    const isBarcode = /^\d{8,13}$/.test(trimmedValue);

    if (isBarcode && onBarcodeScanned) {
      onBarcodeScanned(trimmedValue);
    } else {
      // Treat as product ID or search term
      onProductSelect(trimmedValue);
    }

    // Clear input after successful scan
    setInputValue("");

    // Keep focus for next scan
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="relative">
      {/* Input Container */}
      <div
        className={`
          relative flex items-center gap-3 bg-white border-2 rounded-lg px-4 py-3 transition-all duration-150
          ${
            isFocused
              ? "border-orange-500 shadow-lg ring-4 ring-orange-500/20"
              : "border-gray-300 shadow-sm hover:border-gray-400"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {/* Icon */}
        <div className="flex items-center gap-2 text-gray-400">
          {isFocused ? (
            <Barcode className="w-5 h-5 text-orange-500 animate-pulse" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 text-base font-medium text-gray-900 placeholder-gray-400 bg-transparent outline-none disabled:cursor-not-allowed"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        {/* Clear Button */}
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue("");
              inputRef.current?.focus();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
            Ctrl+K
          </kbd>{" "}
          untuk fokus •{" "}
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
            ESC
          </kbd>{" "}
          untuk batal
        </span>
        {isFocused && (
          <span className="text-orange-600 font-medium animate-fade-in">
            ⚡ Siap scan
          </span>
        )}
      </div>

      {/* Visual Feedback Overlay (when scanning) */}
      {isFocused && inputValue.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-orange-500/5 rounded-lg animate-pulse"></div>
        </div>
      )}
    </div>
  );
}

// Re-export ref for parent components
export type QuickScanInputRef = HTMLInputElement;
