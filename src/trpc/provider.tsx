"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { httpBatchLink } from "@trpc/client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import superjson from "superjson";

import { startMockMode } from "@/lib/mock-mode";
import { api } from "@/trpc/client";

export const TRPCReactProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            retryDelay: 1000,
            staleTime: 30000,
            networkMode: "always",
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          async fetch(url, options) {
            console.log("🌐 tRPC Request:", url);

            try {
              const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(30000), // 30 second timeout
              });

              console.log("📡 tRPC Response received:", {
                status: response.status,
                ok: response.ok,
                url: response.url,
                headers: {
                  contentType: response.headers.get("content-type"),
                  contentLength: response.headers.get("content-length"),
                },
              });

              // Clone response to read body for debugging
              const clonedResponse = response.clone();

              // Try to read response body
              try {
                const text = await clonedResponse.text();
                console.log("📦 Response body length:", text.length);
                console.log("📦 Response preview:", text.substring(0, 200));

                // Try to parse as JSON
                try {
                  const json = JSON.parse(text);
                  console.log("✅ Response is valid JSON");
                  console.log("📊 Parsed data structure:", {
                    isArray: Array.isArray(json),
                    length: Array.isArray(json) ? json.length : undefined,
                    firstItem: Array.isArray(json)
                      ? Object.keys(json[0] || {})
                      : Object.keys(json),
                  });
                } catch (jsonError) {
                  console.error("❌ Response is NOT valid JSON!", jsonError);
                }
              } catch (readError) {
                console.error("❌ Could not read response body:", readError);
              }

              return response;
            } catch (error) {
              console.error("❌ tRPC Fetch Error:", {
                error,
                message: error instanceof Error ? error.message : String(error),
                name: error instanceof Error ? error.name : typeof error,
              });
              throw error;
            }
          },
        }),
      ],
    }),
  );

  const pathname = usePathname();

  useEffect(() => {
    void startMockMode();
  }, [pathname]);

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom"
          buttonPosition="bottom-right"
        />
      </QueryClientProvider>
    </api.Provider>
  );
};
