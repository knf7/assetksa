import { createFileRoute } from "@tanstack/react-router";

type AppendBody = {
  spreadsheetId?: string;
  sheetName?: string;
  values?: string[];
};

export const Route = createFileRoute("/api/sheets-append")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { spreadsheetId, sheetName, values } = (await request.json()) as AppendBody;
          if (!spreadsheetId || !/^[a-zA-Z0-9-_]+$/.test(spreadsheetId)) {
            return Response.json({ error: "Google Sheet ID غير صحيح" }, { status: 400 });
          }
          if (!Array.isArray(values) || values.length === 0) {
            return Response.json({ error: "لا توجد بيانات للحفظ" }, { status: 400 });
          }

          const lovableKey = process.env.LOVABLE_API_KEY;
          const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
          if (!lovableKey || !sheetsKey) {
            return Response.json(
              {
                error:
                  "لم يتم ربط Google Sheets بالكامل. يرجى التأكد من إضافة المفاتيح (LOVABLE_API_KEY و GOOGLE_SHEETS_API_KEY) في إعدادات Secrets الخاصة بـ Lovable.",
              },
              { status: 500 }
            );
          }

          const tab = (sheetName || "Sheet1").trim() || "Sheet1";
          const range = encodeURIComponent(`'${tab}'!A:AE`);
          const url = `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

          const upstream = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": sheetsKey,
            },
            body: JSON.stringify({ values: [values] }),
          });

          const text = await upstream.text();
          if (!upstream.ok) {
            return Response.json({ error: text || "فشل الحفظ في Google Sheets" }, { status: upstream.status });
          }

          return Response.json({ ok: true, result: text ? JSON.parse(text) : null });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});