"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchResult = {
  id: string;
  type: "product" | "transaction" | "page";
  title: string;
  subtitle?: string;
  href: string;
};

const quickLinks = [
  { title: "Kasir", href: "/cashier", type: "page" as const },
  { title: "Produk", href: "/management/products", type: "page" as const },
  { title: "Laporan Harian", href: "/reports/daily", type: "page" as const },
  { title: "Stok", href: "/management/stock", type: "page" as const },
];

export function QuickSearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("toko-pos:recent-searches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search logic (simplified - in real app would call API)
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const filtered = quickLinks
      .filter((link) =>
        link.title.toLowerCase().includes(query.toLowerCase()),
      )
      .map((link) => ({
        id: link.href,
        ...link,
      }));

    setResults(filtered);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const updated = [result.title, ...recentSearches.filter((s) => s !== result.title)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("toko-pos:recent-searches", JSON.stringify(updated));

    router.push(result.href);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative w-64 justify-start text-sm text-gray-500 hover:text-gray-900"
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Cari...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/4 z-50 w-full max-w-2xl -translate-x-1/2"
            >
              <Card className="overflow-hidden shadow-2xl">
                {/* Search Input */}
                <div className="flex items-center border-b px-4">
                  <Search className="h-5 w-5 text-gray-400" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari produk, transaksi, atau halaman..."
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto p-2">
                  {query === "" ? (
                    // Show recent searches or quick links
                    <div className="space-y-2">
                      {recentSearches.length > 0 && (
                        <div className="px-2 py-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Pencarian Terkini
                          </p>
                          {recentSearches.slice(0, 3).map((search, i) => (
                            <button
                              key={i}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                              onClick={() => setQuery(search)}
                            >
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{search}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="px-2 py-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Link Cepat
                        </p>
                        {quickLinks.map((link) => (
                          <button
                            key={link.href}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                            onClick={() => handleSelect({ id: link.href, ...link })}
                          >
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{link.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : results.length > 0 ? (
                    // Show search results
                    <div className="space-y-1">
                      {results.map((result) => (
                        <button
                          key={result.id}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                          onClick={() => handleSelect(result)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    // No results
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-500">
                        Tidak ada hasil untuk "{query}"
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
