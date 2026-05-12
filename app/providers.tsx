"use client";

import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  }));

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}
