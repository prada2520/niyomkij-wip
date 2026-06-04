import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/use-store";
import { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "ตรวจสอบย้อนหลัง" }] }),
  component: Audit,
});

function Audit() {
  const s = useStore();
  const [q, setQ] = useState("");
  const [selectedPo, setSelectedPo] = useState<string | null>(null);

  const logs = s.auditLogs.filter(l => !q || `${l.user} ${l.action} ${l.target} ${l.details}`.toLowerCase().includes(q.toLowerCase()));
  const chain = selectedPo ? s.movements.filter(m => m.productionOrderNo === selectedPo).reverse() : [];

  return (
    <AppLayout>
      <div className="p-8 space-y-5">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" /> ตรวจสอบย้อนหลัง</h1>
          <p className="text-muted-foreground mt-1">บันทึกการเปลี่ยนแปลงระบบ และเส้นทางงานแบบครบวงจร</p>
        </header>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">บันทึกการดำเนินการ ({logs.length})</h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา..." className="pl-8 pr-3 py-1.5 rounded border border-input bg-background text-sm" />
              </div>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50 sticky top-0">
                  <tr><th className="px-3 py-2 text-left">วันเวลา</th><th className="px-3 py-2 text-left">ผู้ใช้</th><th className="px-3 py-2 text-left">การกระทำ</th><th className="px-3 py-2 text-left">เป้าหมาย</th><th className="px-3 py-2 text-left">รายละเอียด</th></tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setSelectedPo(l.target)}>
                      <td className="px-3 py-2">{new Date(l.dateTime).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="px-3 py-2">{l.user}</td>
                      <td className="px-3 py-2"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{l.action}</span></td>
                      <td className="px-3 py-2 font-mono">{l.target}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.details}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">ยังไม่มีบันทึก — ลองอัปเดตสถานะงานเพื่อสร้างประวัติ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">เส้นทางงาน {selectedPo && <span className="font-mono text-primary">— {selectedPo}</span>}</h2>
              {!selectedPo && <p className="text-xs text-muted-foreground mt-1">เลือกแถวจากบันทึกซ้ายมือ หรือพิมพ์เลข PO</p>}
            </div>
            <div className="p-4 max-h-[65vh] overflow-y-auto">
              <input placeholder="พิมพ์เลข PO เช่น PO-2026-0001" onChange={e => setSelectedPo(e.target.value)} className="w-full mb-4 px-3 py-2 rounded border border-input bg-background text-sm" />
              {chain.length === 0 && selectedPo && <div className="text-sm text-muted-foreground">ไม่พบเส้นทางการเคลื่อนย้าย</div>}
              {chain.map((m, i) => (
                <div key={m.id} className="flex gap-3 pb-3 mb-3 border-b border-border last:border-0">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.fromStatus} → {m.toStatus}</div>
                    <div className="text-xs text-muted-foreground">{new Date(m.dateTime).toLocaleString("th-TH")} · {m.department} · {m.operator}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
