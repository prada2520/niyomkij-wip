import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, PackagePlus, Boxes, History, FileBarChart, Settings, LogOut } from "lucide-react";
import logo from "@/assets/logo-niyomkij.jpg";
import { useAuth } from "@/lib/auth";
import { useEffect, type ReactNode } from "react";
import type { Role } from "@/lib/wip-data";

const MENU: { to: string; label: string; icon: any; roles: Role[] }[] = [
  { to: "/dashboard", label: "ภาพรวมระบบ", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "OPERATOR", "EXECUTIVE"] },
  { to: "/receiving", label: "รับเข้างาน", icon: PackagePlus, roles: ["SUPER_ADMIN", "OPERATOR"] },
  { to: "/tracking", label: "ติดตามงาน WIP", icon: Boxes, roles: ["SUPER_ADMIN", "OPERATOR", "EXECUTIVE"] },
  { to: "/movements", label: "ประวัติการเคลื่อนย้าย", icon: History, roles: ["SUPER_ADMIN", "OPERATOR", "EXECUTIVE"] },
  { to: "/reports", label: "รายงาน", icon: FileBarChart, roles: ["SUPER_ADMIN", "OPERATOR", "EXECUTIVE"] },
  { to: "/settings", label: "ตั้งค่าระบบ", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login" });
  }, [ready, user, navigate]);

  if (!ready || !user) return null;

  const items = MENU.filter(m => m.roles.includes(user.role));

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="no-print w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border bg-white">
          <img src={logo} alt="โรงพิมพ์ นิยมกิจ 1994" className="w-full h-auto object-contain" />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map(item => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"
                }`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs opacity-70 mb-1">เข้าสู่ระบบในชื่อ</div>
          <div className="text-sm font-medium">{user.displayName}</div>
          <div className="text-xs opacity-70 mb-3">{user.role === "SUPER_ADMIN" ? "ผู้ดูแลระบบ" : user.role === "OPERATOR" ? "พนักงานคลัง" : "ผู้บริหาร"}</div>
          <button onClick={async () => { await logout(); navigate({ to: "/login" }); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/80 text-sm">
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  );
}
