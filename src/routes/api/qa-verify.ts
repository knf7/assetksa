import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/qa-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { imageDataUrls?: string[]; extractedData: Record<string, string> };
          const images = body.imageDataUrls || [];
          const valid = images.filter((u) => typeof u === "string" && u.startsWith("data:image/"));
          if (valid.length === 0) {
            return Response.json({ error: "Invalid image data" }, { status: 400 });
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
              model: "gemini-2.0-flash",
              max_tokens: 1600,
              messages: [
                {
                  role: "system",
                  content: `You are a QA Agent for IT Asset Inventory. Your job is to verify extracted data against the provided images.
You will be provided with the current extracted data as JSON, and the images.
Check if the extracted data correctly matches the text visible in the images.
Return ONE raw JSON object exactly matching this interface:
{
  "isCorrect": boolean,
  "needsHumanVerification": boolean,
  "feedback": "A short note in Arabic explaining the result. E.g., 'البيانات متطابقة تماماً', 'الصورة غير واضحة جداً، يرجى التحقق اليدوي', or 'يوجد اختلاف في الرقم التسلسلي'."
}
No markdown, no prose.`
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: `Here is the extracted data:\n${JSON.stringify(body.extractedData, null, 2)}\n\nPlease verify against the provided images and return the JSON QA result.` },
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
          
          const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const raw = data.choices?.[0]?.message?.content ?? "";
          let cleaned = raw.replace(/```json|```/g, "").trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) cleaned = match[0];
          
          try {
            const parsed = JSON.parse(cleaned);
            return Response.json(parsed);
          } catch (e) {
            return Response.json({ isCorrect: false, needsHumanVerification: true, feedback: "تعذر قراءة نتيجة الوكيل الذكي، يرجى التحقق يدوياً." });
          }

        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
