import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/extract-asset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { imageDataUrl?: string; imageDataUrls?: string[] };
          const images = (body.imageDataUrls && body.imageDataUrls.length > 0)
            ? body.imageDataUrls
            : body.imageDataUrl ? [body.imageDataUrl] : [];
          const valid = images.filter((u) => typeof u === "string" && u.startsWith("data:image/"));
          if (valid.length === 0) {
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
              max_tokens: 1600,
              messages: [
                {
                  role: "system",
                  content: `You are a highly precise OCR + IT-asset extraction engine for King Fahad Hospital (KFH / Saudi MOH) equipment photos.

Return ONLY ONE raw JSON object. No markdown fences. No prose. No trailing commas.

You will receive 1–5 photos of the SAME device (chassis, MOH asset sticker, S/N barcode label, BIOS/About screen, monitor labels). MERGE them into ONE answer.

Return EXACTLY these keys (all strings). If a value is not clearly visible in any photo, return "N/A" — never guess, never leave empty except for the CORE fields below:

{
 "ministry_tag":"",
 "device_type":"",
 "manufacturer":"",
 "serial_number":"",
 "mac_address":"N/A",
 "device_name":"N/A",
 "processor":"N/A",
 "windows_version":"N/A",
 "ram":"N/A",
 "hdd":"N/A",
 "ssd":"N/A",
 "connection_type":"N/A",
 "ip_type":"N/A",
 "in_moh_domain":"N/A",
 "lifecycle_stage":"In Use"
}

CORE fields (leave "" — NOT "N/A" — when unreadable, so the user knows to fill them):
  ministry_tag, device_type, manufacturer, serial_number

ENUMS — you MUST pick from these exact strings (case-sensitive):
- device_type: "All In One" | "Desktop computer" | "Laptop" | "Printer" | "UPS"
- manufacturer: "Brother" | "Dell" | "Eaton" | "Fujitsu Siemens" | "HP" | "Lenovo"
- windows_version: "Windows 10" | "Windows 11" | "N/A"
- processor: "Inter Cor i5" | "Inter Cor i7" | "N/A"   (yes, "Inter Cor" — match the sheet's spelling)
- ram: "8 GB" | "16 GB" | "N/A"
- hdd: "500 GB" | "1 TB" | "N/A"
- ssd: "120 GB" | "480 GB" | "N/A"
- connection_type: "Ethernet" | "WiFi" | "USB WiFi" | "N/A"
- ip_type: "Dynamic" | "Static" | "N/A"
- in_moh_domain: "YES" | "No" | "N/A"
- lifecycle_stage: "In Use"

FIELD RULES:
- ministry_tag: MOH inventory tag on the yellow/white MOH sticker. Usually starts with "AHC…" or is a long alphanumeric code. Labeled "MOH", "Asset Tag", "رقم الأصل". NEVER equals serial_number.
- serial_number: Manufacturer S/N, next to "S/N", "SN", "Serial", "الرقم التسلسلي" — usually under a barcode. Copy character-for-character.
- device_type: Infer from the physical device shape if the label is unclear (tower → Desktop computer, screen+base with no separate tower → All In One, clamshell → Laptop, paper feeder → Printer, battery box with outlets → UPS).
- manufacturer: Prefer the logo embossed on the chassis over sticker text. Snap to the enum.
- mac_address: Format XX-XX-XX-XX-XX-XX; only if explicitly labeled MAC.
- device_name: The hospital naming pattern like "E2-HS-KFHH-1852" if written on a sticker.
- windows_version: From the Windows COA sticker or the "About" screen.

STRICT VALIDATION (do silently, before answering):
1. ministry_tag != serial_number.
2. Strip label prefixes ("S/N:", "Asset Tag:", "Model:") from values.
3. No leading/trailing whitespace, no quotes inside values.
4. If a barcode has text beneath it, extract the printed text, not the pattern.
5. If several serial-looking codes exist, pick the one nearest "S/N"/"Serial"/"الرقم التسلسلي".
6. If the image is blurry/dark and text is unreadable, return "" for CORE fields and "N/A" for others — DO NOT hallucinate.
7. Any enum value you can't confidently match → "N/A".

Return ONE JSON object. Nothing else.`,
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: `Extract the fields from these ${valid.length} KFH device photo(s). Merge into one JSON. Follow the enum lists exactly. Return raw JSON only.` },
                    ...valid.map((url) => ({ type: "image_url" as const, image_url: { url } })),
                  ],
                },
              ],
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text();
            return Response.json({ error: text }, { status: upstream.status });
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
          try { parsed = JSON.parse(cleaned); } catch (e) { parseError = (e as Error).message; }

          const keys = [
            "ministry_tag","device_type","manufacturer","serial_number","mac_address",
            "device_name","processor","windows_version","ram","hdd","ssd",
            "connection_type","ip_type","in_moh_domain","lifecycle_stage",
          ] as const;
          const coreKeys = new Set(["ministry_tag","device_type","manufacturer","serial_number"]);
          const out: Record<string, string> = {};
          for (const k of keys) {
            const v = ((parsed[k] as string) ?? "").toString().trim();
            if (v.length === 0) {
              out[k] = coreKeys.has(k) ? "" : "N/A";
            } else {
              out[k] = v;
            }
          }
          const hasAny = Object.entries(out).some(([, v]) => v.length > 0 && v.toUpperCase() !== "N/A");
          if (!hasAny) return Response.json({ ...out, _debug: { raw, parseError } });
          return Response.json(out);
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
