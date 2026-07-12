"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Smartphone, LayoutDashboard, Receipt, Wallet, Store, Settings, LogOut, Menu, X,
  Package, Users, CalendarCheck, Banknote, FileText, ArrowLeftRight, PiggyBank, HandCoins,
  BarChart3, CalendarDays, TrendingUp, LineChart, Database, ChevronsLeft, ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

const NAV_GROUPS = [
  {
    label: "Ringkasan",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Analisis Transaksi",
    items: [
      { href: "/analisis", label: "Ringkasan Owner", icon: BarChart3 },
      { href: "/analisis/harian", label: "Analisis Harian", icon: CalendarDays },
      { href: "/analisis/mingguan-bulanan", label: "Mingguan & Bulanan", icon: TrendingUp },
      { href: "/analisis/forecast", label: "Forecast", icon: LineChart },
      { href: "/analisis/data", label: "Data & Validasi", icon: Database },
    ],
  },
  {
    label: "Operasional",
    items: [
      { href: "/transaksi", label: "Transaksi Harian", icon: Receipt },
      { href: "/biaya", label: "Biaya", icon: Wallet },
      { href: "/stock", label: "Stock", icon: Package },
    ],
  },
  {
    label: "Kepegawaian",
    items: [
      { href: "/karyawan", label: "Karyawan", icon: Users },
      { href: "/karyawan/absensi", label: "Absensi", icon: CalendarCheck },
      { href: "/karyawan/kasbon", label: "Kasbon", icon: Banknote },
      { href: "/karyawan/payroll", label: "Payroll", icon: FileText },
      { href: "/karyawan/payroll/cabang-join", label: "Cabang Join (Gaji)", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/modal", label: "Modal / Capex", icon: PiggyBank },
      { href: "/modal/piutang", label: "Piutang", icon: HandCoins },
      { href: "/cabang", label: "Cabang", icon: Store },
      { href: "/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={
          (active
            ? "flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1.5 text-sm font-medium text-blue-700"
            : "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100") +
          (collapsed ? " justify-center" : "") +
          " focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        }
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
        {!collapsed && label}
      </Link>
      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          {label}
        </span>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  collapsed = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <>
      <div className={`flex items-center gap-2 border-b border-neutral-200 py-4 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          <Smartphone className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-neutral-900">GEE CELL BRILink</p>
            <p className="text-xs text-neutral-500">Wilayah Ekek</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <div className="mx-1 border-t border-neutral-200" role="separator" aria-label={group.label} />
            ) : (
              <p className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-600">{group.label}</p>
            )}
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === item.href}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <form action={logoutAction} className="border-t border-neutral-200 p-3">
        <button
          type="submit"
          title={collapsed ? "Keluar" : undefined}
          className={
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1" +
            (collapsed ? " justify-center" : "")
          }
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
          {!collapsed && "Keluar"}
        </button>
      </form>
    </>
  );
}

function ToggleButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }): ReactNode {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
      className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {collapsed ? <ChevronsRight className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronsLeft className="h-3.5 w-3.5" strokeWidth={2} />}
    </button>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Default expanded di server & first client render (sama persis) supaya tidak
  // ada hydration mismatch - preferensi tersimpan dibaca di useEffect setelah
  // mount, jadi sempat ada 1 frame "expanded" sebelum flip ke collapsed kalau
  // itu pilihan user sebelumnya. Trade-off yang disengaja, bukan bug.
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    // Sengaja: localStorage cuma ada di client, baca+sync di sini (bukan lazy
    // initializer) supaya render pertama client selalu sama dengan server (no mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed, mounted]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu navigasi"
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600">
            <Smartphone className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-neutral-900">GEE CELL BRILink - Ekek</p>
        </div>
      </header>

      <aside
        className={
          "relative hidden shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 ease-in-out md:flex " +
          (collapsed ? "w-16" : "w-64")
        }
      >
        <ToggleButton collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <SidebarContent pathname={pathname} collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu navigasi"
              className="absolute right-3 top-3 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
