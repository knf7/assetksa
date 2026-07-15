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
              "X-Lovable-AIG-SDK": "direct-fetch",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-pro-preview",
              max_tokens: 1400,
              messages: [
                {
                  role: "system",
                  content: `You are a senior OCR and IT inventory data extraction engine for Saudi Ministry of Health (MOH) / King Fahad Hospital IT asset photos.

Return ONLY one raw JSON object. No markdown. No prose.

The user may upload device photos, asset labels, serial stickers, printer labels, BIOS/spec screens, Windows About screens, or mixed photos. Extract only what is visible with high confidence.

Return EXACTLY these keys:
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
- device_type: One of exactly: "Desktop computer", "Laptop", "All-in-One PC", "Monitor", "Printer", "Scanner", "UPS", "Docking Station", "Server", "Network Switch", "IP Phone", "Projector", "Tablet". Infer from the visible physical device if unmistakable.
- manufacturer: Canonical brand only: "HP", "Dell", "Lenovo", "Cisco", "Samsung", "Epson", "APC", "Acer", "Asus", "Apple", etc. Prefer the logo on the chassis over sticker text.
- serial_number: Manufacturer S/N, labeled "S/N", "SN", "Serial", usually under a barcode. Different from ministry_tag. Copy exactly.
- mac_address: Format XX-XX-XX-XX-XX-XX or XX:XX:XX:XX:XX:XX if visible.
- processor: e.g. "Intel Core i5", "Intel Core i7", "AMD Ryzen 5" if printed.
- windows_version: "Windows 10" or "Windows 11" if visible on sticker.
- ram: e.g. "8 GB", "16 GB" if printed.
- hdd: e.g. "500 GB", "1 TB" if printed.
- ssd: e.g. "256 GB", "480 GB" if printed.

STRICT VALIDATION (silent, before answering):
1. Every value except device_type/manufacturer MUST literally appear in the image. If not clearly visible, return "" — never guess.
2. ministry_tag MUST NOT equal serial_number.
3. Strip leading labels ("S/N:", "Asset Tag:", "Model:") from values.
4. No trailing spaces, no quotes inside values, no thousands separators.
5. If a barcode has text beneath it, extract the printed text, not the barcode pattern.
6. If there are multiple serial-looking values, choose the one nearest to S/N, SN, Serial No, or الرقم التسلسلي.
7. If the image is blurry/dark/too far and text cannot be read, leave text fields empty rather than hallucinating.`,
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
          const raw = data.choices?.[0]?.message?.content ?? "";
          let cleaned = raw.replace(/```json|```/g, "").trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) cleaned = match[0];
          let parsed: Record<string, unknown> = {};
          let parseError: string | null = null;
          try {
            parsed = JSON.parse(cleaned);
          } catch (e) {
            parseError = (e as Error).message;
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
          for (const k of keys) out[k] = ((parsed[k] as string) ?? "").toString().trim();
          const hasAny = Object.values(out).some((v) => v.length > 0);
          if (!hasAny) {
            return Response.json({ ...out, _debug: { raw, parseError } });
          }
          return Response.json(out);

        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
