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

              messages: [
                {
                  role: "system",
                  content: `You are an expert OCR system for Saudi Ministry of Health (MOH) IT asset labels at King Fahad Hospital (KFH).
Return ONLY a raw JSON object (no markdown, no fences, no prose) with EXACTLY these keys:
{
 "ministry_tag":"",
 "device_type":"",
 "manufacturer":"",
 "serial_number":"",
 "mac_address":"",
 "processor":"",
 "windows_version":"",
 "ram":"",
 "hdd":"",
 "ssd":""
}

FIELD DEFINITIONS:
- ministry_tag: MOH asset/inventory tag. Long numeric/alphanumeric code (e.g. "AHC002006907", "1140xxxx"). Labeled "MOH", "Asset Tag", "Property of MOH", "رقم الأصل", "الوزارة". NOT the manufacturer serial.
- device_type: One of exactly: "Desktop computer", "Laptop", "All-in-One PC", "Monitor", "Printer", "Scanner", "UPS", "Docking Station", "Server", "Network Switch", "IP Phone", "Projector", "Tablet". Infer from the physical device in the photo.
- manufacturer: Canonical brand only: "HP", "Dell", "Lenovo", "Cisco", "Samsung", "Epson", "APC", "Acer", "Asus", "Apple", etc. Prefer the logo on the chassis over sticker text.
- serial_number: Manufacturer S/N, labeled "S/N", "SN", "Serial", usually under a barcode. Different from ministry_tag. Copy exactly.
- mac_address: Format XX-XX-XX-XX-XX-XX or XX:XX:XX:XX:XX:XX if visible.
- processor: e.g. "Intel Core i5", "Intel Core i7", "AMD Ryzen 5" if printed.
- windows_version: "Windows 10" or "Windows 11" if visible on sticker.
- ram: e.g. "8 GB", "16 GB" if printed.
- hdd: e.g. "500 GB", "1 TB" if printed.
- ssd: e.g. "256 GB", "480 GB" if printed.

STRICT VALIDATION (silent, before answering):
1. Every value except device_type MUST literally appear in the image. If not clearly visible, return "" — never guess.
2. ministry_tag MUST NOT equal serial_number.
3. Strip leading labels ("S/N:", "Asset Tag:", "Model:") from values.
4. No trailing spaces, no quotes inside values, no thousands separators.`,
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Extract the fields from this KFH device label photo. Follow all rules. Return raw JSON only." },
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
          const keys = [
            "ministry_tag",
            "device_type",
            "manufacturer",
            "serial_number",
            "mac_address",
            "processor",
            "windows_version",
            "ram",
            "hdd",
            "ssd",
          ] as const;
          const out: Record<string, string> = {};
          for (const k of keys) out[k] = (parsed[k] ?? "").toString().trim();
          return Response.json(out);
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
