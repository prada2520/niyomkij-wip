import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "เข้าสู่ระบบ" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/dashboard" }); }, []);
  return null;
}
