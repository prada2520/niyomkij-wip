import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { WipJob } from "./wip-data";
import { getPendingDays, getDueStatus } from "./wip-data";

export function exportJobsExcel(jobs: WipJob[], filename = "wip-report.xlsx") {
  const rows = jobs.map((j, i) => ({
    "ลำดับ": i + 1,
    "PO No.": j.productionOrderNo,
    "ลูกค้า": j.customer,
    "สินค้า": j.productName,
    "ขนาด": j.boxSize,
    "จำนวน": j.quantity,
    "สถานะปัจจุบัน": j.currentStatus,
    "ถัดไป": j.nextProcess,
    "รับเข้า": j.dateReceived,
    "กำหนดส่ง": j.deliveryDeadline,
    "ค้าง (วัน)": getPendingDays(j.dateReceived),
    "แผนก": j.responsibleDept,
    "สถานะ": getDueStatus(j.deliveryDeadline),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "WIP Report");
  XLSX.writeFile(wb, filename);
}

export function exportJobsPDF(jobs: WipJob[], filename = "wip-report.pdf") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text("NIYOMKIJ - WIP Outstanding Status Report", 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["#", "PO No.", "Customer", "Product", "Size", "Qty", "Status", "Next", "Received", "Deadline", "Days", "Dept"]],
    body: jobs.map((j, i) => [
      i + 1, j.productionOrderNo, j.customer, j.productName, j.boxSize,
      j.quantity.toLocaleString(), j.currentStatus, j.nextProcess,
      j.dateReceived, j.deliveryDeadline, getPendingDays(j.dateReceived), j.responsibleDept,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(filename);
}
