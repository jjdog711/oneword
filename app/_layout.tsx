import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMidnightRollover } from "@/services/midnight";

const qc = new QueryClient();
export default function RootLayout() {
  useMidnightRollover();
  return (
    <QueryClientProvider client={qc}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}