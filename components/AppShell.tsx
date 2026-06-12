"use client";

/**
 * Khung điều hướng chung (port từ mockups/index.html):
 *  - Desktop: sidebar cố định bên trái + nút Đăng xuất.
 *  - Mobile: thanh trên cùng có logo + nút ☰ mở/đóng menu thả xuống.
 * Tự ẩn trên trang công khai (/login, /forgot, /reset-password, "/") hoặc khi
 * chưa đăng nhập — khi đó chỉ render children (giữ nguyên layout full-bleed).
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { NAV_ICONS, type NavIconName } from "@/components/NavIcons";

type NavItem = { href: string; icon: NavIconName; label: string };

const BASE_NAV: NavItem[] = [
  { href: "/dashboard", icon: "home", label: "Trang chủ" },
  { href: "/library", icon: "library", label: "Thư viện" },
  { href: "/import", icon: "add", label: "Thêm tài liệu" },
  { href: "/cards", icon: "cards", label: "Thẻ của tôi" },
  { href: "/review", icon: "flame", label: "Ôn tập" },
  { href: "/stats", icon: "chart", label: "Thống kê" },
  { href: "/settings", icon: "gear", label: "Cài đặt" },
  { href: "/change-password", icon: "lock", label: "Đổi mật khẩu" },
];

const ADMIN_ITEM: NavItem = { href: "/admin", icon: "shield", label: "Quản trị" };

// Tiền tố route công khai (không có nav). "/" xử lý riêng vì cần khớp chính xác.
const PUBLIC_PREFIXES = ["/login", "/forgot", "/reset-password"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({
  isLoggedIn,
  isAdmin,
  streak = 0,
  xp = 0,
  children,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  streak?: number;
  xp?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const hideNav =
    !isLoggedIn ||
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (hideNav) return <>{children}</>;

  const items = isAdmin ? [...BASE_NAV, ADMIN_ITEM] : BASE_NAV;

  const navLink = (it: NavItem) => {
    const active = isActive(pathname, it.href);
    const Icon = NAV_ICONS[it.icon];
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={() => setMenuOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-extrabold uppercase tracking-wide transition-colors",
          active
            ? "border-[#84D8FF] bg-[#DDF4FF] text-info-dark"
            : "border-transparent text-ink hover:bg-[#F2F2F2]",
        )}
      >
        <span className="grid w-8 shrink-0 place-items-center transition-transform duration-150 group-hover:scale-110 group-active:scale-90">
          <Icon />
        </span>
        <span className="leading-tight">{it.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-1">
      {/* Sidebar — desktop */}
      {/* data-app-chrome: màn ôn tập (overlay phủ kín) set inert lên các khối
          này để Tab/screen reader không lọt vào nav vô hình phía sau. */}
      <aside
        data-app-chrome
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 border-r-2 border-[#EEEEEE] bg-white p-4 md:flex"
      >
        <Link
          href="/dashboard"
          className="mb-2 flex items-center gap-2 px-2 py-3"
        >
          <span className="text-3xl">🦉</span>
          <span className="text-2xl font-extrabold text-brand">WorkLingo</span>
        </Link>
        {items.map(navLink)}
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-around rounded-2xl bg-[#F7F7F7] px-2 py-3 font-extrabold">
            <span className="text-orange-500">🔥 {streak}</span>
            <span className="text-xp">⭐ {xp}</span>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-2xl py-2 text-sm font-bold text-ink-muted transition-colors hover:text-danger"
          >
            ↩︎ Đăng xuất
          </button>
        </div>
      </aside>

      {/* Khu vực nội dung */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thanh trên cùng + menu thả xuống — mobile */}
        <div
          data-app-chrome
          className="sticky top-0 z-30 border-b-2 border-[#EEE] bg-white md:hidden"
        >
          <div className="flex items-center justify-between px-4 py-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🦉</span>
              <span className="text-lg font-extrabold text-brand">
                WorkLingo
              </span>
            </Link>
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl border-2 border-[#EEE] px-3 py-1.5 text-xl font-extrabold text-ink"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
          {menuOpen && (
            <div className="flex flex-col gap-1 border-t-2 border-[#F2F2F2] p-3">
              <div className="mb-1 flex items-center justify-around rounded-2xl bg-[#F7F7F7] px-2 py-2 font-extrabold">
                <span className="text-orange-500">🔥 {streak}</span>
                <span className="text-xp">⭐ {xp}</span>
              </div>
              {items.map(navLink)}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-2xl px-4 py-3 text-left font-bold text-danger"
              >
                ↩︎ Đăng xuất
              </button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default AppShell;
