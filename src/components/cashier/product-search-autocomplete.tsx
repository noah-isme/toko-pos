"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/client";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  categoryName: string | null;
};

type ProductSearchAutocompleteProps = {
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export function ProductSearchAutocomplete({
  onProductSelect,
  placeholder = "Ketik nama produk, SKU, atau scan barcode",
  disabled = false,
  autoFocus = true,
}: ProductSearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search query with debounce
  const searchQuery = api.products.searchProducts.useQuery(
    { query: query.trim(), limit: 10 },
    {
      enabled: query.trim().length >= 2,
      staleTime: 30_000, // Cache for 30 seconds
    },
  );

  const products = searchQuery.data ?? [];
  const isLoading = searchQuery.isLoading;

  // Show dropdown when there are results and input is focused
  useEffect(() => {
    if (query.trim().length >= 2 && products.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query, products.length]);

  // Reset selected index when products change
  useEffect(() => {
    setSelectedIndex(0);
  }, [products]);

  // Focus input on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (product: Product) => {
      onProductSelect(product);
      setQuery("");
      setIsOpen(false);
      setSelectedIndex(0);
      // Keep focus on input for next search
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    },
    [onProductSelect],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || products.length === 0) {
      // If dropdown not open and user presses Enter, try barcode lookup
      if (event.key === "Enter" && query.trim()) {
        // Let parent handle barcode lookup for non-autocomplete results
        return;
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < products.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        event.preventDefault();
        if (products[selectedIndex]) {
          handleSelect(products[selectedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);

    // If user cleared input, close dropdown
    if (!value.trim()) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 pl-10 pr-10 text-base"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && products.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-[400px] w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          <div className="p-2">
            {products.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm leading-none">
                      {product.name}
                    </span>
                    <span className="shrink-0 font-bold text-sm text-primary">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>SKU: {product.sku}</span>
                    {product.barcode && (
                      <>
                        <span>•</span>
                        <span>Barcode: {product.barcode}</span>
                      </>
                    )}
                    {product.categoryName && (
                      <>
                        <span>•</span>
                        <span>{product.categoryName}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="border-t border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>
                Gunakan ↑ ↓ untuk navigasi, Enter untuk pilih
              </span>
              <span>ESC untuk tutup</span>
            </div>
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && !isLoading && query.trim().length >= 2 && products.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover p-4 text-center shadow-lg"
        >
          <p className="text-sm text-muted-foreground">
            Tidak ada produk ditemukan untuk &quot;{query}&quot;
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coba kata kunci lain atau scan barcode
          </p>
        </div>
      )}

      {/* Loading hint */}
      {query.trim().length > 0 && query.trim().length < 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover p-3 text-center shadow-lg">
          <p className="text-xs text-muted-foreground">
            Ketik minimal 2 huruf untuk mencari produk
          </p>
        </div>
      )}
    </div>
  );
}
