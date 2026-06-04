import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/use-store";
import { getUrgency, STATUS_FLOW, URGENCY_COLOR, URGENCY_LABEL } from "@/lib/wip-data";
import { Package, Clock, AlertTriangle, AlertOctagon, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "แดชบอร์ด — NIYOMKIJ WIP WMS" }] }),
  component: Dashboard,
});

// สีแต่ละกระบวนการ — แยกชัดเจน
const PROCESS_COLORS: Record<string, string> = {
  "รับเข้าคลัง":            "#6366f1", // indigo
  "รอพิมพ์":                "#3b82f6", // blue
  "กำลังพิมพ์":             "#0ea5e9", // sky
  "คืนคลัง (หลังพิมพ์)":   "#06b6d4", // cyan
  "รอปั๊ม":                 "#10b981", // emerald
  "กำลังปั๊ม":              "#22c55e", // green
  "คืนคลัง (หลังปั๊ม)":    "#84cc16", // lime
  "รอประกอบกล่อง":          "#eab308", // yellow
  "กำลังประกอบกล่อง":       "#f97316", // orange
  "รอเคลือบ":               "#ef4444", // red
  "กำลังเคลือบ":            "#ec4899", // pink
  "รอปะลูกฟูก":             "#a855f7", // purple
  "กำลังปะลูกฟูก":          "#8b5cf6", // violet
  "พร้อมส่งมอบ":            "#14b8a6", // teal
};

// Bar chart: รับเข้า vs ปล่อย — สีต่างกันชัด
const BAR_COLORS = {
  รับเข้า: "#3b82f6",  // blue
  ปล่อย:  "#f97316",  // orange
};

// Custom Pie label
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function Dashboard() {
  const s = useStore();
  const today = new Date().toISOString().slice(0, 10);

  const total       = s.jobs.length;
  const pending     = s.jobs.filter(j => !j.isCompleted && j.currentStatus !== "พร้อมส่งมอบ").length;
  const near        = s.jobs.filter(j => getUrgency(j.deliveryDeadline) === "soon").length;
  const urgent      = s.jobs.filter(j => getUrgency(j.deliveryDeadline) === "urgent").length;
  const receivedToday = s.movements.filter(m => m.dateTime.startsWith(today) && m.movementType === "รับเข้า").length;
  const releasedToday = s.movements.filter(m => m.dateTime.startsWith(today) && m.movementType === "จ่ายออก").length;

  // Pie: กระจายตามกระบวนการ
  const procDist = STATUS_FLOW
    .map(st => ({ name: st, value: s.jobs.filter(j => j.currentStatus === st && !j.isCompleted).length }))
    .filter(x => x.value > 0);

  // Bar: 7 วันย้อนหลัง
  const days: { day: string; รับเข้า: number; ปล่อย: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      day: d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
      รับเข้า: s.movements.filter(m => m.dateTime.startsWith(key) && m.movementType === "รับเข้า").length,
      ปล่อย:  s.movements.filter(m => m.dateTime.startsWith(key) && m.movementType === "จ่ายออก").length,
    });
  }

  const kpis = [
    { label: "งาน WIP ทั้งหมด",  value: total,         icon: Package,        bg: "bg-indigo-600",  fg: "text-white" },
    { label: "งานคงค้าง",         value: pending,       icon: Clock,          bg: "bg-blue-500",    fg: "text-white" },
    { label: "ใกล้ครบกำหนด",     value: near,          icon: AlertTriangle,  bg: "bg-yellow-500",  fg: "text-white" },
    { label: "⚠️ เร่งด่วน",       value: urgent,        icon: AlertOctagon,   bg: "bg-red-600",     fg: "text-white" },
    { label: "รับเข้าวันนี้",     value: receivedToday, icon: ArrowDownToLine, bg: "bg-emerald-500", fg: "text-white" },
    { label: "จ่ายออกวันนี้",     value: releasedToday, icon: ArrowUpFromLine, bg: "bg-orange-500",  fg: "text-white" },
  ];

  const alertJobs = s.jobs.filter(j => !j.isCompleted && getUrgency(j.deliveryDeadline) !== "normal").slice(0, 8);

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">แดชบอร์ดภาพรวม</h1>
          <p className="text-muted-foreground mt-1">สรุปสถานะคลัง WIP — บริษัท นิยมกิจ จำกัด</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className={`h-9 w-9 rounded-md flex items-center justify-center mb-3 ${k.bg} ${k.fg}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="font-semibold mb-1">การเคลื่อนย้ายคลัง 7 วันย้อนหลัง</h2>
            <div className="flex gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded inline-block bg-blue-500"/><span>รับเข้า</span></div>
              <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded inline-block bg-orange-500"/><span>จ่ายออก</span></div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={days} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(val: number, name: string) => [val, name]}
                />
                <Bar dataKey="รับเข้า" fill={BAR_COLORS.รับเข้า} radius={[4,4,0,0]} />
                <Bar dataKey="ปล่อย"  fill={BAR_COLORS.ปล่อย}  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="font-semibold mb-4">การกระจายตามกระบวนการ</h2>
            {procDist.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">ไม่มีข้อมูล</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={procDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {procDist.map((entry, i) => (
                        <Cell key={i} fill={PROCESS_COLORS[entry.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(val: number, name: string) => [`${val} งาน`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {procDist.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full inline-block flex-shrink-0"
                          style={{ backgroundColor: PROCESS_COLORS[entry.name] ?? "#94a3b8" }}/>
                        <span className="truncate max-w-[140px]">{entry.name}</span>
                      </div>
                      <span className="font-semibold ml-2">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Alert Table */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-destructive" /> งานที่ต้องเร่งดำเนินการ
          </h2>
          {alertJobs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">✅ ไม่มีงานเร่งด่วนขณะนี้</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 px-3">PO No.</th>
                    <th className="py-2 px-3">ลูกค้า</th>
                    <th className="py-2 px-3">สถานะปัจจุบัน</th>
                    <th className="py-2 px-3">กำหนดส่ง</th>
                    <th className="py-2 px-3">ความเร่งด่วน</th>
                  </tr>
                </thead>
                <tbody>
                  {alertJobs.map(j => {
                    const urg = getUrgency(j.deliveryDeadline);
                    return (
                      <tr key={j.id} className="border-b border-border last:border-0">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">{j.productionOrderNo}</td>
                        <td className="py-2.5 px-3">{j.customer}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: PROCESS_COLORS[j.currentStatus] + "20", color: PROCESS_COLORS[j.currentStatus] }}>
                            {j.currentStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{j.deliveryDeadline ? new Date(j.deliveryDeadline).toLocaleDateString("th-TH") : "—"}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${URGENCY_COLOR[urg]}`}>
                            {URGENCY_LABEL[urg]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
