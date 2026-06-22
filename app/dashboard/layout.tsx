import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-8 md:py-8">
      <div className="grid gap-5 md:grid-cols-[280px_1fr] xl:gap-6">
        <Sidebar />
        <main className="animate-float-in min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
