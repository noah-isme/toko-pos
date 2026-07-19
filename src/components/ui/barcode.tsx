"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

import { cn } from "@/lib/utils";

type BarcodeFormat =
  | "CODE128"
  | "CODE39"
  | "EAN13"
  | "EAN8"
  | "UPC"
  | "ITF14"
  | "MSI"
  | "pharmacode"
  | "codabar";

type BarcodeDisplayValue = string | number;

type BarcodeRendererProps = {
  value: BarcodeDisplayValue;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
  className?: string;
  onError?: (error: Error) => void;
};

const DEFAULTS = {
  format: "CODE128" as BarcodeFormat,
  width: 2,
  height: 80,
  displayValue: true,
  fontSize: 16,
  margin: 8,
  background: "#ffffff",
  lineColor: "#000000",
};

/**
 * Renders a 1D barcode from a value using JsBarcode. Defaults to Code128,
 * which accepts arbitrary ASCII (alphanumeric) — suitable for SKU/barcode
 * strings produced by the generator. Other formats (EAN-13, UPC, etc.) are
 * opt-in via the `format` prop.
 */
export function BarcodeRenderer({
  value,
  format = DEFAULTS.format,
  width = DEFAULTS.width,
  height = DEFAULTS.height,
  displayValue = DEFAULTS.displayValue,
  fontSize = DEFAULTS.fontSize,
  margin = DEFAULTS.margin,
  background = DEFAULTS.background,
  lineColor = DEFAULTS.lineColor,
  className,
  onError,
}: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const renderedValue = String(value ?? "");
    if (!renderedValue) {
      setError("Nilai barcode kosong.");
      return;
    }

    try {
      JsBarcode(svgRef.current, renderedValue, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        margin,
        background,
        lineColor,
      });
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal membuat barcode.";
      setError(message);
      onError?.(e instanceof Error ? e : new Error(message));
    }
  }, [
    value,
    format,
    width,
    height,
    displayValue,
    fontSize,
    margin,
    background,
    lineColor,
    onError,
  ]);

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-4 text-xs text-destructive",
          className,
        )}
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className={cn("h-auto w-full max-w-full", className)}
      role="img"
      aria-label={`Barcode ${String(value ?? "")}`}
    />
  );
}

/**
 * Generate a Code128-compatible code for a product. Uses the product name
 * slug + a short timestamp-based suffix so newly created products get a
 * scannable code even before the user sets a manual barcode.
 */
export const generateProductCode = (input: {
  name?: string;
  sku?: string;
}): string => {
  const base = (input.sku || input.name || "PROD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8)
    .padEnd(4, "0");
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${base}${suffix}`;
};
