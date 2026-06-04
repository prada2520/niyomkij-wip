import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/use-store";
import { DEPARTMENTS, STATUS_FLOW } from "@/lib/wip-data";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/movements")({
  head: () => ({ meta: [{ title: "ประวัติการเคลื่อนย้าย" }] }),
  component: Movements,
});

function Movements() {
  const s = useStore();
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [po, setPo] = useState(""); const [dept, setDept] = useState("");
  const [status, setStatus] = useState(""); const [op, setOp] = useState("");

  const filtered = useMemo(() => {
    return s.movements.filter(m => {
      if (from && m.dateTime < from) return false;
      if (to && m.dateTime > to + "T23:59:59") return false;
      if (po && !m.productionOrderNo.toLowerCase().includes(po.toLowerCase())) return false;
      if (dept && m.department !== dept) return false;
      if (status && m.toStatus !== status) return false;
      if (op && !m.operator.toLowerCase().includes(op.toLowerCase())) return false;
      return true;
    });
  }, [s.movements, from, to, po, dept, status, op]);

  return (
    <AppLayout>
      <div className="p-8 space-y-5">
        <header>
          <h1 className="text-3xl font-bold">ประวัติการเคลื่อนย้าย</h1>
          <p className="text-muted-foreground mt-1">มุมมองเส้นเวลา การเคลื่อนย้ายงาน WIP — รวม {filtered.length} รายการ</p>
        </header>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input label="จากวันที่" type="date" value={from} onChange={setFrom} />
          <Input label="ถึงวันที่" type="date" value={to} onChange={setTo} />
          <Input label="PO" value={po} onChange={setPo} />
          <Select label="แผนก" value={dept} onChange={setDept} options={["", ...DEPARTMENTS]} />
          <Select label="สถานะ" value={status} onChange={setStatus} options={["", ...STATUS_FLOW]} />
          <Input label="พนักงาน" value={op} onChange={setOp} />
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {filtered.slice(0, 200).map(m => (
              <div key={m.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                <div className="w-32 shrink-0 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">{new Date(m.dateTime).toLocaleDateString("th-TH")}</div>
                  <div>{new Date(m.dateTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="w-2 shrink-0 relative">
                  <div className="absolute inset-0 w-0.5 left-1/2 -translate-x-1/2 bg-border" />
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-primary">{m.productionOrderNo}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">{m.department}</span>
                    <span className="text-xs text-muted-foreground">โดย {m.operator}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{m.fromStatus}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded">{m.toStatus}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">{m.quantity.toLocaleString()} ใบ</span>
                  </div>
                  {m.remarks && <div className="text-xs text-muted-foreground mt-1 italic">{m.remarks}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Input({ label, value, onChange, type = "text" }: any) {
  return <div><label className="block text-xs text-muted-foreground mb-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm" /></div>;
}
function Select({ label, value, onChange, options }: any) {
  return <div><label className="block text-xs text-muted-foreground mb-1">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm">
      {options.map((o: string) => <option key={o} value={o}>{o || "— ทั้งหมด —"}</option>)}
    </select></div>;
}
