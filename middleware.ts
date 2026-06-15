/**
 * Middleware lớp 1: chặn nhanh route bảo vệ khi CHƯA có cookie session.
 * Gate xác thực/role authoritative vẫn ở requireUser/requireAdmin (đọc DB) trong
 * từng trang/Server Action — middleware chỉ giảm tải, không thay thế.
 * Cố ý KHÔNG import lib/auth (tránh kéo db/bcrypt vào edge runtime).
 */
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/forgot",
  "/reset-password",
  "/api/auth",
];

function hasSession(req: NextRequest): boolean {
  return (
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Cho qua file tĩnh có đuôi mở rộng (vd /logo.png, /robots.txt) — tránh
  // redirect ảnh public về /login (next/image fetch nội bộ không kèm cookie).
  if (
    pathname === "/" ||
    /\.[^/]+$/.test(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }
  if (!hasSession(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Bỏ qua static assets + ảnh + mọi file có đuôi mở rộng (vd .png).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sounds|lottie|.*\\..*).*)"],
};
