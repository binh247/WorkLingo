/**
 * Bộ icon SVG cho menu — tự vẽ theo phong cách "game hoá" (phẳng, đậm,
 * bo tròn, nhiều màu trên nền tươi). Asset gốc của Bloóm, không dùng
 * tài nguyên của bên thứ ba.
 */
import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    viewBox: "0 0 32 32",
    width: 28,
    height: 28,
    fill: "none",
    "aria-hidden": true,
    ...props,
  };
}

/** Trang chủ — ngôi nhà mái đỏ thân cam, cửa trắng. */
export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M16 4.5 4.5 14.2a1.6 1.6 0 0 0-.5 1.2v10a2.6 2.6 0 0 0 2.6 2.6h18.8a2.6 2.6 0 0 0 2.6-2.6v-10a1.6 1.6 0 0 0-.5-1.2L16 4.5Z"
        fill="#FF9600"
      />
      <path
        d="M15 3.3a1.7 1.7 0 0 1 2 0l11 9.2a1.5 1.5 0 0 1-1.9 2.4L16 6.6 5.9 14.9a1.5 1.5 0 1 1-1.9-2.4l11-9.2Z"
        fill="#FF4B4B"
      />
      <rect x="12.4" y="17" width="7.2" height="11" rx="2" fill="#fff" />
    </svg>
  );
}

/** Thư viện — hai quyển sách đứng + một quyển nghiêng. */
export function LibraryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="6" width="6.5" height="21" rx="1.8" fill="#1CB0F6" />
      <rect x="13" y="6" width="6.5" height="21" rx="1.8" fill="#58CC02" />
      <path
        d="m21.2 8.6 4.9-1.3a1.8 1.8 0 0 1 2.2 1.3l4 15.5-7 1.9-4.1-15.2a1.8 1.8 0 0 1 0-2.2Z"
        transform="translate(-3 0) scale(.92)"
        fill="#FFC800"
      />
      <rect x="6.6" y="9" width="3.3" height="2.4" rx="1.2" fill="#fff" />
      <rect x="14.6" y="9" width="3.3" height="2.4" rx="1.2" fill="#fff" />
    </svg>
  );
}

/** Thêm tài liệu — nút cộng xanh lá trên khối bo tròn. */
export function AddIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="24" height="24" rx="8" fill="#58CC02" />
      <rect x="14" y="9.5" width="4" height="13" rx="2" fill="#fff" />
      <rect x="9.5" y="14" width="13" height="4" rx="2" fill="#fff" />
    </svg>
  );
}

/** Thẻ của tôi — hai lá thẻ xếp chồng. */
export function CardsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect
        x="9.5"
        y="4.5"
        width="17"
        height="22"
        rx="3.5"
        transform="rotate(8 18 15.5)"
        fill="#84D8FF"
      />
      <rect x="5" y="6.5" width="17" height="22" rx="3.5" fill="#1CB0F6" />
      <rect x="8.5" y="11" width="10" height="3" rx="1.5" fill="#fff" />
      <rect x="8.5" y="16.5" width="6.5" height="3" rx="1.5" fill="#fff" />
    </svg>
  );
}

/** Ôn tập — ngọn lửa cam lõi vàng. */
export function FlameIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M16 3c1 4.4 3.4 6.6 5.9 9.1 2.3 2.3 4.1 5 4.1 8.2C26 26 21.5 29.5 16 29.5S6 26 6 20.3c0-4.4 3-7.3 5-9.3.6 1.3 1.3 2.2 2.3 3C13.5 9.7 14.6 6.4 16 3Z"
        fill="#FF9600"
      />
      <path
        d="M16 16c.9 1.9 2.4 3 2.4 5.5 0 2.8-1.9 4.8-4.4 4.8s-4.4-2-4.4-4.8c0-1.9 1-3.4 2.2-4.5.4.8.9 1.3 1.6 1.8.4-1.1 1.6-1.7 2.6-2.8Z"
        fill="#FFC800"
      />
    </svg>
  );
}

/** Thống kê — ba cột màu tăng dần. */
export function ChartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="17" width="6" height="11" rx="2.4" fill="#FFC800" />
      <rect x="13" y="11" width="6" height="17" rx="2.4" fill="#1CB0F6" />
      <rect x="21" y="5" width="6" height="23" rx="2.4" fill="#58CC02" />
    </svg>
  );
}

/** Cài đặt — bánh răng xám. */
export function GearIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M13.6 4.2a2 2 0 0 1 2-1.7h.8a2 2 0 0 1 2 1.7l.3 2a10 10 0 0 1 2.7 1.6l1.9-.8a2 2 0 0 1 2.5.9l.4.7a2 2 0 0 1-.5 2.6l-1.6 1.3a10 10 0 0 1 0 3.1l1.6 1.3a2 2 0 0 1 .5 2.6l-.4.7a2 2 0 0 1-2.5.9l-1.9-.8a10 10 0 0 1-2.7 1.6l-.3 2a2 2 0 0 1-2 1.7h-.8a2 2 0 0 1-2-1.7l-.3-2a10 10 0 0 1-2.7-1.6l-1.9.8a2 2 0 0 1-2.5-.9l-.4-.7a2 2 0 0 1 .5-2.6l1.6-1.3a10 10 0 0 1 0-3.1L6.3 11.2a2 2 0 0 1-.5-2.6l.4-.7a2 2 0 0 1 2.5-.9l1.9.8a10 10 0 0 1 2.7-1.6l.3-2Z"
        fill="#A6A6A6"
      />
      <circle cx="16" cy="16" r="4.6" fill="#fff" />
      <circle cx="16" cy="16" r="2.4" fill="#A6A6A6" />
    </svg>
  );
}

/** Đổi mật khẩu — ổ khoá vàng quai xám. */
export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M10 13v-3a6 6 0 0 1 12 0v3h-3.4v-3a2.6 2.6 0 0 0-5.2 0v3H10Z"
        fill="#A6A6A6"
      />
      <rect x="6.5" y="12.5" width="19" height="15.5" rx="4" fill="#FFC800" />
      <circle cx="16" cy="19" r="2.6" fill="#CB9600" />
      <rect x="14.7" y="19.5" width="2.6" height="4.6" rx="1.3" fill="#CB9600" />
    </svg>
  );
}

/** Quản trị — khiên xanh có dấu tích trắng. */
export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M16 3 5.5 7v8.3c0 6.4 4.4 11 10.5 13.7 6.1-2.7 10.5-7.3 10.5-13.7V7L16 3Z"
        fill="#1CB0F6"
      />
      <path
        d="m11 15.8 3.4 3.4 6.6-6.6"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Map tên → component để AppShell tra theo NavItem.icon. */
export const NAV_ICONS = {
  home: HomeIcon,
  library: LibraryIcon,
  add: AddIcon,
  cards: CardsIcon,
  flame: FlameIcon,
  chart: ChartIcon,
  gear: GearIcon,
  lock: LockIcon,
  shield: ShieldIcon,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
