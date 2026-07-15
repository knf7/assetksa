import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ImageIcon,
  Save,
  ScanLine,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KFH IT Asset Inventory" },
      {
        name: "description",
        content: "نظام شخصي لجرد أصول تقنية المعلومات وتحليل صور الأجهزة وإرسال الصفوف إلى Google Sheets.",
      },
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

type Quality = {
  score: number;
  status: "good" | "medium" | "bad";
  width: number;
  height: number;
  sizeKb: number;
  notes: string[];
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

const DEVICE_TYPES = [
  "Desktop computer",
  "Laptop",
  "All-in-One PC",
  "Monitor",
  "Printer",
  "Scanner",
  "UPS",
  "Docking Station",
  "Server",
  "Network Switch",
  "IP Phone",
  "Projector",
  "Tablet",
];
const MANUFACTURERS = [
  "HP",
  "Dell",
  "Lenovo",
  "Canon",
  "Cisco",
  "Samsung",
  "Epson",
  "APC",
  "Acer",
  "Asus",
  "Apple",
  "Zebra",
  "Brother",
  "Ricoh",
  "Other",
];
const FLOORS = ["G", "M", "B", "1", "2", "3", "4", "5"];
const LIFECYCLE = ["In Use", "In Storage", "Retired", "Under Repair"];
const AGE = ["Less Then 5 Years", "Less Then 10 Years", "More Then 10 Years"];
const CONNECTION = ["Ethernet", "WiFi", "USB WiFi", "None"];
const YESNO = ["YES", "NO"];
const YESNO_LC = ["Yes", "No"];
const IP_TYPE = ["Dynamic", "Static"];
const CLEAN = ["No Need", "Needed", "Done"];
const WINDOWS = ["Windows 10", "Windows 11", "Windows 7", "Other"];
const PROCESSORS = ["Intel Core i3", "Intel Core i5", "Intel Core i7", "Intel Core i9", "AMD Ryzen 5", "AMD Ryzen 7", "Other"];
const RAM_OPT = ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB"];
const STORAGE_OPT = ["", "120 GB", "240 GB", "256 GB", "480 GB", "500 GB", "1 TB", "2 TB"];
const SOLUTION_BY = ["IT", "Vendor", "Maintenance", ""];

const FREE_TIER_MONTHLY = 25000;

const SHEET_HEADERS = [
  "Department",
  "Floor",
  "Name of Employee / Room",
  "Last Maintenance Date",
  "Next Maintenance Date",
  "Ministry Tag",
  "Device Type",
  "Device Manufacturer",
  "Serial Number",
  "MAC Address",
  "Device Name",
  "Lifecycle Stage",
  "How old is the device",
  "Connection type",
  "in MOH domain",
  "Admin Local User",
  "Has Antivirus (Crowd & Kasper)",
  "Programming",
  "Clean Device",
  "IP Static or Dynamic",
  "Windows Version",
  "Processor type",
  "HDD",
  "SSD",
  "RAM",
  "الملاحظات",
  "Update",
  "Need",
  "Solution By",
  "",
  "ملاحظات غريبه",
];

const SHEET_ORDER: (keyof AssetRow | "")[] = [
  "department",
  "floor",
  "location",
  "last_maintenance",
  "next_maintenance",
  "ministry_tag",
  "device_type",
  "manufacturer",
  "serial_number",
  "mac_address",
  "device_name",
  "lifecycle_stage",
  "device_age",
  "connection_type",
  "in_moh_domain",
  "admin_local_user",
  "has_antivirus",
  "programming",
  "clean_device",
  "ip_type",
  "windows_version",
  "processor",
  "hdd",
  "ssd",
  "ram",
  "notes",
  "update",
  "need",
  "solution_by",
  "",
  "",
];

function rowToSheetValues(asset: AssetRow) {
  return SHEET_ORDER.map((key) => (key ? String(asset[key] ?? "") : ""));
}

function extractSpreadsheetId(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || trimmed;
}

function scoreQuality(file: File, width: number, height: number): Quality {
  const notes: string[] = [];
  let score = 100;
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);

  if (shortest < 900) {
    score -= 35;
    notes.push("الدقة منخفضة؛ قرّب الكاميرا من الملصق.");
  }
  if (longest < 1400) {
    score -= 15;
    notes.push("الصورة صغيرة وقد تفقد تفاصيل الباركود.");
  }
  if (file.size < 180 * 1024) {
    score -= 20;
    notes.push("حجم الصورة صغير؛ قد تكون مضغوطة بقوة.");
  }
  if (file.size > 9 * 1024 * 1024) {
    score -= 10;
    notes.push("الصورة كبيرة؛ التحليل قد يكون أبطأ.");
  }
  if (notes.length === 0) notes.push("الجودة مناسبة للتحليل.");

  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    status: bounded >= 75 ? "good" : bounded >= 50 ? "medium" : "bad",
    width,
    height,
    sizeKb: Math.round(file.size / 1024),
    notes,
  };
}

function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [row, setRow] = useState<AssetRow>(empty);
  const [saved, setSaved] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [lastExtracted, setLastExtracted] = useState<Partial<AssetRow> | null>(null);
  const [scans, setScans] = useState(0);
  const [sheetInput, setSheetInput] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
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
    const storedRows = localStorage.getItem("kfh-saved");
    if (storedRows) {
      try {
        setSaved(JSON.parse(storedRows));
      } catch {}
    }
    setSheetInput(localStorage.getItem("kfh-sheet-id") || "");
    setSheetName(localStorage.getItem("kfh-sheet-name") || "Sheet1");
  }, []);

  useEffect(() => {
    localStorage.setItem("kfh-saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    localStorage.setItem("kfh-sheet-id", sheetInput);
    localStorage.setItem("kfh-sheet-name", sheetName);
  }, [sheetInput, sheetName]);

  function bumpScans() {
    const month = new Date().toISOString().slice(0, 7);
    const next = scans + 1;
    setScans(next);
    localStorage.setItem("kfh-ai-usage", JSON.stringify({ month, count: next }));
  }

  async function onFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setLastExtracted(null);
    setQuality(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      const img = new Image();
      img.onload = () => setQuality(scoreQuality(file, img.naturalWidth, img.naturalHeight));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImage(null);
    setQuality(null);
    setError(null);
    setLastExtracted(null);
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
  }

  async function analyze() {
    if (!image) return;
    if (quality?.status === "bad") {
      setError("جودة الصورة ضعيفة. الأفضل تعيد التصوير قريب من الملصق وبإضاءة واضحة قبل التحليل.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/extract-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      bumpScans();
      const filled = ["ministry_tag", "device_type", "manufacturer", "serial_number", "mac_address", "processor", "windows_version", "ram", "hdd", "ssd"].filter(
        (key) => (data[key] ?? "").toString().trim().length > 0,
      );
      if (filled.length === 0) {
        const debug = data._debug ? `\n\nرد الذكاء الاصطناعي:\n${(data._debug.raw || "(فارغ)").slice(0, 500)}` : "";
        throw new Error("لم يتم استخراج أي بيانات من الصورة. تأكد من وضوح الملصق والإضاءة." + debug);
      }

      const extracted = {
        ministry_tag: data.ministry_tag || "",
        device_type: data.device_type || "",
        manufacturer: data.manufacturer || "",
        serial_number: data.serial_number || "",
        mac_address: data.mac_address || "",
        processor: data.processor || "",
        windows_version: data.windows_version || "",
        ram: data.ram || "",
        hdd: data.hdd || "",
        ssd: data.ssd || "",
      } satisfies Partial<AssetRow>;

      setRow((current) => ({
        ...current,
        ministry_tag: extracted.ministry_tag || current.ministry_tag,
        device_type: extracted.device_type || current.device_type,
        manufacturer: extracted.manufacturer || current.manufacturer,
        serial_number: extracted.serial_number || current.serial_number,
        mac_address: extracted.mac_address || current.mac_address,
        processor: extracted.processor || current.processor,
        windows_version: extracted.windows_version || current.windows_version,
        ram: extracted.ram || current.ram,
        hdd: extracted.hdd || current.hdd,
        ssd: extracted.ssd || current.ssd,
      }));
      setLastExtracted(extracted);
      setNotice(`تم استخراج ${filled.length} حقول. راجعها قبل الحفظ.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function save() {
    setSaved((current) => [...current, row]);
    setRow(empty);
    setImage(null);
    setQuality(null);
    setLastExtracted(null);
    setNotice("تم حفظ الصف محلياً.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveToSheet() {
    const spreadsheetId = extractSpreadsheetId(sheetInput);
    if (!spreadsheetId) {
      setError("أدخل رابط Google Sheet أو Spreadsheet ID أولاً.");
      return;
    }
    setSavingSheet(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/sheets-append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, sheetName, values: rowToSheetValues(row) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ في Google Sheets");
      setSaved((current) => [...current, row]);
      setRow(empty);
      clearImage();
      setNotice("تم حفظ الصف وإرساله إلى Google Sheets.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingSheet(false);
    }
  }

  function removeSaved(index: number) {
    setSaved((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function exportCsv() {
    if (saved.length === 0) return;
    const rows = saved.map(rowToSheetValues);
    const csv = [SHEET_HEADERS, ...rows]
      .map((csvRow) => csvRow.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kfh-assets-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const usagePct = Math.min(100, Math.round((scans / FREE_TIER_MONTHLY) * 100));
  const remaining = Math.max(0, FREE_TIER_MONTHLY - scans);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground" dir="ltr">
              KFH · Personal IT Inventory
            </p>
            <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">جرد الأصول التقنية</h1>
            <p className="text-sm text-muted-foreground">تحليل صورة الجهاز · مراجعة البيانات · حفظ CSV أو Google Sheets</p>
          </div>
          <div className="min-w-[260px] rounded-lg border bg-background px-4 py-3 text-xs shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-medium">استخدام الذكاء الاصطناعي</span>
              <span dir="ltr" className="tabular-nums">
                {scans} / {FREE_TIER_MONTHLY.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${usagePct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">المتبقي التقريبي: {remaining.toLocaleString()} تحليل/كريدت هذا الشهر</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">صورة الجهاز</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => camRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" />
                كاميرا
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Upload className="h-4 w-4" />
                رفع صورة
              </button>
              <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>

            {image ? (
              <div className="mt-4 space-y-3">
                <div className="overflow-hidden rounded-lg border bg-muted">
                  <img src={image} alt="معاينة صورة الجهاز" className="max-h-80 w-full object-contain" />
                </div>
                {quality && <QualityPanel quality={quality} />}
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button
                    onClick={analyze}
                    disabled={loading || quality?.status === "bad"}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    <ScanLine className="h-4 w-4" />
                    {loading ? "جاري التحليل..." : "تحليل الصورة"}
                  </button>
                  <button
                    onClick={clearImage}
                    className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                    aria-label="حذف الصورة"
                    title="حذف الصورة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
                ارفع صورة واضحة للملصق أو شاشة مواصفات الجهاز.
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Google Sheets</h2>
            </div>
            <div className="space-y-3">
              <Field label="رابط الشيت أو Spreadsheet ID" v={sheetInput} onChange={setSheetInput} placeholder="https://docs.google.com/spreadsheets/d/..." />
              <Field label="اسم التب" v={sheetName} onChange={setSheetName} placeholder="Sheet1" />
              <p className="text-xs text-muted-foreground">الربط جاهز. الصق رابط الشيت وتأكد أن حساب Google المربوط يملك صلاحية تعديل عليه.</p>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {(error || notice) && (
            <div className={`rounded-lg border p-4 text-sm ${error ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
              <div className="flex items-start gap-2">
                {error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <pre className="whitespace-pre-wrap font-sans">{error ? `خطأ: ${error}` : notice}</pre>
              </div>
            </div>
          )}

          {lastExtracted && <ExtractionSummary data={lastExtracted} />}

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">مراجعة البيانات ({Object.keys(empty).length} حقل)</h2>
              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">راجع قبل الحفظ</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Department (القسم)" v={row.department} onChange={(value) => setRow({ ...row, department: value })} />
              <Select label="Floor (الدور)" v={row.floor} opts={FLOORS} onChange={(value) => setRow({ ...row, floor: value })} />
              <Field label="Employee / Room (الموقع)" v={row.location} onChange={(value) => setRow({ ...row, location: value })} rtl />
              <Field label="Last Maintenance Date" v={row.last_maintenance} onChange={(value) => setRow({ ...row, last_maintenance: value })} placeholder="dd/mm/yyyy" />
              <Field label="Next Maintenance Date" v={row.next_maintenance} onChange={(value) => setRow({ ...row, next_maintenance: value })} placeholder="dd/mm/yyyy" />
              <Field label="Ministry Tag" v={row.ministry_tag} onChange={(value) => setRow({ ...row, ministry_tag: value })} />
              <Select label="Device Type" v={row.device_type} opts={DEVICE_TYPES} onChange={(value) => setRow({ ...row, device_type: value })} />
              <Select label="Manufacturer" v={row.manufacturer} opts={MANUFACTURERS} onChange={(value) => setRow({ ...row, manufacturer: value })} />
              <Field label="Serial Number" v={row.serial_number} onChange={(value) => setRow({ ...row, serial_number: value })} />
              <Field label="MAC Address" v={row.mac_address} onChange={(value) => setRow({ ...row, mac_address: value })} placeholder="XX-XX-XX-XX-XX-XX" />
              <Field label="Device Name (E2-HS-KFHH-...)" v={row.device_name} onChange={(value) => setRow({ ...row, device_name: value })} />
              <Select label="Lifecycle Stage" v={row.lifecycle_stage} opts={LIFECYCLE} onChange={(value) => setRow({ ...row, lifecycle_stage: value })} />
              <Select label="Device Age" v={row.device_age} opts={AGE} onChange={(value) => setRow({ ...row, device_age: value })} />
              <Select label="Connection Type" v={row.connection_type} opts={CONNECTION} onChange={(value) => setRow({ ...row, connection_type: value })} />
              <Select label="In MOH Domain" v={row.in_moh_domain} opts={YESNO} onChange={(value) => setRow({ ...row, in_moh_domain: value })} />
              <Select label="Admin Local User" v={row.admin_local_user} opts={YESNO_LC} onChange={(value) => setRow({ ...row, admin_local_user: value })} />
              <Select label="Has Antivirus" v={row.has_antivirus} opts={YESNO_LC} onChange={(value) => setRow({ ...row, has_antivirus: value })} />
              <Field label="Programming" v={row.programming} onChange={(value) => setRow({ ...row, programming: value })} />
              <Select label="Clean Device" v={row.clean_device} opts={CLEAN} onChange={(value) => setRow({ ...row, clean_device: value })} />
              <Select label="IP Static or Dynamic" v={row.ip_type} opts={IP_TYPE} onChange={(value) => setRow({ ...row, ip_type: value })} />
              <Select label="Windows Version" v={row.windows_version} opts={WINDOWS} onChange={(value) => setRow({ ...row, windows_version: value })} />
              <Select label="Processor" v={row.processor} opts={PROCESSORS} onChange={(value) => setRow({ ...row, processor: value })} />
              <Select label="HDD" v={row.hdd} opts={STORAGE_OPT} onChange={(value) => setRow({ ...row, hdd: value })} />
              <Select label="SSD" v={row.ssd} opts={STORAGE_OPT} onChange={(value) => setRow({ ...row, ssd: value })} />
              <Select label="RAM" v={row.ram} opts={RAM_OPT} onChange={(value) => setRow({ ...row, ram: value })} />
              <Field label="ملاحظات" v={row.notes} onChange={(value) => setRow({ ...row, notes: value })} rtl />
              <Field label="Update" v={row.update} onChange={(value) => setRow({ ...row, update: value })} />
              <Field label="Need" v={row.need} onChange={(value) => setRow({ ...row, need: value })} />
              <Select label="Solution By" v={row.solution_by} opts={SOLUTION_BY} onChange={(value) => setRow({ ...row, solution_by: value })} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={save} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Save className="h-4 w-4" />
                حفظ محلي
              </button>
              <button
                onClick={saveToSheet}
                disabled={savingSheet}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {savingSheet ? "جاري الإرسال..." : "حفظ وإرسال للشيت"}
              </button>
              <button onClick={() => setRow(empty)} className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
                مسح البيانات
              </button>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">الصفوف المحفوظة ({saved.length})</h2>
              <button
                onClick={exportCsv}
                disabled={saved.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                تصدير CSV
              </button>
            </div>
            {saved.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/50 p-6 text-center text-sm text-muted-foreground">لا توجد صفوف بعد.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
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
                    {saved.map((savedRow, index) => (
                      <tr key={`${savedRow.serial_number}-${index}`} className="border-b last:border-b-0">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2" dir="ltr">
                          {savedRow.ministry_tag}
                        </td>
                        <td className="p-2" dir="ltr">
                          {savedRow.device_type}
                        </td>
                        <td className="p-2" dir="ltr">
                          {savedRow.manufacturer}
                        </td>
                        <td className="p-2" dir="ltr">
                          {savedRow.serial_number}
                        </td>
                        <td className="p-2">{savedRow.location}</td>
                        <td className="p-2" dir="ltr">
                          {savedRow.windows_version}
                        </td>
                        <td className="p-2" dir="ltr">
                          {savedRow.ram}
                        </td>
                        <td className="p-2">
                          <button onClick={() => removeSaved(index)} className="inline-flex items-center gap-1 text-destructive hover:underline">
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function QualityPanel({ quality }: { quality: Quality }) {
  const label = quality.status === "good" ? "ممتازة" : quality.status === "medium" ? "متوسطة" : "ضعيفة";
  return (
    <div className="rounded-lg border bg-background p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-semibold">جودة الصورة: {label}</span>
        <span dir="ltr" className="tabular-nums">
          {quality.score}%
        </span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${quality.score}%` }} />
      </div>
      <p className="text-muted-foreground" dir="ltr">
        {quality.width}×{quality.height}px · {quality.sizeKb}KB
      </p>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        {quality.notes.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
    </div>
  );
}

function ExtractionSummary({ data }: { data: Partial<AssetRow> }) {
  const items = [
    ["Ministry Tag", data.ministry_tag],
    ["Serial", data.serial_number],
    ["Device", data.device_type],
    ["Manufacturer", data.manufacturer],
    ["MAC", data.mac_address],
    ["Windows", data.windows_version],
    ["Processor", data.processor],
    ["RAM", data.ram],
    ["HDD", data.hdd],
    ["SSD", data.ssd],
  ].filter(([, value]) => value);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">نتيجة التحليل</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">لم يتم استخراج حقول واضحة.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([label, value]) => (
            <div key={label} className="rounded-md border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-1 font-semibold" dir="ltr">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({ label, v, onChange, placeholder, rtl }: { label: string; v: string; onChange: (v: string) => void; placeholder?: string; rtl?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      <input
        value={v}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        dir={rtl ? "rtl" : "ltr"}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </label>
  );
}

function Select({ label, v, opts, onChange }: { label: string; v: string; opts: string[]; onChange: (v: string) => void }) {
  const merged = v && !opts.includes(v) ? [v, ...opts] : opts;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      <select
        value={v}
        onChange={(event) => onChange(event.target.value)}
        dir="ltr"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        <option value=""></option>
        {merged.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}