"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// 全局默认配置：
// - staleTime: 30s（避免短时间重复请求）
// - retry: 2 次（网络抖动容忍）
// - refetchOnWindowFocus: 生产关闭（避免打断用户操作）
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 2,
        refetchOnWindowFocus: process.env.NODE_ENV !== "production",
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Suspense 边界内每次渲染稳定持有同一个 client
  const [queryClient] = useState<QueryClient>(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
