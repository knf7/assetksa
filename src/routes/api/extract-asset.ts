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
              model: "google/gemini-3-flash-preview",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    "You extract IT asset label fields. Respond ONLY with a raw JSON object with keys: ministry_tag, device_type, manufacturer, serial_number. Use empty string for any missing field. No markdown, no code fences, no commentary.",
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Extract ministry_tag, device_type, manufacturer, serial_number from this device label image.",
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
