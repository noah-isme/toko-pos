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
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: false,
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
            try {
              const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(30000),
              });
              return response;
            } catch (error) {
              console.error("❌ tRPC Fetch Error:", error instanceof Error ? error.message : String(error));
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
