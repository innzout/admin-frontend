"use client";

import { ApiError } from "@/lib/api";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        // A server or network failure on any screen gets one visible notice
        // (same id, so a page of failing queries shows a single toast). 401
        // already redirects to login; 403/404 are answers the screen shows.
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status < 500) return;
            toast.error("Couldn't load some data. Check your connection and try again.", { id: "query-failed" });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // One retry for network blips and server errors. A 4xx is the
            // server's final answer (forbidden, not found), so retrying only
            // keeps loading placeholders on screen longer.
            retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={client}>
        {children}
        <Toaster richColors position="top-right" closeButton duration={6000} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
