import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/use-store";
import { getDueStatus, getPendingDays, type WipJob } from "@/lib/wip-data";
import { exportJobsExcel, exportJobsPDF } from "@/lib/exports";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileDown, Printer, FileSpreadsheet, FileText, Download, AlertTriangle, Users, Activity, BarChart3, Send } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "รายงาน — NIYOMKIJ WIP" }] }),
  component: ReportsHub,
});

function ReportsHub() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="no-print mb-6">
          <h1 className="text-3xl font-bold">รายงาน</h1>
          <p className="text-muted-foreground mt-1">ศูนย์รวมรายงานสำหรับผู้บริหารและฝ่ายปฏิบัติการ</p>
        </div>

        <Tabs defaultValue="executive" className="w-full">
          <TabsList className="no-print h-auto p-1 bg-muted grid grid-cols-5 w-full max-w-4xl mb-6">
            <TabsTrigger value="executive" className="gap-2"><BarChart3 className="h-4 w-4" />สรุปผู้บริหาร</TabsTrigger>
            <TabsTrigger value="outstanding" className="gap-2"><AlertTriangle className="h-4 w-4" />งานค้าง</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><Activity className="h-4 w-4" />การเคลื่อนไหว</TabsTrigger>
            <TabsTrigger value="customer" className="gap-2"><Users className="h-4 w-4" />ลูกค้า</TabsTrigger>
            <TabsTrigger value="export" className="gap-2"><Send className="h-4 w-4" />ส่งออกรายงาน</TabsTrigger>
          </TabsList>

          <TabsContent value="executive"><ExecutiveReport /></TabsContent>
          <TabsContent value="outstanding"><OutstandingReport /></TabsContent>
          <TabsContent value="history"><HistoryReport /></TabsContent>
          <TabsContent value="customer"><CustomerReport /></TabsContent>
          <TabsContent value="export"><ExportReport /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function Toolbar({ jobs, filename }: { jobs: WipJob[]; filename: string }) {
  return (
    <div className="no-print flex justify-end gap-2 mb-4">
      <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
        <Printer className="h-4 w-4" /> พิมพ์ / PDF
      </button>
      <button onClick={() => exportJobsPDF(jobs, `${filename}.pdf`)} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-secondary">
        <FileDown className="h-4 w-4" /> ส่งออก PDF
      </button>
      <button onClick={() => exportJobsExcel(jobs, `${filename}.xlsx`)} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-secondary">
        <FileSpreadsheet className="h-4 w-4" /> ส่งออก Excel
      </button>
    </div>
  );
}

function ReportShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="print-area bg-card border border-border rounded-lg shadow-sm mx-auto" style={{ maxWidth: "210mm" }}>
      <div className="p-10">
        <header className="flex justify-between items-start border-b-4 border-primary pb-6 mb-6">
          <div>
            <div className="text-xs text-muted-foreground tracking-widest mb-1">CONFIDENTIAL — INTERNAL USE</div>
            <h1 className="text-2xl font-bold text-primary">บริษัท นิยมกิจ จำกัด</h1>
            <div className="text-sm text-muted-foreground mt-0.5">NIYOMKIJ Co., Ltd. — Paper Box Manufacturing</div>
            <h2 className="text-xl font-semibold mt-4">{title}</h2>
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          </div>
          <div className="text-right">
            <div className="h-14 w-14 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold tracking-wider ml-auto">NK</div>
            <div className="text-xs mt-3 text-muted-foreground">วันที่ออกรายงาน</div>
            <div className="text-sm font-medium">{new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}</div>
          </div>
        </header>
        {children}
        <footer className="mt-8 pt-4 border-t border-border grid grid-cols-3 gap-8 text-xs text-muted-foreground">
          <Signature label="ผู้จัดทำ" />
          <Signature label="ผู้ตรวจสอบ" />
          <Signature label="ผู้อนุมัติ" />
        </footer>
      </div>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="border-b border-foreground/30 h-12"></div>
      <div className="mt-1 text-center">{label}</div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  const colors: Record<string, string> = {
    primary: "border-l-primary",
    warning: "border-l-warning",
    destructive: "border-l-destructive",
    secondary: "border-l-muted-foreground",
    success: "border-l-success",
  };
  return (
    <div className={`bg-background border border-border border-l-4 ${colors[accent]} p-3 rounded`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

/* ============== 1. EXECUTIVE ============== */
function ExecutiveReport() {
  const s = useStore();
  const jobs = s.jobs;
  const today = new Date().toISOString().slice(0, 10);
  const outstanding = jobs.filter(j => j.currentStatus !== "พร้อมส่งมอบ").length;
  const near = jobs.filter(j => getDueStatus(j.deliveryDeadline) === "near").length;
  const overdue = jobs.filter(j => getDueStatus(j.deliveryDeadline) === "overdue").length;
  const completedToday = s.movements.filter(m => m.dateTime.startsWith(today) && m.toStatus === "พร้อมส่งมอบ").length;
  const totalQty = jobs.reduce((a, j) => a + j.quantity, 0);
  const sorted = [...jobs].sort((a, b) => a.deliveryDeadline.localeCompare(b.deliveryDeadline));

  return (
    <>
      <Toolbar jobs={sorted} filename="executive-summary" />
      <ReportShell title="สรุปรายงานผู้บริหาร" subtitle="Executive Summary — WIP Status Overview">
        <section className="grid grid-cols-5 gap-3 mb-6">
          <SummaryCard label="งานคงค้างทั้งหมด" value={outstanding} accent="primary" />
          <SummaryCard label="ใกล้ครบกำหนด" value={near} accent="warning" />
          <SummaryCard label="เกินกำหนด" value={overdue} accent="destructive" />
          <SummaryCard label="ปริมาณรวม (ใบ)" value={totalQty.toLocaleString()} accent="secondary" />
          <SummaryCard label="เสร็จสมบูรณ์วันนี้" value={completedToday} accent="success" />
        </section>
        <JobsTable jobs={sorted.slice(0, 30)} title="งานสำคัญเรียงตามกำหนดส่ง (30 อันดับแรก)" />
      </ReportShell>
    </>
  );
}

/* ============== 2. OUTSTANDING ============== */
function OutstandingReport() {
  const s = useStore();
  const out = useMemo(
    () => s.jobs
      .filter(j => j.currentStatus !== "พร้อมส่งมอบ")
      .sort((a, b) => a.deliveryDeadline.localeCompare(b.deliveryDeadline)),
    [s.jobs]
  );
  const overdue = out.filter(j => getDueStatus(j.deliveryDeadline) === "overdue");
  const near = out.filter(j => getDueStatus(j.deliveryDeadline) === "near");
  const normal = out.filter(j => getDueStatus(j.deliveryDeadline) === "normal");

  return (
    <>
      <Toolbar jobs={out} filename="outstanding-report" />
      <ReportShell title="รายงานงานค้าง" subtitle="Outstanding Jobs Report — งานที่ยังไม่เสร็จสมบูรณ์">
        <section className="grid grid-cols-3 gap-3 mb-6">
          <SummaryCard label="เกินกำหนด" value={overdue.length} accent="destructive" />
          <SummaryCard label="ใกล้ครบกำหนด (≤3 วัน)" value={near.length} accent="warning" />
          <SummaryCard label="อยู่ในกำหนด" value={normal.length} accent="success" />
        </section>
        <JobsTable jobs={out} title="รายการงานค้างทั้งหมด" />
      </ReportShell>
    </>
  );
}

/* ============== 3. CUSTOMER ============== */
function CustomerReport() {
  const s = useStore();
  const grouped = useMemo(() => {
    const m = new Map<string, { customer: string; count: number; qty: number; overdue: number; jobs: WipJob[] }>();
    for (const j of s.jobs) {
      const g = m.get(j.customer) || { customer: j.customer, count: 0, qty: 0, overdue: 0, jobs: [] };
      g.count++; g.qty += j.quantity;
      if (getDueStatus(j.deliveryDeadline) === "overdue") g.overdue++;
      g.jobs.push(j);
      m.set(j.customer, g);
    }
    return Array.from(m.values()).sort((a, b) => b.qty - a.qty);
  }, [s.jobs]);

  return (
    <>
      <Toolbar jobs={s.jobs} filename="customer-report" />
      <ReportShell title="รายงานลูกค้า" subtitle="Customer Summary Report — สรุปงานตามลูกค้า">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="border border-primary p-2 text-left">#</th>
              <th className="border border-primary p-2 text-left">ลูกค้า</th>
              <th className="border border-primary p-2 text-right">จำนวนงาน</th>
              <th className="border border-primary p-2 text-right">ปริมาณรวม (ใบ)</th>
              <th className="border border-primary p-2 text-right">เกินกำหนด</th>
              <th className="border border-primary p-2 text-right">สัดส่วน</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g, i) => {
              const total = grouped.reduce((a, x) => a + x.qty, 0);
              const pct = total ? ((g.qty / total) * 100).toFixed(1) : "0";
              return (
                <tr key={g.customer} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                  <td className="border border-border p-2">{i + 1}</td>
                  <td className="border border-border p-2 font-medium">{g.customer}</td>
                  <td className="border border-border p-2 text-right tabular-nums">{g.count}</td>
                  <td className="border border-border p-2 text-right tabular-nums">{g.qty.toLocaleString()}</td>
                  <td className={`border border-border p-2 text-right tabular-nums ${g.overdue > 0 ? "text-destructive font-semibold" : ""}`}>{g.overdue}</td>
                  <td className="border border-border p-2 text-right tabular-nums">{pct}%</td>
                </tr>
              );
            })}
            <tr className="bg-primary/10 font-semibold">
              <td colSpan={2} className="border border-border p-2">รวมทั้งสิ้น</td>
              <td className="border border-border p-2 text-right tabular-nums">{grouped.reduce((a, x) => a + x.count, 0)}</td>
              <td className="border border-border p-2 text-right tabular-nums">{grouped.reduce((a, x) => a + x.qty, 0).toLocaleString()}</td>
              <td className="border border-border p-2 text-right tabular-nums">{grouped.reduce((a, x) => a + x.overdue, 0)}</td>
              <td className="border border-border p-2 text-right">100%</td>
            </tr>
          </tbody>
        </table>
      </ReportShell>
    </>
  );
}

/* ============== 4. HISTORY ============== */
function HistoryReport() {
  const s = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);

  const filtered = useMemo(
    () => s.movements.filter(m => {
      const d = m.dateTime.slice(0, 10);
      return d >= from && d <= to;
    }),
    [s.movements, from, to]
  );

  return (
    <>
      <div className="no-print flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">ตั้งแต่วันที่</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-border rounded px-3 py-2 text-sm bg-background" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">ถึงวันที่</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-border rounded px-3 py-2 text-sm bg-background" />
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
            <Printer className="h-4 w-4" /> พิมพ์ / PDF
          </button>
          <button onClick={() => exportJobsExcel(s.jobs, "history-report.xlsx")} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-secondary">
            <FileSpreadsheet className="h-4 w-4" /> ส่งออก Excel
          </button>
        </div>
      </div>
      <ReportShell title="รายงานการเคลื่อนไหว" subtitle={`Movement Activity Report — ${from} ถึง ${to}`}>
        <section className="grid grid-cols-3 gap-3 mb-6">
          <SummaryCard label="การเคลื่อนย้ายทั้งหมด" value={filtered.length} accent="primary" />
          <SummaryCard label="ปริมาณรวม (ใบ)" value={filtered.reduce((a, m) => a + m.quantity, 0).toLocaleString()} accent="secondary" />
          <SummaryCard label="เสร็จสมบูรณ์" value={filtered.filter(m => m.toStatus === "พร้อมส่งมอบ").length} accent="success" />
        </section>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="border border-primary p-1.5 text-left">วันที่/เวลา</th>
              <th className="border border-primary p-1.5 text-left">PO No.</th>
              <th className="border border-primary p-1.5 text-left">จาก</th>
              <th className="border border-primary p-1.5 text-left">เป็น</th>
              <th className="border border-primary p-1.5 text-left">แผนก</th>
              <th className="border border-primary p-1.5 text-left">ผู้ปฏิบัติงาน</th>
              <th className="border border-primary p-1.5 text-right">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((m, i) => (
              <tr key={m.id} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                <td className="border border-border p-1">{new Date(m.dateTime).toLocaleString("th-TH")}</td>
                <td className="border border-border p-1 font-mono">{m.productionOrderNo}</td>
                <td className="border border-border p-1">{m.fromStatus}</td>
                <td className="border border-border p-1">{m.toStatus}</td>
                <td className="border border-border p-1">{m.department}</td>
                <td className="border border-border p-1">{m.operator}</td>
                <td className="border border-border p-1 text-right tabular-nums">{m.quantity.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <div className="text-xs text-muted-foreground mt-2">แสดง 200 รายการแรกจากทั้งหมด {filtered.length} รายการ</div>
        )}
      </ReportShell>
    </>
  );
}

/* ============== Shared jobs table ============== */
function JobsTable({ jobs, title }: { jobs: WipJob[]; title: string }) {
  return (
    <section>
      <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="border border-primary p-1.5 text-left">#</th>
            <th className="border border-primary p-1.5 text-left">PO No.</th>
            <th className="border border-primary p-1.5 text-left">ลูกค้า</th>
            <th className="border border-primary p-1.5 text-left">สินค้า</th>
            <th className="border border-primary p-1.5 text-right">จำนวน</th>
            <th className="border border-primary p-1.5 text-left">สถานะ</th>
            <th className="border border-primary p-1.5 text-left">กำหนดส่ง</th>
            <th className="border border-primary p-1.5 text-right">ค้าง</th>
            <th className="border border-primary p-1.5 text-center">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j, i) => {
            const due = getDueStatus(j.deliveryDeadline);
            const dueClass = due === "overdue" ? "bg-destructive/15 text-destructive font-semibold" : due === "near" ? "bg-warning/30" : "";
            return (
              <tr key={j.id} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                <td className="border border-border p-1">{i + 1}</td>
                <td className="border border-border p-1 font-mono">{j.productionOrderNo}</td>
                <td className="border border-border p-1">{j.customer}</td>
                <td className="border border-border p-1">{j.productName}</td>
                <td className="border border-border p-1 text-right tabular-nums">{j.quantity.toLocaleString()}</td>
                <td className="border border-border p-1">{j.currentStatus}</td>
                <td className="border border-border p-1">{j.deliveryDeadline}</td>
                <td className="border border-border p-1 text-right tabular-nums">{getPendingDays(j.dateReceived)}</td>
                <td className={`border border-border p-1 text-center ${dueClass}`}>
                  {due === "overdue" ? "เกินกำหนด" : due === "near" ? "ใกล้ครบ" : "ปกติ"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ============== 5. EXPORT ============== */
function ExportReport() {
  const s = useStore();
  const cards = [
    { title: "รายงานงาน WIP ทั้งหมด (Excel)", desc: `${s.jobs.length} รายการ พร้อมสถานะปัจจุบัน`, icon: FileSpreadsheet, action: () => exportJobsExcel(s.jobs) },
    { title: "รายงานงาน WIP ทั้งหมด (PDF)", desc: "รูปแบบ A4 แนวนอน พร้อมตารางสรุป", icon: FileText, action: () => exportJobsPDF(s.jobs) },
    { title: "งานเกินกำหนด (Excel)", desc: "เฉพาะงานที่เกินกำหนดส่งมอบ", icon: FileSpreadsheet, action: () => exportJobsExcel(s.jobs.filter(j => new Date(j.deliveryDeadline) < new Date()), "wip-overdue.xlsx") },
    { title: "งานพร้อมส่งมอบ (Excel)", desc: "รายการสำเร็จ พร้อมจัดส่ง", icon: FileSpreadsheet, action: () => exportJobsExcel(s.jobs.filter(j => j.currentStatus === "พร้อมส่งมอบ"), "wip-ready.xlsx") },
  ];
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">ส่งออกรายงาน</h2>
        <p className="text-sm text-muted-foreground mt-1">ดาวน์โหลดรายงานสำเร็จรูปในรูปแบบ Excel หรือ PDF</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        {cards.map((c, i) => (
          <button key={i} onClick={c.action} className="text-left bg-card border border-border rounded-lg p-5 shadow-sm hover:border-primary hover:shadow-md transition-all group">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <c.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">{c.title}</div>
                <div className="text-sm text-muted-foreground">{c.desc}</div>
              </div>
              <Download className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
