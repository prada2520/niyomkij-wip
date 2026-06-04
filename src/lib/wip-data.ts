// ============================================================
// NIYOMKIJ WIP WMS — Data Layer v3
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, WipStatusEnum } from "@/integrations/supabase/types";

export type Role = "SUPER_ADMIN" | "OPERATOR" | "EXECUTIVE";
export type WipStatus = WipStatusEnum;

// สถานะทั้งหมด (ไม่มี "เกินกำหนด" — เป็น badge เตือนแทน)
export const STATUS_FLOW: WipStatus[] = [
  "รับเข้าคลัง",
  "รอพิมพ์", "กำลังพิมพ์", "คืนคลัง (หลังพิมพ์)",
  "รอปั๊ม", "กำลังปั๊ม", "คืนคลัง (หลังปั๊ม)",
  "รอประกอบกล่อง", "กำลังประกอบกล่อง",
  "รอเคลือบ", "กำลังเคลือบ",
  "รอปะลูกฟูก", "กำลังปะลูกฟูก",
  "พร้อมส่งมอบ",
];

// แมป: สถานีงาน → แผนกรับผิดชอบอัตโนมัติ
export const STATUS_DEPT_MAP: Record<string, string> = {
  "รับเข้าคลัง":            "คลังสินค้า",
  "รอพิมพ์":                "แผนกพิมพ์",
  "กำลังพิมพ์":             "แผนกพิมพ์",
  "คืนคลัง (หลังพิมพ์)":   "คลังสินค้า",
  "รอปั๊ม":                 "แผนกปั๊ม",
  "กำลังปั๊ม":              "แผนกปั๊ม",
  "คืนคลัง (หลังปั๊ม)":    "คลังสินค้า",
  "รอประกอบกล่อง":          "แผนกประกอบ",
  "กำลังประกอบกล่อง":       "แผนกประกอบ",
  "รอเคลือบ":               "แผนกเคลือบ",
  "กำลังเคลือบ":            "แผนกเคลือบ",
  "รอปะลูกฟูก":             "แผนกลูกฟูก",
  "กำลังปะลูกฟูก":          "แผนกลูกฟูก",
  "พร้อมส่งมอบ":            "คลังสินค้า",
};

export const DEPARTMENTS = [
  "คลังสินค้า", "แผนกพิมพ์", "แผนกปั๊ม",
  "แผนกประกอบ", "แผนกเคลือบ", "แผนกลูกฟูก",
];

// PO format: 8 digits
export const PO_REGEX = /^\d{8}$/;
export function validatePO(po: string) { return PO_REGEX.test(po); }

// ── Types ───────────────────────────────────────────────────
export interface WipJob {
  id: string;
  productionOrderNo: string;
  customer: string;
  productName: string;
  boxSize: string;
  quantity: number;           // จำนวนคงเหลือปัจจุบัน
  quantityOriginal: number;   // จำนวนเริ่มต้น
  quantityLost: number;       // เสียสะสม
  dateReceived: string;       // ISO datetime
  deliveryDeadline: string;
  currentStatus: WipStatus;
  nextProcess: string;
  responsibleDept: string;
  remarks: string;
  imageUrl?: string;
  isCompleted: boolean;       // จบงานแล้ว
}

export interface Movement {
  id: string;
  jobId: string;
  productionOrderNo: string;
  dateTime: string;
  fromStatus: WipStatus;
  toStatus: WipStatus;
  movementType: "รับเข้า" | "จ่ายออก" | "จบงาน";
  department: string;
  operator: string;
  quantity: number;
  quantityLost: number;
  remarks: string;
}

export interface AuditLog {
  id: string;
  dateTime: string;
  user: string;
  action: string;
  target: string;
  details: string;
}

// ── Urgency (แทน "เกินกำหนด") ───────────────────────────────
export type UrgencyLevel = "normal" | "soon" | "urgent";
export function getUrgency(deadline: string): UrgencyLevel {
  if (!deadline) return "normal";
  const days = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0)  return "urgent";   // เลยกำหนดแล้ว → เร่งด่วนมาก
  if (days <= 3) return "soon";     // ใกล้ครบ 3 วัน
  return "normal";
}
export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  normal: "ปกติ",
  soon:   "ใกล้ครบกำหนด",
  urgent: "⚠️ เร่งด่วน!",
};
export const URGENCY_COLOR: Record<UrgencyLevel, string> = {
  normal: "bg-green-100 text-green-800",
  soon:   "bg-yellow-100 text-yellow-800",
  urgent: "bg-red-100 text-red-800 animate-pulse",
};

// ── Row → domain mappers ────────────────────────────────────
function rowToJob(r: Tables<"wip_jobs">): WipJob {
  return {
    id: r.id,
    productionOrderNo: r.production_order_no,
    customer: r.customer,
    productName: r.product_name,
    boxSize: r.box_size,
    quantity: r.quantity,
    quantityOriginal: (r as any).quantity_original ?? r.quantity,
    quantityLost: (r as any).quantity_lost ?? 0,
    dateReceived: r.date_received,
    deliveryDeadline: r.delivery_deadline ?? "",
    currentStatus: r.current_status,
    nextProcess: r.next_process,
    responsibleDept: r.responsible_dept,
    remarks: r.remarks,
    imageUrl: r.image_url ?? undefined,
    isCompleted: (r as any).is_completed ?? false,
  };
}

function rowToMovement(r: Tables<"wip_movements">): Movement {
  return {
    id: r.id,
    jobId: r.job_id,
    productionOrderNo: r.production_order_no,
    dateTime: r.date_time,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    movementType: (r as any).movement_type ?? "รับเข้า",
    department: r.department,
    operator: r.operator,
    quantity: r.quantity,
    quantityLost: (r as any).quantity_lost ?? 0,
    remarks: r.remarks,
  };
}

function rowToAudit(r: Tables<"audit_logs">): AuditLog {
  return {
    id: r.id,
    dateTime: r.date_time,
    user: r.user_name,
    action: r.action,
    target: r.target,
    details: r.details,
  };
}

// ── Store ───────────────────────────────────────────────────
type Listener = () => void;

class WipStore {
  jobs: WipJob[] = [];
  movements: Movement[] = [];
  auditLogs: AuditLog[] = [];
  loading = true;
  private listeners: Set<Listener> = new Set();

  constructor() { this.init(); }
  private notify() { this.listeners.forEach(l => l()); }
  subscribe(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }

  async init() {
    await Promise.all([this.fetchJobs(), this.fetchMovements(), this.fetchAuditLogs()]);
    this.loading = false;
    this.notify();
    this.subscribeRealtime();
  }

  // ── Fetch ───────────────────────────────────────────────
  async fetchJobs() {
    const { data } = await supabase
      .from("wip_jobs").select("*")
      // งานค้างขึ้นก่อน: เรียงตามวันรับเข้าเก่าสุด (ค้างนานสุด) → ใหม่สุด
      .order("date_received", { ascending: true });
    if (data) { this.jobs = data.map(rowToJob); this.notify(); }
  }

  async fetchMovements() {
    const { data } = await supabase.from("wip_movements").select("*")
      .order("date_time", { ascending: false }).limit(1000);
    if (data) { this.movements = data.map(rowToMovement); this.notify(); }
  }

  async fetchAuditLogs() {
    const { data } = await supabase.from("audit_logs").select("*")
      .order("date_time", { ascending: false }).limit(500);
    if (data) { this.auditLogs = data.map(rowToAudit); this.notify(); }
  }

  private subscribeRealtime() {
    supabase.channel("wip-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wip_jobs" }, () => this.fetchJobs())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wip_movements" }, (payload) => {
        const r = payload.new as Tables<"wip_movements">;
        this.movements = [rowToMovement(r), ...this.movements];
        this.notify();
      })
      .subscribe();
  }

  // ── รับเข้าครั้งแรก ────────────────────────────────────
  async addJob(job: Omit<WipJob, "id" | "isCompleted" | "quantityLost" | "quantityOriginal">, operatorName: string, userId?: string) {
    const now = new Date().toISOString();
    const insert: any = {
      production_order_no: job.productionOrderNo,
      customer: job.customer,
      product_name: job.productName,
      box_size: job.boxSize,
      quantity: job.quantity,
      quantity_original: job.quantity,
      quantity_lost: 0,
      date_received: now,          // datetime เต็ม
      delivery_deadline: job.deliveryDeadline || null,
      current_status: "รับเข้าคลัง" as WipStatus,
      next_process: "รอพิมพ์",
      responsible_dept: "คลังสินค้า",
      remarks: job.remarks,
      image_url: job.imageUrl ?? null,
      created_by: null,
      is_completed: false,
    };

    const { data, error } = await supabase.from("wip_jobs").insert(insert).select().single();
    if (error) throw new Error(error.message);
    const newJob = rowToJob(data);

    await supabase.from("wip_movements").insert({
      job_id: newJob.id,
      production_order_no: newJob.productionOrderNo,
      from_status: "รับเข้าคลัง",
      to_status: "รับเข้าคลัง",
      movement_type: "รับเข้า",
      department: "คลังสินค้า",
      operator: operatorName,
      quantity: newJob.quantity,
      quantity_lost: 0,
      remarks: "รับเข้าใหม่",
    } as any);

    await this.insertAudit(operatorName, userId, "รับเข้าใหม่", newJob.productionOrderNo, `รับเข้า ${newJob.quantity} ใบ`);
    this.jobs = [newJob, ...this.jobs];
    this.notify();
    return newJob;
  }

  // ── รับเข้ารอบสอง (งานกลับจากแผนก) ───────────────────
  async receiveReturn(jobId: string, quantity: number, operatorName: string, remarks = "", userId?: string) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) throw new Error("ไม่พบงาน");
    const now = new Date().toISOString();

    const update: any = {
      quantity,
      current_status: "รับเข้าคลัง" as WipStatus,
      next_process: "รอพิมพ์",
      responsible_dept: "คลังสินค้า",
      date_received: now,
    };
    const { error } = await supabase.from("wip_jobs").update(update).eq("id", jobId);
    if (error) throw new Error(error.message);

    await supabase.from("wip_movements").insert({
      job_id: jobId,
      production_order_no: job.productionOrderNo,
      from_status: job.currentStatus,
      to_status: "รับเข้าคลัง",
      movement_type: "รับเข้า",
      department: "คลังสินค้า",
      operator: operatorName,
      quantity,
      quantity_lost: job.quantity - quantity,
      remarks: remarks || "รับกลับเข้าคลัง",
    } as any);

    await this.insertAudit(operatorName, userId, "รับกลับเข้าคลัง", job.productionOrderNo,
      `รับกลับ ${quantity} ใบ (เสีย ${job.quantity - quantity} ใบ)`);

    this.jobs = this.jobs.map(j => j.id === jobId
      ? { ...j, quantity, currentStatus: "รับเข้าคลัง", nextProcess: "รอพิมพ์", responsibleDept: "คลังสินค้า", dateReceived: now }
      : j);
    this.notify();
  }

  // ── จ่ายออกไปแผนก ─────────────────────────────────────
  async dispatchOut(jobId: string, toStatus: WipStatus, quantity: number, quantityLost: number,
    operatorName: string, remarks = "", userId?: string) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) throw new Error("ไม่พบงาน");
    const dept = STATUS_DEPT_MAP[toStatus] ?? job.responsibleDept;
    const idx = STATUS_FLOW.indexOf(toStatus);
    const nextProcess = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    const newLost = job.quantityLost + quantityLost;

    const update: any = {
      current_status: toStatus,
      next_process: nextProcess,
      responsible_dept: dept,
      quantity,
      quantity_lost: newLost,
    };
    const { error } = await supabase.from("wip_jobs").update(update).eq("id", jobId);
    if (error) throw new Error(error.message);

    await supabase.from("wip_movements").insert({
      job_id: jobId,
      production_order_no: job.productionOrderNo,
      from_status: job.currentStatus,
      to_status: toStatus,
      movement_type: "จ่ายออก",
      department: dept,
      operator: operatorName,
      quantity,
      quantity_lost: quantityLost,
      remarks,
    } as any);

    await this.insertAudit(operatorName, userId, "จ่ายออก", job.productionOrderNo,
      `จ่ายออก ${quantity} ใบ → ${toStatus} (เสีย ${quantityLost} ใบ)`);

    this.jobs = this.jobs.map(j => j.id === jobId
      ? { ...j, currentStatus: toStatus, nextProcess, responsibleDept: dept, quantity, quantityLost: newLost }
      : j);
    this.notify();
  }

  // ── จบงาน ─────────────────────────────────────────────
  async completeJob(jobId: string, operatorName: string, remarks = "", userId?: string) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) throw new Error("ไม่พบงาน");

    const update: any = { current_status: "พร้อมส่งมอบ", is_completed: true, next_process: "-" };
    const { error } = await supabase.from("wip_jobs").update(update).eq("id", jobId);
    if (error) throw new Error(error.message);

    await supabase.from("wip_movements").insert({
      job_id: jobId,
      production_order_no: job.productionOrderNo,
      from_status: job.currentStatus,
      to_status: "พร้อมส่งมอบ",
      movement_type: "จบงาน",
      department: job.responsibleDept,
      operator: operatorName,
      quantity: job.quantity,
      quantity_lost: 0,
      remarks: remarks || "จบงาน",
    } as any);

    await this.insertAudit(operatorName, userId, "จบงาน", job.productionOrderNo, remarks || "จบงาน");
    this.jobs = this.jobs.map(j => j.id === jobId
      ? { ...j, currentStatus: "พร้อมส่งมอบ", isCompleted: true, nextProcess: "-" }
      : j);
    this.notify();
  }

  async deleteJob(jobId: string, operatorName: string, userId?: string) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;
    const { error } = await supabase.from("wip_jobs").delete().eq("id", jobId);
    if (error) throw new Error(error.message);
    await this.insertAudit(operatorName, userId, "ลบงาน", job.productionOrderNo, "ลบจากระบบ");
    this.jobs = this.jobs.filter(j => j.id !== jobId);
    this.notify();
  }

  // kept for compat
  async updateJobStatus(jobId: string, newStatus: WipStatus, operatorName: string, remarks = "", userId?: string) {
    await this.dispatchOut(jobId, newStatus, this.jobs.find(j=>j.id===jobId)?.quantity ?? 0, 0, operatorName, remarks, userId);
  }

  private async insertAudit(userName: string, userId: string|undefined, action: string, target: string, details: string) {
    const { data } = await supabase.from("audit_logs")
      .insert({ user_name: userName, user_id: null, action, target, details })
      .select().single();
    if (data) { this.auditLogs = [rowToAudit(data), ...this.auditLogs]; this.notify(); }
  }
}

export const store = new WipStore();

// ── Helpers ─────────────────────────────────────────────────
export function getPendingDays(received: string) {
  return Math.floor((Date.now() - new Date(received).getTime()) / (1000*60*60*24));
}
export function fmtDateTime(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
export function fmtNum(n: number) {
  return n.toLocaleString("th-TH");
}

// Legacy compat
export interface User { username: string; password: string; displayName: string; role: Role; department: string; }
export const USERS: User[] = [];
// Legacy getDueStatus alias
export function getDueStatus(deadline: string) { return getUrgency(deadline); }
