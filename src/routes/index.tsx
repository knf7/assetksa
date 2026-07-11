import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IT Asset Inventory - KFH" },
      { name: "description", content: "نظام جرد الأصول التقنية لمستشفى الملك فهد باستخدام الذكاء الاصطناعي" },
    ],
  }),
  component: Index,
});

type AssetRow = {
  department: string;
  ministry_tag: string;
  device_type: string;
  manufacturer: string;
  serial_number: string;
};

const empty: AssetRow = {
  department: "KFH",
  ministry_tag: "",
  device_type: "",
  manufacturer: "",
  serial_number: "",
};

function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [row, setRow] = useState<AssetRow>(empty);
  const [saved, setSaved] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function onFile(f: File | null | undefined) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function analyze() {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRow({
        department: "KFH",
        ministry_tag: data.ministry_tag || "",
        device_type: data.device_type || "",
        manufacturer: data.manufacturer || "",
        serial_number: data.serial_number || "",
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function save() {
    setSaved((s) => [...s, row]);
    setRow(empty);
    setImage(null);
  }

  function exportCsv() {
    if (saved.length === 0) return;
    const header = Array<string>(29).fill("");
    header[0] = "Department";
    header[5] = "Ministry Tag";
    header[6] = "Device Type";
    header[7] = "Manufacturer";
    header[8] = "Serial Number";
    const rows = saved.map((r) => {
      const row = Array<string>(29).fill("");
      row[0] = r.department;
      row[5] = r.ministry_tag;
      row[6] = r.device_type;
      row[7] = r.manufacturer;
      row[8] = r.serial_number;
      return row;
    });
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kfh-assets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-2xl font-bold">نظام جرد الأصول التقنية</h1>
          <p className="text-sm text-muted-foreground">مستشفى الملك فهد · IT Asset Inventory</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">1) صورة الجهاز</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => camRef.current?.click()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              التقاط بالكاميرا
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              رفع صورة
            </button>
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          {image && (
            <div className="mt-4 space-y-3">
              <img src={image} alt="preview" className="max-h-72 rounded-md border" />
              <button
                onClick={analyze}
                disabled={loading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "جاري التحليل..." : "تحليل الصورة بالذكاء الاصطناعي"}
              </button>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-destructive">خطأ: {error}</p>}
        </section>

        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">2) مراجعة البيانات</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["department", "Department (القسم)"],
                ["ministry_tag", "Ministry Tag (وسم الوزارة)"],
                ["device_type", "Device Type (نوع الجهاز)"],
                ["manufacturer", "Manufacturer (الشركة المصنعة)"],
                ["serial_number", "Serial Number (الرقم التسلسلي)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="block text-sm">
                <span className="mb-1 block font-medium">{label}</span>
                <input
                  value={row[k]}
                  onChange={(e) => setRow({ ...row, [k]: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  dir="ltr"
                />
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={save}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              حفظ الصف
            </button>
            <button
              onClick={() => setRow(empty)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              مسح
            </button>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">3) الصفوف المحفوظة ({saved.length})</h2>
            <button
              onClick={exportCsv}
              disabled={saved.length === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              تصدير CSV (29 عمود)
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد صفوف بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className="p-2">Department</th>
                    <th className="p-2">Ministry Tag</th>
                    <th className="p-2">Device Type</th>
                    <th className="p-2">Manufacturer</th>
                    <th className="p-2">Serial</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{r.department}</td>
                      <td className="p-2" dir="ltr">{r.ministry_tag}</td>
                      <td className="p-2" dir="ltr">{r.device_type}</td>
                      <td className="p-2" dir="ltr">{r.manufacturer}</td>
                      <td className="p-2" dir="ltr">{r.serial_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            ملاحظة: ربط Google Sheets المباشر يحتاج خطوة إعداد إضافية (Service Account). حالياً تقدر تصدر CSV وتلصقه في الشيت.
          </p>
        </section>
      </main>
    </div>
  );
}
