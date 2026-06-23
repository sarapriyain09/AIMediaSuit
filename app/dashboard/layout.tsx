import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { authOptions } from "@/lib/auth/options";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-8 md:py-8">
      <div className="grid gap-5 md:grid-cols-[280px_1fr] xl:gap-6">
        <Sidebar />
        <main className="animate-float-in min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
