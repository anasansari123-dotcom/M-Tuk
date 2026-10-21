import {
  Activity,
  BarChart3,
  Bell,
  Car,
  CreditCard,
  Handshake,
  Inbox,
  LayoutDashboard,
  Map,
  ScrollText,
  Settings,
  Users,
  Route,
} from "lucide-react";

export const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/live-map", label: "Live map", icon: Map },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/rides", label: "Rides", icon: Route },
      { href: "/drivers", label: "Drivers", icon: Car },
      { href: "/partners", label: "Partners", icon: Handshake },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/messages", label: "Messages", icon: Inbox },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/system-status", label: "System status", icon: Activity },
      { href: "/audit-logs", label: "Audit log", icon: ScrollText },
    ],
  },
];
