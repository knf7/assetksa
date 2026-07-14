import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/extract-asset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { imageDataUrl } = (await request.json()) as { imageDataUrl: string };
          if (!imageDataUrl?.startsWith("data:image/")) {
            return Response.json({ error: "Invalid image data" }, { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return Response.json({ error: "Missing LOVABLE_API_KEY" }, { status: 500 });

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-pro-preview",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    `You are an expert OCR system for Saudi Ministry of Health (MOH) IT asset labels at King Fahad Hospital (KFH).
Return ONLY a raw JSON object (no markdown, no fences, no prose) with EXACTLY these keys:
{"ministry_tag":"","device_type":"","manufacturer":"","serial_number":""}

FIELD DEFINITIONS:
- ministry_tag: The MOH asset/inventory tag. Printed on an official ministry sticker, often labeled "MOH", "Asset Tag", "Asset No", "Property of MOH", "وزارة الصحة", "رقم الأصل", "الرقم الوزاري". Usually a long numeric or alphanumeric code (e.g. "1140xxxxxx", "MOH-xxxxx"). It is NOT the manufacturer's serial number.
- device_type: The KIND of device visible in the photo. Infer from the physical device, not from sticker text. Use English, Title Case, singular. Allowed examples: "Laptop", "Desktop", "All-in-One PC", "Monitor", "Printer", "Scanner", "UPS", "Docking Station", "Server", "Network Switch", "IP Phone", "Projector", "Tablet".
- manufacturer: The brand of the device. Prefer the brand logo on the chassis over any sticker text. Return the canonical brand only (e.g. "HP", "Dell", "Lenovo", "Cisco", "Samsung", "Epson", "APC"), never a long legal name.
- serial_number: The manufacturer's serial. Labeled "S/N", "SN", "Serial", "Serial No", usually under a barcode. Different from ministry_tag. Copy exactly, preserve case.

STRICT VALIDATION (perform silently before answering):
1. Every returned value (except device_type) MUST literally appear in the image. If not clearly visible or you are not confident, return "" for that field. Never guess.
2. ministry_tag MUST NOT equal serial_number.
3. Strip any leading labels ("S/N:", "Asset Tag:", "Model:") from the value itself.
4. No thousands separators, no surrounding quotes, no trailing spaces.
5. If the image shows only a partial label, fill only the fields you can verify and leave the rest as "".`,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Extract the 4 fields from this KFH device label photo. Follow all rules. Return raw JSON only.",
                    },
                    { type: "image_url", image_url: { url: imageDataUrl } },
                  ],
                },
              ],
            }),
          });

          if (!upstream.ok) {
            const body = await upstream.text();
            return Response.json({ error: body }, { status: upstream.status });
          }
          const data = (await upstream.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const raw = data.choices?.[0]?.message?.content ?? "{}";
          const cleaned = raw.replace(/```json|```/g, "").trim();
          let parsed: Record<string, string> = {};
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            parsed = {};
          }
          return Response.json({
            ministry_tag: parsed.ministry_tag ?? "",
            device_type: parsed.device_type ?? "",
            manufacturer: parsed.manufacturer ?? "",
            serial_number: parsed.serial_number ?? "",
          });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
