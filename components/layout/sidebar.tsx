"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard/voice-studio", label: "Voice Studio", available: true },
  { href: "/dashboard/script-studio", label: "Script Studio", available: false },
  { href: "/dashboard/podcast-studio", label: "Podcast Studio", available: false },
  { href: "/dashboard/video-studio", label: "Video Studio", available: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="panel animate-float-in rounded-3xl bg-gradient-to-b from-[#061230] to-[#030814] p-4 text-slate-200">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 font-bold text-slate-900">V</div>
        <div>
          <p className="display-font text-base font-semibold">Velynxia</p>
          <p className="text-xs text-cyan-200/80">AI Media</p>
        </div>
      </div>

      <nav className="space-y-1.5">
        <Link href="/dashboard" className="group block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">
          Dashboard
        </Link>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group block rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.35)]"
                  : item.available
                    ? "text-slate-300 hover:bg-white/10 hover:text-white"
                    : "text-slate-500"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : item.available ? "bg-cyan-300/70" : "bg-slate-600"}`} />
                  {item.label}
                </span>
                <span className={`text-[10px] ${active ? "text-white/85" : "text-slate-500"}`}>
                  {item.available ? "Open" : "Soon"}
                </span>
              </span>
            </Link>
          );
        })}

        <div className="mt-3 border-t border-white/10 pt-3">
          <button className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">History</button>
          <button className="mt-1 block w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Settings</button>
        </div>
      </nav>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-cyan-200/80">AI Credits</p>
        <p className="mt-3 text-3xl font-semibold text-white">8,450</p>
        <p className="text-xs text-slate-400">/ 20,000</p>
        <button className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white">Upgrade Plan</button>
      </div>
    </aside>
  );
}
