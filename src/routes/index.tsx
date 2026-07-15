import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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
  floor: string;
  location: string;
  last_maintenance: string;
  next_maintenance: string;
  ministry_tag: string;
  device_type: string;
  manufacturer: string;
  serial_number: string;
  mac_address: string;
  device_name: string;
  lifecycle_stage: string;
  device_age: string;
  connection_type: string;
  in_moh_domain: string;
  admin_local_user: string;
  has_antivirus: string;
  programming: string;
  clean_device: string;
  ip_type: string;
  windows_version: string;
  processor: string;
  hdd: string;
  ssd: string;
  ram: string;
  notes: string;
  update: string;
  need: string;
  solution_by: string;
};

const empty: AssetRow = {
  department: "KFH",
  floor: "",
  location: "",
  last_maintenance: "",
  next_maintenance: "",
  ministry_tag: "",
  device_type: "",
  manufacturer: "",
  serial_number: "",
  mac_address: "",
  device_name: "",
  lifecycle_stage: "In Use",
  device_age: "",
  connection_type: "",
  in_moh_domain: "YES",
  admin_local_user: "Yes",
  has_antivirus: "Yes",
  programming: "",
  clean_device: "No Need",
  ip_type: "Dynamic",
  windows_version: "",
  processor: "",
  hdd: "",
  ssd: "",
  ram: "",
  notes: "",
  update: "",
  need: "",
  solution_by: "IT",
};

const DEVICE_TYPES = ["Desktop computer", "Laptop", "All-in-One PC", "Monitor", "Printer", "Scanner", "UPS", "Docking Station", "Server", "Network Switch", "IP Phone", "Projector", "Tablet"];
const MANUFACTURERS = ["HP", "Dell", "Lenovo", "Cisco", "Samsung", "Epson", "APC", "Acer", "Asus", "Apple", "Other"];
const FLOORS = ["G", "M", "B", "1", "2", "3", "4", "5"];
const LIFECYCLE = ["In Use", "In Storage", "Retired", "Under Repair"];
const AGE = ["Less Then 5 Years", "Less Then 10 Years", "More Then 10 Years"];
const CONNECTION = ["Ethernet", "WiFi", "USB WiFi", "None"];
const YESNO = ["YES", "NO"];
const YESNO_LC = ["Yes", "No"];
const IP_TYPE = ["Dynamic", "Static"];
const CLEAN = ["No Need", "Needed", "Done"];
const WINDOWS = ["Windows 10", "Windows 11", "Windows 7", "Other"];
const PROCESSORS = ["Inter Cor i3", "Inter Cor i5", "Inter Cor i7", "Inter Cor i9", "AMD Ryzen 5", "AMD Ryzen 7", "Other"];
const RAM_OPT = ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB"];
const STORAGE_OPT = ["", "120 GB", "240 GB", "256 GB", "480 GB", "500 GB", "1 TB", "2 TB"];
const SOLUTION_BY = ["IT", "Vendor", "Maintenance", ""];

const FREE_TIER_MONTHLY = 25000;

function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [row, setRow] = useState<AssetRow>(empty);
  const [saved, setSaved] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scans, setScans] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    const raw = localStorage.getItem("kfh-ai-usage");
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj.month === month) setScans(obj.count || 0);
      } catch {}
    }
    const s = localStorage.getItem("kfh-saved");
    if (s) {
      try { setSaved(JSON.parse(s)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kfh-saved", JSON.stringify(saved));
  }, [saved]);

  function bumpScans() {
    const month = new Date().toISOString().slice(0, 7);
    const next = scans + 1;
    setScans(next);
    localStorage.setItem("kfh-ai-usage", JSON.stringify({ month, count: next }));
  }

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
      bumpScans();
      const filled = ["ministry_tag","device_type","manufacturer","serial_number","mac_address","processor","windows_version","ram","hdd","ssd"]
        .filter((k) => (data[k] ?? "").toString().trim().length > 0);
      if (filled.length === 0) {
        const dbg = data._debug ? `\n\nرد الذكاء الاصطناعي:\n${(data._debug.raw || "(فارغ)").slice(0, 500)}` : "";
        throw new Error("لم يتم استخراج أي بيانات من الصورة. تأكد من وضوح الملصق والإضاءة." + dbg);
      }
      setRow((r) => ({
        ...r,
        ministry_tag: data.ministry_tag || r.ministry_tag,
        device_type: data.device_type || r.device_type,
        manufacturer: data.manufacturer || r.manufacturer,
        serial_number: data.serial_number || r.serial_number,
        mac_address: data.mac_address || r.mac_address,
        processor: data.processor || r.processor,
        windows_version: data.windows_version || r.windows_version,
        ram: data.ram || r.ram,
        hdd: data.hdd || r.hdd,
        ssd: data.ssd || r.ssd,
      }));

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeSaved(i: number) {
    setSaved((s) => s.filter((_, idx) => idx !== i));
  }

  function exportCsv() {
    if (saved.length === 0) return;
    const headers = [
      "Department","Floor","Name of Employee / Room","Last Maintenance Date","Next Maintenance Date",
      "Ministry Tag","Device Type","Device Manufacturer","Serial Number","MAC Address",
      "Device Name","Lifecycle Stage","How old is the device","Connection type","in MOH domain",
      "Admin Local User","Has Antivirus (Crowd & Kasper)","Programming","Clean Device","IP Static or Dynamic",
      "Windows Version","Processor type","HDD","SSD","RAM",
      "الملاحظات","Update","Need","Solution By","","ملاحظات غريبه",
    ];
    const order: (keyof AssetRow | "")[] = [
      "department","floor","location","last_maintenance","next_maintenance",
      "ministry_tag","device_type","manufacturer","serial_number","mac_address",
      "device_name","lifecycle_stage","device_age","connection_type","in_moh_domain",
      "admin_local_user","has_antivirus","programming","clean_device","ip_type",
      "windows_version","processor","hdd","ssd","ram",
      "notes","update","need","solution_by","","",
    ];
    const rows = saved.map((r) => order.map((k) => (k ? String(r[k as keyof AssetRow] ?? "") : "")));
    const csv = [headers, ...rows]
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

  const usagePct = Math.min(100, Math.round((scans / FREE_TIER_MONTHLY) * 100));

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">نظام جرد الأصول التقنية</h1>
            <p className="text-sm text-muted-foreground">مستشفى الملك فهد · IT Asset Inventory</p>
          </div>
          <div className="rounded-lg border bg-background px-4 py-2 text-xs min-w-[220px]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">استخدام الذكاء الاصطناعي (هذا الشهر)</span>
              <span dir="ltr" className="tabular-nums">{scans} / {FREE_TIER_MONTHLY.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${usagePct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">الباقة المجانية: {FREE_TIER_MONTHLY.toLocaleString()} كريدت شهرياً</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">1) صورة الجهاز</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => camRef.current?.click()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              التقاط بالكاميرا
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
              رفع صورة
            </button>
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {image && (
            <div className="mt-4 space-y-3">
              <img src={image} alt="preview" className="max-h-72 rounded-md border" />
              <button onClick={analyze} disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {loading ? "جاري التحليل..." : "تحليل الصورة بالذكاء الاصطناعي"}
              </button>
            </div>
          )}
          {error && <pre className="mt-3 whitespace-pre-wrap text-xs text-destructive font-sans">خطأ: {error}</pre>}
        </section>

        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">2) مراجعة البيانات ({Object.keys(empty).length} حقل)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Department (القسم)" v={row.department} onChange={(v) => setRow({ ...row, department: v })} />
            <Select label="Floor (الدور)" v={row.floor} opts={FLOORS} onChange={(v) => setRow({ ...row, floor: v })} />
            <Field label="Employee / Room (الموقع)" v={row.location} onChange={(v) => setRow({ ...row, location: v })} rtl />
            <Field label="Last Maintenance Date" v={row.last_maintenance} onChange={(v) => setRow({ ...row, last_maintenance: v })} placeholder="dd/mm/yyyy" />
            <Field label="Next Maintenance Date" v={row.next_maintenance} onChange={(v) => setRow({ ...row, next_maintenance: v })} placeholder="dd/mm/yyyy" />
            <Field label="Ministry Tag" v={row.ministry_tag} onChange={(v) => setRow({ ...row, ministry_tag: v })} />
            <Select label="Device Type" v={row.device_type} opts={DEVICE_TYPES} onChange={(v) => setRow({ ...row, device_type: v })} />
            <Select label="Manufacturer" v={row.manufacturer} opts={MANUFACTURERS} onChange={(v) => setRow({ ...row, manufacturer: v })} />
            <Field label="Serial Number" v={row.serial_number} onChange={(v) => setRow({ ...row, serial_number: v })} />
            <Field label="MAC Address" v={row.mac_address} onChange={(v) => setRow({ ...row, mac_address: v })} placeholder="XX-XX-XX-XX-XX-XX" />
            <Field label="Device Name (E2-HS-KFHH-...)" v={row.device_name} onChange={(v) => setRow({ ...row, device_name: v })} />
            <Select label="Lifecycle Stage" v={row.lifecycle_stage} opts={LIFECYCLE} onChange={(v) => setRow({ ...row, lifecycle_stage: v })} />
            <Select label="Device Age" v={row.device_age} opts={AGE} onChange={(v) => setRow({ ...row, device_age: v })} />
            <Select label="Connection Type" v={row.connection_type} opts={CONNECTION} onChange={(v) => setRow({ ...row, connection_type: v })} />
            <Select label="In MOH Domain" v={row.in_moh_domain} opts={YESNO} onChange={(v) => setRow({ ...row, in_moh_domain: v })} />
            <Select label="Admin Local User" v={row.admin_local_user} opts={YESNO_LC} onChange={(v) => setRow({ ...row, admin_local_user: v })} />
            <Select label="Has Antivirus" v={row.has_antivirus} opts={YESNO_LC} onChange={(v) => setRow({ ...row, has_antivirus: v })} />
            <Field label="Programming" v={row.programming} onChange={(v) => setRow({ ...row, programming: v })} />
            <Select label="Clean Device" v={row.clean_device} opts={CLEAN} onChange={(v) => setRow({ ...row, clean_device: v })} />
            <Select label="IP Static or Dynamic" v={row.ip_type} opts={IP_TYPE} onChange={(v) => setRow({ ...row, ip_type: v })} />
            <Select label="Windows Version" v={row.windows_version} opts={WINDOWS} onChange={(v) => setRow({ ...row, windows_version: v })} />
            <Select label="Processor" v={row.processor} opts={PROCESSORS} onChange={(v) => setRow({ ...row, processor: v })} />
            <Select label="HDD" v={row.hdd} opts={STORAGE_OPT} onChange={(v) => setRow({ ...row, hdd: v })} />
            <Select label="SSD" v={row.ssd} opts={STORAGE_OPT} onChange={(v) => setRow({ ...row, ssd: v })} />
            <Select label="RAM" v={row.ram} opts={RAM_OPT} onChange={(v) => setRow({ ...row, ram: v })} />
            <Field label="ملاحظات" v={row.notes} onChange={(v) => setRow({ ...row, notes: v })} rtl />
            <Field label="Update" v={row.update} onChange={(v) => setRow({ ...row, update: v })} />
            <Field label="Need" v={row.need} onChange={(v) => setRow({ ...row, need: v })} />
            <Select label="Solution By" v={row.solution_by} opts={SOLUTION_BY} onChange={(v) => setRow({ ...row, solution_by: v })} />
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">حفظ الصف</button>
            <button onClick={() => setRow(empty)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">مسح</button>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">3) الصفوف المحفوظة ({saved.length})</h2>
            <button onClick={exportCsv} disabled={saved.length === 0} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              تصدير CSV (بنفس ترتيب الشيت)
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد صفوف بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-right">
                    <th className="p-2">#</th>
                    <th className="p-2">Ministry Tag</th>
                    <th className="p-2">Device</th>
                    <th className="p-2">Manuf.</th>
                    <th className="p-2">Serial</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Windows</th>
                    <th className="p-2">RAM</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2" dir="ltr">{r.ministry_tag}</td>
                      <td className="p-2" dir="ltr">{r.device_type}</td>
                      <td className="p-2" dir="ltr">{r.manufacturer}</td>
                      <td className="p-2" dir="ltr">{r.serial_number}</td>
                      <td className="p-2">{r.location}</td>
                      <td className="p-2" dir="ltr">{r.windows_version}</td>
                      <td className="p-2" dir="ltr">{r.ram}</td>
                      <td className="p-2">
                        <button onClick={() => removeSaved(i)} className="text-destructive hover:underline">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, v, onChange, placeholder, rtl }: { label: string; v: string; onChange: (v: string) => void; placeholder?: string; rtl?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={rtl ? "rtl" : "ltr"} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function Select({ label, v, opts, onChange }: { label: string; v: string; opts: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select value={v} onChange={(e) => onChange(e.target.value)} dir="ltr" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
        <option value=""></option>
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
