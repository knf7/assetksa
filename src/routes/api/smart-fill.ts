import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/smart-fill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { text?: string };
          const { text } = body;
          if (!text || text.trim().length === 0) {
            return Response.json({ error: "No text provided" }, { status: 400 });
          }

          const key = process.env.GEMINI_API_KEY;
          if (!key) return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

          const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "gemini-3.1-pro-preview",
              max_tokens: 1600,
              messages: [
                {
                  role: "system",
                  content: `You are an AI assistant for a hospital IT asset inventory system.
The user will provide you with an unstructured Arabic text describing some details about an IT device (e.g. its location, whether it's in use, if it needs maintenance, or any random notes).
Your job is to extract ONLY the fields mentioned in the text and return them as a strict JSON object.

Allowed keys in the JSON:
"department", "floor", "location", "last_maintenance", "next_maintenance", "ministry_tag", "device_type", "manufacturer", "serial_number", "mac_address", "device_name", "processor", "windows_version", "ram", "hdd", "ssd", "connection_type", "ip_type", "in_moh_domain", "lifecycle_stage", "device_age", "admin_local_user", "has_antivirus", "programming", "clean_device", "update", "need", "solution_by", "notes"

Rules:
1. ONLY return the keys that the user explicitly mentioned or strongly implied in their text. If a field is not mentioned, DO NOT include it in the JSON at all.
2. If the user mentions notes, issues, or missing parts (e.g. "مافي ماوس", "شاشته مكسورة"), put them in the "notes" field.
3. If the user mentions the device is "مستخدم" (in use), set "lifecycle_stage": "In Use". If they mention "غير مستخدم", "فاضي", "متروك" (not in use), set "lifecycle_stage": "Not In Use".
4. If the user specifies the department (e.g. "عيادة العظام", "الطوارئ"), set "department".
5. If the user specifies the floor (e.g. "الدور الأول", "البدروم"), set "floor".
6. If the user specifies the room/location (e.g. "غرفة 102", "عند الدكتور أحمد"), set "location".
7. RETURN ONLY RAW JSON. No markdown fences. No prose.`,
                },
                {
                  role: "user",
                  content: text,
                },
              ],
            }),
          });

          if (!upstream.ok) {
            const err = await upstream.text();
            return Response.json({ error: err }, { status: upstream.status });
          }

          const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const raw = data.choices?.[0]?.message?.content ?? "";
          let cleaned = raw.replace(/```json|```/g, "").trim();
          
          let parsed: Record<string, string> = {};
          try {
            parsed = JSON.parse(cleaned);
          } catch (e) {
            return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
          }

          return Response.json({ result: parsed });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
