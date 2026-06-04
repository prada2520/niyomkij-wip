import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/use-store";
import { getUrgency, URGENCY_LABEL, URGENCY_COLOR, getPendingDays, fmtDateTime, store, type WipJob } from "@/lib/wip-data";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Search, ChevronLeft, ChevronRight, FileImage, X, PackageMinus, PackageCheck, CheckCircle2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useNavigate as useNav } from "@tanstack/react-router";

export const Route = createFileRoute("/tracking")({
  head: () => ({ meta: [{ title: "ติดตามงาน WIP — NIYOMKIJ WIP WMS" }] }),
  component: Tracking,
});

const PAGE = 15;

function Tracking() {
  const s = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [urgFilter, setUrgFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedImg, setSelectedImg] = useState<{ url: string; po: string } | null>(null);

  // แสดงเฉพาะงานที่ยังไม่เสร็จ
  const filtered = useMemo(() => {
    let r = s.jobs.filter(j => !j.isCompleted && j.currentStatus !== "พร้อมส่งมอบ");
    if (q) r = r.filter(j =>
      `${j.productionOrderNo} ${j.customer} ${j.productName}`.toLowerCase().includes(q.toLowerCase())
    );
    if (urgFilter !== "all") r = r.filter(j => getUrgency(j.deliveryDeadline) === urgFilter);
    // งานค้างนานสุดขึ้นก่อน (วันรับเข้าเก่าสุด)
    return [...r].sort((a, b) => a.dateReceived.localeCompare(b.dateReceived));
  }, [s.jobs, q, urgFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageData = filtered.slice((page - 1) * PAGE, page * PAGE);

  const goReceiving = (po: string, mode: string) => {
    navigate({ to: "/receiving" });
    // store PO in sessionStorage so receiving page can pick it up
    sessionStorage.setItem("wip_prefill_po", po);
    sessionStorage.setItem("wip_prefill_mode", mode);
  };

  const urgentCount = s.jobs.filter(j => !j.isCompleted && getUrgency(j.deliveryDeadline) === "urgent").length;

  return (
    <AppLayout>
      <Toaster richColors position="top-right" />
      <div className="p-6 space-y-5">
        <header className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">ติดตามงาน WIP</h1>
            <p className="text-muted-foreground mt-1">
              งานค้างอยู่ {filtered.length} รายการ
              {urgentCount > 0 && (
                <span className="ml-2 text-red-600 font-semibold animate-pulse">
                  ⚠️ เร่งด่วน {urgentCount} งาน
                </span>
              )}
            </p>
          </div>
          {user?.role !== "EXECUTIVE" && (
            <button onClick={() => navigate({ to: "/receiving" })}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">
              + รับเข้า/จ่ายออก
            </button>
          )}
        </header>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
              placeholder="ค้นหา PO, ลูกค้า, สินค้า..."
              className="w-full pl-10 pr-3 py-2 rounded-md border border-input bg-background text-sm"/>
          </div>
          <select value={urgFilter} onChange={e => { setUrgFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="all">ความเร่งด่วนทั้งหมด</option>
            <option value="normal">ปกติ</option>
            <option value="soon">ใกล้ครบกำหนด</option>
            <option value="urgent">⚠️ เร่งด่วน</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-secondary-foreground">
              <tr className="text-left">
                <th className="px-3 py-3 text-center">#</th>
                <th className="px-3 py-3">PO No.</th>
                <th className="px-3 py-3">ลูกค้า</th>
                <th className="px-3 py-3">สินค้า</th>
                <th className="px-3 py-3 text-right">คงเหลือ</th>
                <th className="px-3 py-3 text-right">เสีย</th>
                <th className="px-3 py-3">สถานะ</th>
                <th className="px-3 py-3">แผนก</th>
                <th className="px-3 py-3">รับเข้าล่าสุด</th>
                <th className="px-3 py-3">กำหนดส่ง</th>
                <th className="px-3 py-3 text-center">ค้าง</th>
                <th className="px-3 py-3 text-center">ความเร่งด่วน</th>
                <th className="px-3 py-3 text-center">เอกสาร</th>
                <th className="px-3 py-3 text-center">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((j, i) => {
                const urg = getUrgency(j.deliveryDeadline);
                const rowHighlight = urg === "urgent" ? "bg-red-50" : urg === "soon" ? "bg-yellow-50" : "";
                return (
                  <tr key={j.id} className={`border-t border-border hover:bg-secondary/30 ${rowHighlight}`}>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{(page - 1) * PAGE + i + 1}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-primary">{j.productionOrderNo}</td>
                    <td className="px-3 py-2.5">{j.customer}</td>
                    <td className="px-3 py-2.5 text-xs">{j.productName}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{j.quantity.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">
                      {j.quantityLost > 0 ? j.quantityLost.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded whitespace-nowrap">{j.currentStatus}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{j.responsibleDept}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">{fmtDateTime(j.dateReceived)}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {j.deliveryDeadline ? new Date(j.deliveryDeadline).toLocaleDateString("th-TH") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{getPendingDays(j.dateReceived)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${URGENCY_COLOR[urg]}`}>
                        {URGENCY_LABEL[urg]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {j.imageUrl ? (
                        <button onClick={() => setSelectedImg({ url: j.imageUrl!, po: j.productionOrderNo })}
                          className="p-1.5 rounded hover:bg-primary/10 text-primary" title="ดูเอกสาร">
                          <FileImage className="h-4 w-4"/>
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {user?.role !== "EXECUTIVE" && (
                        <div className="flex gap-1 justify-center">
                          <ActionBtn color="blue"   icon={<PackageCheck className="h-3.5 w-3.5"/>} title="รับกลับเข้าคลัง"
                            onClick={() => goReceiving(j.productionOrderNo, "return")}/>
                          <ActionBtn color="amber"  icon={<PackageMinus className="h-3.5 w-3.5"/>} title="จ่ายออกแผนก"
                            onClick={() => goReceiving(j.productionOrderNo, "dispatch")}/>
                          <ActionBtn color="purple" icon={<CheckCircle2 className="h-3.5 w-3.5"/>} title="จบงาน"
                            onClick={() => goReceiving(j.productionOrderNo, "complete")}/>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageData.length === 0 && (
                <tr><td colSpan={14} className="py-12 text-center text-muted-foreground">
                  {s.loading ? "กำลังโหลด..." : "ไม่พบงานค้าง 🎉"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center text-sm">
          <div className="text-muted-foreground">หน้า {page} จาก {totalPages} ({filtered.length} รายการ)</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded border border-border disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded border border-border disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedImg(null)}>
          <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <div className="font-semibold">เอกสารใบสั่งผลิต</div>
                <div className="text-xs text-muted-foreground font-mono">{selectedImg.po}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={selectedImg.url} target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90">
                  เปิดเต็มจอ
                </a>
                <button onClick={() => setSelectedImg(null)} className="p-1.5 rounded hover:bg-secondary">
                  <X className="h-4 w-4"/>
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto bg-secondary/20 flex items-center justify-center p-4">
              <img src={selectedImg.url} alt="เอกสาร" className="max-w-full max-h-[65vh] object-contain rounded shadow"/>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ActionBtn({ color, icon, title, onClick }: {
  color: "blue" | "amber" | "purple"; icon: React.ReactNode; title: string; onClick: () => void;
}) {
  const cls = {
    blue:   "bg-blue-100 text-blue-700 hover:bg-blue-200",
    amber:  "bg-amber-100 text-amber-700 hover:bg-amber-200",
    purple: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  }[color];
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 ${cls}`}>
      {icon}
    </button>
  );
}
