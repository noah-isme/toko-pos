import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Clock,
  Database,
  LayoutDashboard,
  LineChart,
  Package,
  Percent,
  Receipt,
  ScrollText,
  Settings,
  Store,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When set, only these roles see the entry. */
  roles?: string[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const ADMINS = ["OWNER", "ADMIN"];

/**
 * Single source of truth for primary navigation, shared by the desktop sidebar
 * and the mobile drawer. Grouped because the app has 17 destinations — the old
 * top bar surfaced only four of them and left the rest reachable exclusively
 * through in-page links.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Utama",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/dashboard/owner",
        label: "Dashboard Owner",
        icon: TrendingUp,
        roles: ADMINS,
      },
      { href: "/cashier", label: "Kasir", icon: Receipt },
    ],
  },
  {
    label: "Produk & Stok",
    items: [
      { href: "/management/products", label: "Produk", icon: Package },
      { href: "/management/stock", label: "Stok", icon: Boxes },
      {
        href: "/management/stock-movement",
        label: "Pergerakan Stok",
        icon: ArrowLeftRight,
      },
      {
        href: "/management/stock-opname",
        label: "Stock Opname",
        icon: ClipboardCheck,
        roles: ADMINS,
      },
      {
        href: "/management/stock-transfer",
        label: "Transfer Outlet",
        icon: Store,
      },
      {
        href: "/management/receiving",
        label: "Penerimaan Barang",
        icon: Truck,
        roles: ADMINS,
      },
    ],
  },
  {
    label: "Penjualan",
    items: [
      { href: "/reports/daily", label: "Laporan Harian", icon: BarChart3 },
      {
        href: "/management/reports",
        label: "Laporan & Analitik",
        icon: LineChart,
      },
      { href: "/management/promotions", label: "Promosi", icon: Percent },
    ],
  },
  {
    label: "Administrasi",
    items: [
      {
        href: "/management/users",
        label: "Pengguna",
        icon: Users,
        roles: ADMINS,
      },
      {
        href: "/management/master-data",
        label: "Master Data",
        icon: Database,
        roles: ADMINS,
      },
      {
        href: "/management/shift-history",
        label: "Riwayat Shift",
        icon: Clock,
        roles: ADMINS,
      },
      {
        href: "/management/audit-log",
        label: "Log Audit",
        icon: ScrollText,
        roles: ADMINS,
      },
      { href: "/management/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];

/** Longest-prefix match so `/management/stock-movement` does not light up `/management/stock`. */
export function isNavItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function visibleGroups(role: string | undefined): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (role ? item.roles.includes(role) : false),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
