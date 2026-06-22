"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: "#ffffff",
          color: "#111827",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(17, 24, 39, 0.08)",
        },
      }} />
    </SessionProvider>
  );
}
