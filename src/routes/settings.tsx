import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/use-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Users, Building2, Database, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "ตั้งค่าระบบ" }] }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const s = useStore();
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at")
      .then(({ data }) => { if (data) setProfiles(data); })
      .finally(() => setLoadingProfiles(false));
  }, []);

  const refreshData = async () => {
    toast.loading("กำลังโหลดข้อมูลใหม่...");
    await Promise.all([s.fetchJobs(), s.fetchMovements(), s.fetchAuditLogs()]);
    toast.dismiss();
    toast.success("โหลดข้อมูลใหม่เรียบร้อย");
  };

  return (
    <AppLayout>
      <Toaster richColors position="top-right" />
      <div className="p-8 space-y-6 max-w-5xl">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-7 w-7 text-primary" /> ตั้งค่าระบบ
          </h1>
          <p className="text-muted-foreground mt-1">การจัดการระบบ — เฉพาะผู้ดูแลระบบเท่านั้น</p>
        </header>

        {/* User Table */}
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">จัดการผู้ใช้งาน (Supabase Profiles)</h2>
          </div>
          {loadingProfiles ? (
            <div className="py-8 text-center text-muted-foreground text-sm">กำลังโหลด...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-2 text-left">อีเมล / UUID</th>
                  <th className="px-4 py-2 text-left">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">บทบาท</th>
                  <th className="px-4 py-2 text-left">แผนก</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.id.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5">{p.display_name}</td>
                    <td className="px-4 py-2.5 font-mono">{p.username}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{p.role}</span>
                    </td>
                    <td className="px-4 py-2.5">{p.department}</td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                      ยังไม่มี profile — สร้างผู้ใช้ใน Supabase Dashboard ก่อน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Company Info */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">ข้อมูลบริษัท</h2>
            </div>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">ชื่อบริษัท</dt>
                <dd>บริษัท นิยมกิจ จำกัด</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">ประเภทกิจการ</dt>
                <dd>ผลิตกล่องกระดาษ</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">ระบบ</dt>
                <dd>WIP WMS v2.0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ฐานข้อมูล</dt>
                <dd className="text-primary font-medium">Supabase PostgreSQL ✓</dd>
              </div>
            </dl>
          </div>

          {/* DB Actions */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">การจัดการข้อมูล</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  ข้อมูลจัดเก็บใน Supabase PostgreSQL พร้อม Realtime sync ทุก client
                </p>
                <button
                  onClick={refreshData}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm"
                >
                  <RefreshCw className="h-4 w-4" /> โหลดข้อมูลใหม่
                </button>
              </div>
              <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
                <div>📊 งาน WIP: <strong>{s.jobs.length}</strong> รายการ</div>
                <div>🔄 การเคลื่อนย้าย: <strong>{s.movements.length}</strong> รายการ</div>
                <div>📋 Audit Log: <strong>{s.auditLogs.length}</strong> รายการ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Add User Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-sm space-y-2">
          <h3 className="font-semibold text-blue-900">📖 วิธีเพิ่มผู้ใช้งาน</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>ไปที่ <strong>Supabase Dashboard → Authentication → Users → Add User</strong></li>
            <li>กรอก Email + Password แล้ว Copy UUID ที่ได้</li>
            <li>ไปที่ <strong>Table Editor → profiles</strong> แล้วกด Insert row</li>
            <li>กรอก <code className="bg-blue-100 px-1 rounded">id</code> = UUID, <code className="bg-blue-100 px-1 rounded">username</code>, <code className="bg-blue-100 px-1 rounded">display_name</code>, <code className="bg-blue-100 px-1 rounded">role</code>, <code className="bg-blue-100 px-1 rounded">department</code></li>
            <li>ผู้ใช้สามารถ login ด้วย Email + Password ได้ทันที</li>
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
