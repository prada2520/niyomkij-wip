import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { store, STATUS_FLOW, STATUS_DEPT_MAP, validatePO, fmtDateTime, type WipJob, type WipStatus } from "@/lib/wip-data";
import { extractOrderFromImage } from "@/lib/ocr.functions";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Save, ImageIcon, Sparkles, Loader2, Camera, X, Search, PackageCheck, PackageMinus, CheckCircle2 } from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/receiving")({
  head: () => ({ meta: [{ title: "รับเข้า/จ่ายออก — NIYOMKIJ WIP WMS" }] }),
  component: Receiving,
});

async function uploadToStorage(file: File, poNo: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `wip-documents/${poNo}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`อัปโหลดไม่สำเร็จ: ${error.message}`);
  return supabase.storage.from("documents").getPublicUrl(path).data.publicUrl;
}

type Mode = "new" | "return" | "dispatch" | "complete";

function Receiving() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const extract = useServerFn(extractOrderFromImage);

  const [mode, setMode] = useState<Mode>("new");

  // PO lookup
  const [lookupPO, setLookupPO] = useState("");
  const [foundJob, setFoundJob] = useState<WipJob | null>(null);
  const [lookupErr, setLookupErr] = useState("");

  // image — แสดงทันทีที่เลือก แยกจาก OCR
  const [imgPreview, setImgPreview] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  // new job form
  const [form, setForm] = useState({
    productionOrderNo: "", customer: "", productName: "", boxSize: "",
    quantity: 0, deliveryDeadline: "", remarks: "",
  });
  const [poErr, setPoErr] = useState("");

  // dispatch/return/complete fields
  const [dispatchStatus, setDispatchStatus] = useState<WipStatus>("รอพิมพ์");
  const [dispatchQty, setDispatchQty] = useState(0);
  const [dispatchLost, setDispatchLost] = useState(0);
  const [dispatchRemark, setDispatchRemark] = useState("");
  const [returnQty, setReturnQty] = useState(0);
  const [returnRemark, setReturnRemark] = useState("");
  const [completeRemark, setCompleteRemark] = useState("");

  // prefill from tracking page via sessionStorage
  useEffect(() => {
    const po   = sessionStorage.getItem("wip_prefill_po");
    const mode = sessionStorage.getItem("wip_prefill_mode") as Mode | null;
    if (po && mode) {
      sessionStorage.removeItem("wip_prefill_po");
      sessionStorage.removeItem("wip_prefill_mode");
      setMode(mode);
      setLookupPO(po);
      const job = store.jobs.find(j => j.productionOrderNo === po);
      if (job) {
        setFoundJob(job);
        setDispatchQty(job.quantity);
        setReturnQty(job.quantity);
      }
    }
  }, []);

  // ── เลือกรูป — แสดง preview ทันที แล้วค่อย scan ──────────
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // แสดง preview ทันที ไม่รอ OCR
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImgPreview(dataUrl);
      setImgFile(file);
      setUploadedUrl("");
      // OCR แบบ async ไม่ block UI
      runScanAsync(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runScanAsync = async (dataUrl: string) => {
    setScanning(true);
    try {
      const res = await extract({ data: { imageDataUrl: dataUrl } });
      if (!res.ok) {
        // ไม่มี API key หรือ error — ไม่แสดง error ให้กรอกเองได้เลย
        if (res.error && !res.error.includes("API Key")) {
          toast.warning(`OCR: ${res.error}`);
        }
        return;
      }
      const f = res.fields!;
      setForm(prev => ({
        ...prev,
        productionOrderNo: f.productionOrderNo || prev.productionOrderNo,
        customer:          f.customer          || prev.customer,
        productName:       f.productName       || prev.productName,
        boxSize:           f.boxSize           || prev.boxSize,
        quantity:          f.quantity          ?? prev.quantity,
        deliveryDeadline:  f.deliveryDeadline  || prev.deliveryDeadline,
        remarks:           f.remarks           || prev.remarks,
      }));
      toast.success("AI กรอกข้อมูลจากรูปแล้ว — ตรวจสอบอีกครั้งก่อนบันทึก");
    } catch {
      // ข้ามถ้า server fn ไม่พร้อม
    } finally {
      setScanning(false);
    }
  };

  // ── PO Lookup ─────────────────────────────────────────────
  const doLookup = () => {
    setLookupErr("");
    const job = store.jobs.find(j => j.productionOrderNo === lookupPO.trim());
    if (!job) { setLookupErr("ไม่พบเลข PO นี้ในระบบ"); setFoundJob(null); return; }
    setFoundJob(job);
    setDispatchQty(job.quantity);
    setReturnQty(job.quantity);
    setDispatchLost(0);
  };

  // ── Submit รับเข้าใหม่ ────────────────────────────────────
  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePO(form.productionOrderNo)) { setPoErr("PO ต้องเป็นตัวเลข 8 หลักเท่านั้น"); return; }
    if (!form.customer) { toast.error("กรุณากรอกชื่อลูกค้า"); return; }
    setSaving(true);
    try {
      let imageUrl = uploadedUrl;
      if (imgFile && !imageUrl) {
        const t = toast.loading("กำลังอัปโหลดเอกสาร...");
        try {
          imageUrl = await uploadToStorage(imgFile, form.productionOrderNo);
          setUploadedUrl(imageUrl);
        } catch { toast.error("อัปโหลดรูปไม่สำเร็จ — บันทึกโดยไม่มีรูป"); }
        finally { toast.dismiss(t); }
      }
      await store.addJob(
        { ...form, currentStatus: "รับเข้าคลัง", nextProcess: "รอพิมพ์",
          responsibleDept: "คลังสินค้า", dateReceived: new Date().toISOString(),
          imageUrl: imageUrl || undefined },
        user?.displayName || "ระบบ", user?.id,
      );
      toast.success("รับเข้าคลังสำเร็จ");
      navigate({ to: "/tracking" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally { setSaving(false); }
  };

  const submitReturn = async () => {
    if (!foundJob) return;
    setSaving(true);
    try {
      await store.receiveReturn(foundJob.id, returnQty, user?.displayName || "ระบบ", returnRemark, user?.id);
      toast.success("รับกลับเข้าคลังสำเร็จ");
      navigate({ to: "/tracking" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  };

  const submitDispatch = async () => {
    if (!foundJob) return;
    setSaving(true);
    try {
      await store.dispatchOut(foundJob.id, dispatchStatus, dispatchQty, dispatchLost,
        user?.displayName || "ระบบ", dispatchRemark, user?.id);
      toast.success(`จ่ายออกไป ${dispatchStatus} สำเร็จ`);
      navigate({ to: "/tracking" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  };

  const submitComplete = async () => {
    if (!foundJob) return;
    if (!confirm(`ยืนยันจบงาน PO ${foundJob.productionOrderNo}?`)) return;
    setSaving(true);
    try {
      await store.completeJob(foundJob.id, user?.displayName || "ระบบ", completeRemark, user?.id);
      toast.success("จบงานเรียบร้อย");
      navigate({ to: "/tracking" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <Toaster richColors position="top-right" />
      <div className="p-8 max-w-5xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">รับเข้า / จ่ายออก / จบงาน</h1>
          <p className="text-muted-foreground mt-1">บันทึกการเคลื่อนไหวของงาน WIP</p>
        </header>

        {/* Mode Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {([
            { key: "new",      label: "📥 รับเข้าใหม่",      color: "green"  },
            { key: "return",   label: "🔄 รับกลับเข้าคลัง",  color: "blue"   },
            { key: "dispatch", label: "📤 จ่ายออกแผนก",      color: "amber"  },
            { key: "complete", label: "✅ จบงาน",             color: "purple" },
          ] as const).map(btn => (
            <button key={btn.key} type="button"
              onClick={() => { setMode(btn.key); setFoundJob(null); setLookupPO(""); setLookupErr(""); }}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all border
                ${mode === btn.key
                  ? `bg-${btn.color}-600 text-white border-${btn.color}-600 shadow-md`
                  : "bg-card border-border hover:bg-secondary"}`}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* ══ รับเข้าใหม่ ══ */}
        {mode === "new" && (
          <form onSubmit={submitNew} className="grid lg:grid-cols-3 gap-6">
            {/* Image Panel */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Sparkles className="h-4 w-4 text-primary"/>
                  ถ่ายรูปใบสั่งผลิต
                  {scanning && <span className="text-xs text-muted-foreground ml-1">(AI กำลังอ่าน...)</span>}
                </div>

                {/* Preview — แสดงทันทีที่เลือกรูป */}
                <div className="relative border-2 border-dashed border-border rounded-lg aspect-[3/4] overflow-hidden bg-secondary/20">
                  {imgPreview ? (
                    <>
                      <img src={imgPreview} alt="เอกสาร" className="w-full h-full object-cover"/>
                      {/* Scan indicator — overlay เบาๆ ไม่บัง UI */}
                      {scanning && (
                        <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin"/> AI กำลังอ่าน...
                        </div>
                      )}
                      {uploadedUrl && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-green-600/90 text-white text-xs px-2 py-1 rounded">✓ อัปโหลดสำเร็จ</div>
                        </div>
                      )}
                      <button type="button"
                        onClick={() => { setImgPreview(""); setImgFile(null); setUploadedUrl(""); }}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow">
                        <X className="h-3.5 w-3.5"/>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                      <ImageIcon className="h-12 w-12 opacity-30"/>
                      <div className="text-sm">ยังไม่มีรูปเอกสาร</div>
                      <div className="text-xs opacity-60">JPG, PNG</div>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-secondary text-secondary-foreground text-sm cursor-pointer hover:bg-secondary/80 select-none">
                    <Upload className="h-4 w-4"/> เลือกรูป
                    <input type="file" accept="image/*" onChange={onFile} className="hidden"/>
                  </label>
                  <label className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-secondary text-secondary-foreground text-sm cursor-pointer hover:bg-secondary/80 select-none">
                    <Camera className="h-4 w-4"/> ถ่ายรูป
                    <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden"/>
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  💡 เลือกรูปแล้วแสดงทันที AI จะพยายามกรอกข้อมูลให้อัตโนมัติ (ถ้ามี API Key)
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-semibold">ข้อมูลใบสั่งผลิต</h2>
                <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  🕐 {new Date().toLocaleString("th-TH")}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Field label="เลขที่ใบสั่งผลิต * (8 หลัก)">
                    <input required maxLength={8} value={form.productionOrderNo}
                      onChange={e => { setForm({...form, productionOrderNo: e.target.value.replace(/\D/g,"")}); setPoErr(""); }}
                      className={`${inp} ${poErr ? "border-destructive" : ""}`} placeholder="20260001"/>
                  </Field>
                  {poErr && <p className="text-xs text-destructive mt-1">{poErr}</p>}
                </div>
                <Field label="ลูกค้า *">
                  <input required value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} className={inp}/>
                </Field>
                <Field label="ชื่อสินค้า">
                  <input value={form.productName} onChange={e => setForm({...form, productName: e.target.value})} className={inp}/>
                </Field>
                <Field label="ขนาดกล่อง">
                  <input value={form.boxSize} onChange={e => setForm({...form, boxSize: e.target.value})} className={inp} placeholder="30x20x15 cm"/>
                </Field>
                <Field label="จำนวน (ใบ)">
                  <input type="number" min={1} value={form.quantity}
                    onChange={e => setForm({...form, quantity: +e.target.value})} className={inp}/>
                </Field>
                <Field label="กำหนดส่งมอบ">
                  <input type="date" value={form.deliveryDeadline}
                    onChange={e => setForm({...form, deliveryDeadline: e.target.value})} className={inp}/>
                </Field>
                <div className="md:col-span-2 grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg text-sm">
                  <div><span className="text-muted-foreground">สถานะเริ่มต้น:</span> <strong>รับเข้าคลัง</strong></div>
                  <div><span className="text-muted-foreground">แผนก:</span> <strong>คลังสินค้า</strong></div>
                </div>
                <div className="md:col-span-2">
                  <Field label="หมายเหตุ">
                    <textarea value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} className={inp} rows={2}/>
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                  {saving ? "กำลังบันทึก..." : "บันทึกรับเข้า"}
                </button>
                <button type="button" onClick={() => navigate({ to: "/tracking" })} disabled={saving}
                  className="px-5 py-2.5 rounded-md border border-border hover:bg-secondary">ยกเลิก</button>
              </div>
            </div>
          </form>
        )}

        {/* ══ รับกลับ / จ่ายออก / จบงาน ══ */}
        {mode !== "new" && (
          <div className="space-y-5">
            {/* PO Lookup */}
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h2 className="font-semibold mb-3">ค้นหาเลข PO</h2>
              <div className="flex gap-2">
                <input value={lookupPO}
                  onChange={e => setLookupPO(e.target.value.replace(/\D/g,""))}
                  maxLength={8} placeholder="กรอกเลข PO 8 หลัก" className={`${inp} flex-1`}
                  onKeyDown={e => e.key === "Enter" && doLookup()}/>
                <button type="button" onClick={doLookup}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
                  <Search className="h-4 w-4"/> ค้นหา
                </button>
              </div>
              {lookupErr && <p className="text-sm text-destructive mt-2">{lookupErr}</p>}
            </div>

            {/* Job Info */}
            {foundJob && (
              <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                <h3 className="font-semibold mb-3 text-primary">📦 PO {foundJob.productionOrderNo} — {foundJob.customer}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Info label="สินค้า"          value={foundJob.productName}/>
                  <Info label="สถานะปัจจุบัน"  value={foundJob.currentStatus}/>
                  <Info label="แผนก"            value={foundJob.responsibleDept}/>
                  <Info label="จำนวนคงเหลือ"   value={`${foundJob.quantity.toLocaleString()} ใบ`}/>
                  <Info label="จำนวนเริ่มต้น"   value={`${foundJob.quantityOriginal.toLocaleString()} ใบ`}/>
                  <Info label="เสียสะสม"        value={`${foundJob.quantityLost.toLocaleString()} ใบ`}/>
                  <Info label="รับเข้าล่าสุด"   value={fmtDateTime(foundJob.dateReceived)}/>
                </div>
              </div>
            )}

            {/* รับกลับ */}
            {mode === "return" && foundJob && (
              <div className="bg-card border border-blue-200 rounded-lg p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-blue-700">🔄 รับกลับเข้าคลัง</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={`จำนวนที่รับกลับ (ออกไป ${foundJob.quantity.toLocaleString()} ใบ)`}>
                    <input type="number" min={0} max={foundJob.quantity} value={returnQty}
                      onChange={e => setReturnQty(+e.target.value)} className={inp}/>
                  </Field>
                  <div className="flex items-end">
                    <div className="text-sm p-3 bg-orange-50 border border-orange-200 rounded-md w-full">
                      เสียในขั้นตอนนี้: <strong className="text-orange-700">{(foundJob.quantity - returnQty).toLocaleString()} ใบ</strong>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="หมายเหตุ">
                      <input value={returnRemark} onChange={e => setReturnRemark(e.target.value)} className={inp}/>
                    </Field>
                  </div>
                </div>
                <button type="button" onClick={submitReturn} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <PackageCheck className="h-4 w-4"/>}
                  ยืนยันรับกลับ
                </button>
              </div>
            )}

            {/* จ่ายออก */}
            {mode === "dispatch" && foundJob && (
              <div className="bg-card border border-amber-200 rounded-lg p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-amber-700">📤 จ่ายออกแผนก</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="สถานะ / แผนกปลายทาง">
                    <select value={dispatchStatus} onChange={e => setDispatchStatus(e.target.value as WipStatus)} className={inp}>
                      {STATUS_FLOW.filter(s => s !== "รับเข้าคลัง").map(s => (
                        <option key={s} value={s}>{s} — {STATUS_DEPT_MAP[s]}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="p-3 bg-secondary/30 rounded-md text-sm flex items-center">
                    แผนกรับผิดชอบ: <strong className="ml-2">{STATUS_DEPT_MAP[dispatchStatus]}</strong>
                  </div>
                  <Field label={`จำนวนจ่ายออก (คงเหลือ ${foundJob.quantity.toLocaleString()} ใบ)`}>
                    <input type="number" min={0} max={foundJob.quantity} value={dispatchQty}
                      onChange={e => setDispatchQty(+e.target.value)} className={inp}/>
                  </Field>
                  <Field label="เสียก่อนจ่ายออก (ถ้ามี)">
                    <input type="number" min={0} value={dispatchLost}
                      onChange={e => setDispatchLost(+e.target.value)} className={inp}/>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="หมายเหตุ">
                      <input value={dispatchRemark} onChange={e => setDispatchRemark(e.target.value)} className={inp}/>
                    </Field>
                  </div>
                </div>
                <button type="button" onClick={submitDispatch} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <PackageMinus className="h-4 w-4"/>}
                  ยืนยันจ่ายออก
                </button>
              </div>
            )}

            {/* จบงาน */}
            {mode === "complete" && foundJob && (
              <div className="bg-card border border-purple-200 rounded-lg p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-purple-700">✅ จบงาน</h3>
                <div className="p-4 bg-purple-50 rounded-lg text-sm space-y-1">
                  <div>จำนวนส่งมอบ: <strong>{foundJob.quantity.toLocaleString()} ใบ</strong></div>
                  <div>เสียทั้งหมด: <strong className="text-orange-700">{foundJob.quantityLost.toLocaleString()} ใบ</strong>
                    {foundJob.quantityOriginal > 0 && (
                      <span className="text-muted-foreground ml-2">
                        ({((foundJob.quantityLost / foundJob.quantityOriginal) * 100).toFixed(1)}% จากเริ่มต้น {foundJob.quantityOriginal.toLocaleString()} ใบ)
                      </span>
                    )}
                  </div>
                </div>
                <Field label="หมายเหตุ">
                  <input value={completeRemark} onChange={e => setCompleteRemark(e.target.value)}
                    className={inp} placeholder="เช่น ส่งมอบให้ลูกค้าแล้ว"/>
                </Field>
                <button type="button" onClick={submitComplete} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
                  ยืนยันจบงาน
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/30 rounded p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-sm mt-0.5">{value || "—"}</div>
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-ring text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>{children}</div>;
}
