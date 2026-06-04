import { createContext, useContext, useState, type ReactNode } from "react";
import type { UserRoleEnum } from "@/integrations/supabase/types";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRoleEnum;
  department: string;
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

// Demo user — ใช้ชั่วคราวระหว่างทดสอบระบบ
const DEMO_USER: User = {
  id: "demo-admin",
  username: "admin",
  displayName: "ผู้ดูแลระบบ",
  role: "SUPER_ADMIN",
  department: "IT",
};

const Ctx = createContext<AuthCtx>({
  user: DEMO_USER,
  ready: true,
  login: async () => ({ ok: true }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User>(DEMO_USER);

  const login = async () => ({ ok: true });
  const logout = async () => {};

  return (
    <Ctx.Provider value={{ user, ready: true, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
