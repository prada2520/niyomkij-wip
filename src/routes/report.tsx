import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/use-store";
import { getDueStatus, getPendingDays } from "@/lib/wip-data";
import { exportJobsExcel, exportJobsPDF } from "@/lib/exports";
import { FileDown, Printer, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "รายงานผู้บริหาร" }] }),
  component: Report,
});

function Report() {
  const s = useStore();
  const jobs = s.jobs;
  const today = new Date().toISOString().slice(0, 10);
  const outstanding = jobs.filter(j => j.currentStatus !== "พร้อมส่งมอบ").length;
  const near = jobs.filter(j => getDueStatus(j.deliveryDeadline) === "near").length;
  const overdue = jobs.filter(j => getDueStatus(j.deliveryDeadline) === "overdue").length;
  const pallets = jobs.length;
  const completedToday = s.movements.filter(m => m.dateTime.startsWith(today) && m.toStatus === "พร้อมส่งมอบ").length;

  const sorted = [...jobs].sort((a, b) => a.deliveryDeadline.localeCompare(b.deliveryDeadline));

  return (
    <AppLayout>
      <div className="p-8">
        <div className="no-print flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">รายงานผู้บริหาร</h1>
            <p className="text-muted-foreground mt-1">รายงานสถานะคงค้างคลัง WIP สำหรับนำเสนอ</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary-dark">
              <Printer className="h-4 w-4" /> พิมพ์ / PDF
            </button>
            <button onClick={() => exportJobsPDF(sorted)} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-secondary">
              <FileDown className="h-4 w-4" /> ส่งออก PDF
            </button>
            <button onClick={() => exportJobsExcel(sorted)} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-secondary">
              <FileSpreadsheet className="h-4 w-4" /> ส่งออก Excel
            </button>
          </div>
        </div>

        <div className="print-area bg-card border border-border rounded-lg shadow-sm mx-auto" style={{ maxWidth: "210mm" }}>
          <div className="p-10">
            <header className="flex justify-between items-start border-b-4 border-primary pb-6 mb-6">
              <div>
                <div className="text-xs text-muted-foreground tracking-widest mb-1">CONFIDENTIAL — INTERNAL USE</div>
                <h1 className="text-2xl font-bold text-primary">บริษัท นิยมกิจ จำกัด</h1>
                <div className="text-sm text-muted-foreground mt-0.5">NIYOMKIJ Co., Ltd. — Paper Box Manufacturing</div>
                <h2 className="text-xl font-semibold mt-4">WIP Outstanding Status Report</h2>
                <div className="text-sm text-muted-foreground">รายงานสถานะงานคงค้างคลัง WIP</div>
              </div>
              <div className="text-right">
                <div className="h-14 w-14 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold tracking-wider ml-auto">NK</div>
                <div className="text-xs mt-3 text-muted-foreground">วันที่ออกรายงาน</div>
                <div className="text-sm font-medium">{new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}</div>
              </div>
            </header>

            <section className="grid grid-cols-5 gap-3 mb-6">
              <SummaryCard label="งานคงค้างทั้งหมด" value={outstanding} accent="primary" />
              <SummaryCard label="ใกล้ครบกำหนด" value={near} accent="warning" />
              <SummaryCard label="เกินกำหนด" value={overdue} accent="destructive" />
              <SummaryCard label="พาเลทรวม" value={pallets} accent="secondary" />
              <SummaryCard label="เสร็จสมบูรณ์วันนี้" value={completedToday} accent="success" />
            </section>

            <section>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">ตารางสถานะรายละเอียด</h3>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="border border-primary p-1.5 text-left">#</th>
                    <th className="border border-primary p-1.5 text-left">PO No.</th>
                    <th className="border border-primary p-1.5 text-left">ลูกค้า</th>
                    <th className="border border-primary p-1.5 text-left">สินค้า</th>
                    <th className="border border-primary p-1.5 text-left">ขนาด</th>
                    <th className="border border-primary p-1.5 text-right">จำนวน</th>
                    <th className="border border-primary p-1.5 text-left">สถานะ</th>
                    <th className="border border-primary p-1.5 text-left">ถัดไป</th>
                    <th className="border border-primary p-1.5 text-left">รับเข้า</th>
                    <th className="border border-primary p-1.5 text-left">กำหนดส่ง</th>
                    <th className="border border-primary p-1.5 text-right">ค้าง</th>
                    <th className="border border-primary p-1.5 text-left">แผนก</th>
                    <th className="border border-primary p-1.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((j, i) => {
                    const due = getDueStatus(j.deliveryDeadline);
                    const dueClass = due === "overdue" ? "bg-destructive/15 text-destructive font-semibold" : due === "near" ? "bg-warning/30" : "";
                    return (
                      <tr key={j.id} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                        <td className="border border-border p-1">{i + 1}</td>
                        <td className="border border-border p-1 font-mono">{j.productionOrderNo}</td>
                        <td className="border border-border p-1">{j.customer}</td>
                        <td className="border border-border p-1">{j.productName}</td>
                        <td className="border border-border p-1">{j.boxSize}</td>
                        <td className="border border-border p-1 text-right tabular-nums">{j.quantity.toLocaleString()}</td>
                        <td className="border border-border p-1">{j.currentStatus}</td>
                        <td className="border border-border p-1">{j.nextProcess}</td>
                        <td className="border border-border p-1">{j.dateReceived}</td>
                        <td className="border border-border p-1">{j.deliveryDeadline}</td>
                        <td className="border border-border p-1 text-right tabular-nums">{getPendingDays(j.dateReceived)}</td>
                        <td className="border border-border p-1">{j.responsibleDept}</td>
                        <td className={`border border-border p-1 text-center ${dueClass}`}>
                          {due === "overdue" ? "เกินกำหนด" : due === "near" ? "ใกล้ครบ" : "ปกติ"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <footer className="mt-8 pt-4 border-t border-border grid grid-cols-3 gap-8 text-xs text-muted-foreground">
              <div>
                <div className="border-b border-foreground/30 h-12"></div>
                <div className="mt-1 text-center">ผู้จัดทำ</div>
              </div>
              <div>
                <div className="border-b border-foreground/30 h-12"></div>
                <div className="mt-1 text-center">ผู้ตรวจสอบ</div>
              </div>
              <div>
                <div className="border-b border-foreground/30 h-12"></div>
                <div className="mt-1 text-center">ผู้อนุมัติ</div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
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
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
