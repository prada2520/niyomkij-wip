import { createServerFn } from "@tanstack/react-start";

interface ExtractedFields {
  productionOrderNo?: string;
  customer?: string;
  productName?: string;
  boxSize?: string;
  quantity?: number;
  dateReceived?: string;
  deliveryDeadline?: string;
  remarks?: string;
}

export const extractOrderFromImage = createServerFn({ method: "POST" })
  .inputValidator((d: { imageDataUrl: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; fields?: ExtractedFields; error?: string }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.LOVABLE_API_KEY;

    if (!apiKey) {
      return { ok: false, error: "ไม่มี API Key" };
    }

    try {
      // แยก base64 และ mediaType จาก dataURL
      const parts = data.imageDataUrl.split(",");
      const base64 = parts[1];
      const mimeMatch = parts[0].match(/data:([^;]+);/);
      let mediaType = (mimeMatch?.[1] ?? "image/jpeg") as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp";

      // Anthropic รองรับเฉพาะ jpeg, png, gif, webp
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)) {
        mediaType = "image/jpeg";
      }

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `อ่านใบสั่งผลิตในรูปนี้ แล้วตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น ไม่ต้องมี markdown
รูปแบบ JSON:
{
  "productionOrderNo": "เลขที่ใบสั่งผลิต (ตัวเลขเท่านั้น)",
  "customer": "ชื่อลูกค้า",
  "productName": "ชื่อสินค้า",
  "boxSize": "ขนาดกล่อง",
  "quantity": 0,
  "deliveryDeadline": "YYYY-MM-DD",
  "remarks": "หมายเหตุ"
}
ถ้าไม่พบข้อมูลใด ให้ใส่ค่าว่าง`,
              },
            ],
          }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Anthropic error:", resp.status, errText);
        return { ok: false, error: `Anthropic error ${resp.status}` };
      }

      const json = await resp.json();
      const text = json.content?.[0]?.text ?? "";
      const clean = text.replace(/```json|```/g, "").trim();

      try {
        const fields = JSON.parse(clean) as ExtractedFields;
        return { ok: true, fields };
      } catch {
        return { ok: false, error: "อ่านข้อมูลจากรูปไม่ได้" };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
    }
  });
