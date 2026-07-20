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
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KFH IT Asset Inventory" },
      {
        name: "description",
        content: "نظام جرد أصول تقنية المعلومات: صور متعددة، تحليل ذكي، وحفظ مباشر في Google Sheets.",
      },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
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
  pendingSync?: boolean;
};

type Quality = {
  score: number;
  status: "good" | "medium" | "bad";
  width: number;
  height: number;
  sizeKb: number;
  originalSizeKb?: number;
  notes: string[];
};

type QAResult = {
  isCorrect: boolean;
  needsHumanVerification: boolean;
  feedback: string;
};

type ImageItem = {
  id: string;
  dataUrl: string;
  quality: Quality;
};

// --- Dropdown values — EXACTLY as they appear in the KFH master Excel sheet. ---
const DEVICE_TYPES = ["All In One", "Desktop computer", "Laptop", "Printer", "UPS"];
const MANUFACTURERS = ["Brother", "Dell", "Eaton", "Fujitsu Siemens", "HP", "Lenovo"];
const FLOORS = ["B", "G", "M", "1", "2", "3", "4", "5"];
const LIFECYCLE = ["In Use"];
const AGE = ["Less Then 10 Years", "More Then 10 Years"];
const CONNECTION = ["Ethernet", "WiFi", "USB WiFi", "N/A"];
const YESNO_UP = ["YES", "No", "N/A"];
const YESNO = ["Yes", "No", "N/A"];
const IP_TYPE = ["Dynamic", "Static", "N/A"];
const CLEAN = ["No Need", "N/A"];
const WINDOWS = ["Windows 10", "Windows 11", "N/A"];
// Excel keeps the "Inter Cor" typo — preserve it so exports match the master sheet.
const PROCESSORS = ["Inter Cor i5", "Inter Cor i7", "N/A"];
const RAM_OPT = ["8 GB", "16 GB", "N/A"];
const HDD_OPT = ["500 GB", "1 TB", "N/A"];
const SSD_OPT = ["120 GB", "480 GB", "N/A"];
const PROGRAMMING_OPT = ["N/A"];
const SOLUTION_BY = ["IT", "N/A"];

function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const NA = "N/A";

function makeEmpty(): AssetRow {
  const t = todayStr();
  return {
    department: "KFH",
    floor: "",
    location: "",
    last_maintenance: t,
    next_maintenance: t,
    ministry_tag: "",
    device_type: "",
    manufacturer: "",
    serial_number: "",
    mac_address: NA,
    device_name: NA,
    lifecycle_stage: "In Use",
    device_age: NA,
    connection_type: NA,
    in_moh_domain: NA,
    admin_local_user: NA,
    has_antivirus: NA,
    programming: NA,
    clean_device: "No Need",
    ip_type: NA,
    windows_version: NA,
    processor: NA,
    hdd: NA,
    ssd: NA,
    ram: NA,
    notes: NA,
    update: NA,
    need: NA,
    solution_by: "IT",
  };
}

const FREE_TIER_MONTHLY = 25000;
const MAX_IMAGES = 5;

const DEFAULT_SHEET_ID = "1Sjg1V0PdqRYCxUtWhb-WPjUGDu2_XbvMjZAgvnb6BDs";
const DEFAULT_SHEET_NAME = "Sheet1";

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
  if (!trimmed) return DEFAULT_SHEET_ID;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || trimmed;
}

function scoreQuality(file: File, width: number, height: number, preparedSize = file.size): Quality {
  const notes: string[] = [];
  let score = 100;
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  if (shortest < 700) { score -= 35; notes.push("الدقة منخفضة؛ قرّب الكاميرا من الملصق."); }
  if (longest < 1100) { score -= 15; notes.push("الصورة صغيرة وقد تفقد تفاصيل الباركود."); }
  if (file.size < 180 * 1024) { score -= 20; notes.push("حجم الصورة صغير؛ قد تكون مضغوطة بقوة."); }
  if (file.size > 9 * 1024 * 1024) { notes.push("تم ضغط صورة الجوال قبل التحليل لتقليل الأخطاء."); }
  if (notes.length === 0) notes.push("الجودة مناسبة للتحليل.");
  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    status: bounded >= 75 ? "good" : bounded >= 50 ? "medium" : "bad",
    width,
    height,
    sizeKb: Math.round(preparedSize / 1024),
    originalSizeKb: Math.round(file.size / 1024),
    notes,
  };
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.86): string {
  return canvas.toDataURL("image/jpeg", quality);
}

function preparePhoto(file: File): Promise<{ dataUrl: string; width: number; height: number; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxSide = 1800;
        const longest = Math.max(img.naturalWidth, img.naturalHeight);
        const scale = longest > maxSide ? maxSide / longest : 1;
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        if (scale === 1 && file.size <= 1_800_000 && rawDataUrl.startsWith("data:image/")) {
          resolve({ dataUrl: rawDataUrl, width, height, size: file.size });
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataUrl: rawDataUrl, width: img.naturalWidth, height: img.naturalHeight, size: file.size });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvasToDataUrl(canvas);
        const base64Length = dataUrl.split(",")[1]?.length ?? 0;
        const approxSize = Math.round((base64Length * 3) / 4);
        resolve({ dataUrl, width, height, size: approxSize });
      };
      img.onerror = () => reject(new Error("تعذر قراءة الصورة. جرّب صورة JPG أو PNG واضحة."));
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsImage(file: File): Promise<ImageItem> {
  return preparePhoto(file).then((prepared) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dataUrl: prepared.dataUrl,
    quality: scoreQuality(file, prepared.width, prepared.height, prepared.size),
  }));
}

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

function formatApiError(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; metadata?: { raw?: string } } };
    const providerRaw = parsed.error?.metadata?.raw;
    if (providerRaw) {
      try {
        const provider = JSON.parse(providerRaw) as { error?: { message?: string } };
        if (provider.error?.message) return `تعذر تحليل الصورة: ${provider.error.message}`;
      } catch {}
    }
    if (parsed.error?.message) return parsed.error.message;
  } catch {}
  if (raw.includes("Unable to process input image")) {
    return "تعذر تحليل صيغة الصورة. جرّب حذفها والتقاط صورة JPG واضحة أو ارفع صورة أخرى.";
  }
  if (raw.includes("LOVABLE_API_KEY")) return "مفتاح الذكاء غير متوفر حالياً.";
  return raw;
}

function Index() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [row, setRow] = useState<AssetRow>(makeEmpty);
  const [saved, setSaved] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<Partial<AssetRow> | null>(null);
  const [scans, setScans] = useState(0);
  const [sheetInput, setSheetInput] = useState("");
  const [sheetName, setSheetName] = useState(DEFAULT_SHEET_NAME);
  const [showSheetSettings, setShowSheetSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locHistory, setLocHistory] = useState<string[]>([]);
  const [deptHistory, setDeptHistory] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [qaResult, setQaResult] = useState<QAResult | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
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
    if (storedRows) { try { setSaved(JSON.parse(storedRows)); } catch {} }
    setSheetInput(localStorage.getItem("kfh-sheet-id") || "");
    setSheetName(localStorage.getItem("kfh-sheet-name") || DEFAULT_SHEET_NAME);
    setLocHistory(loadList("kfh-locations"));
    setDeptHistory(loadList("kfh-departments"));
  }, []);

  useEffect(() => { localStorage.setItem("kfh-saved", JSON.stringify(saved)); }, [saved]);
  useEffect(() => {
    localStorage.setItem("kfh-sheet-id", sheetInput);
    localStorage.setItem("kfh-sheet-name", sheetName);
  }, [sheetInput, sheetName]);

  function rememberValue(listKey: string, value: string, current: string[], setter: (v: string[]) => void) {
    const v = value.trim();
    if (!v) return;
    const next = [v, ...current.filter((x) => x !== v)].slice(0, 30);
    setter(next);
    localStorage.setItem(listKey, JSON.stringify(next));
  }

  function bumpScans() {
    const month = new Date().toISOString().slice(0, 7);
    const next = scans + 1;
    setScans(next);
    localStorage.setItem("kfh-ai-usage", JSON.stringify({ month, count: next }));
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null); setNotice(null); setLastExtracted(null);
    try {
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) { setError(`الحد الأقصى ${MAX_IMAGES} صور.`); return; }
      const arr = Array.from(files).slice(0, remaining);
      const added = await Promise.all(arr.map(readFileAsImage));
      setImages((current) => [...current, ...added]);
    } catch (e) { setError((e as Error).message); }
    finally {
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  function removeImage(id: string) { setImages((c) => c.filter((i) => i.id !== id)); }
  function clearImages() {
    setImages([]); setError(null); setLastExtracted(null); setQaResult(null);
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
    }
  };

  async function analyze() {
    if (images.length === 0) return;
    const worst = images.reduce((acc, cur) => (cur.quality.score < acc.quality.score ? cur : acc), images[0]);
    setLoading(true); setError(null); setQaResult(null);
    setNotice(worst.quality.status === "bad" ? "جودة صورة واحدة ضعيفة، لكن سأحللها الآن وأعرض أي نتيجة ممكنة." : null);
    try {
      const res = await fetch("/api/extract-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrls: images.map((i) => i.dataUrl) }),
      });
      const responseText = await res.text();
      let data: Record<string, unknown> = {};
      try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = { error: responseText }; }
      if (!res.ok) {
        const rawError = String(data.error || responseText || "فشل التحليل");
        throw new Error(formatApiError(rawError));
      }
      bumpScans();
      const aiKeys = [
        "ministry_tag","device_type","manufacturer","serial_number","mac_address",
        "processor","windows_version","ram","hdd","ssd","device_name",
        "connection_type","ip_type","in_moh_domain","lifecycle_stage",
      ];
      const filled = aiKeys.filter((k) => {
        const v = (data[k] ?? "").toString().trim();
        return v.length > 0 && v.toUpperCase() !== "N/A";
      });
      if (filled.length === 0) {
        const debugObj = data._debug as { raw?: string } | undefined;
        const debug = debugObj ? `\n\nرد الذكاء الاصطناعي:\n${(debugObj.raw || "(فارغ)").slice(0, 500)}` : "";
        setLastExtracted(data as Partial<AssetRow>);
        setNotice("لم تظهر قراءة مؤكدة. يرجى التأكد احتياطاً، ودائماً شغّل ذكاء آخر للتحقق من النتيجة." + debug);
        return;
      }
      const useIfReal = (v: unknown, fallback: string) => {
        const s = (v ?? "").toString().trim();
        return s ? s : fallback;
      };
      setRow((current) => ({
        ...current,
        ministry_tag: useIfReal(data.ministry_tag, current.ministry_tag),
        device_type: useIfReal(data.device_type, current.device_type),
        manufacturer: useIfReal(data.manufacturer, current.manufacturer),
        serial_number: useIfReal(data.serial_number, current.serial_number),
        mac_address: useIfReal(data.mac_address, current.mac_address),
        device_name: useIfReal(data.device_name, current.device_name),
        processor: useIfReal(data.processor, current.processor),
        windows_version: useIfReal(data.windows_version, current.windows_version),
        ram: useIfReal(data.ram, current.ram),
        hdd: useIfReal(data.hdd, current.hdd),
        ssd: useIfReal(data.ssd, current.ssd),
        connection_type: useIfReal(data.connection_type, current.connection_type),
        ip_type: useIfReal(data.ip_type, current.ip_type),
        in_moh_domain: useIfReal(data.in_moh_domain, current.in_moh_domain),
        lifecycle_stage: useIfReal(data.lifecycle_stage, current.lifecycle_stage),
      }));
      setLastExtracted(data as Partial<AssetRow>);
      setNotice(`تمت إضافة البيانات المتاحة. يرجى التأكد احتياطاً، ودائماً شغّل ذكاء آخر للتحقق من النتيجة.`);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function persistSuggestions(r: AssetRow) {
    if (r.location && r.location !== NA) rememberValue("kfh-locations", r.location, locHistory, setLocHistory);
    if (r.department && r.department !== NA) rememberValue("kfh-departments", r.department, deptHistory, setDeptHistory);
  }

  async function runQA() {
    if (images.length === 0 || !lastExtracted) return;
    setQaLoading(true); setQaResult(null); setError(null);
    try {
      const res = await fetch("/api/qa-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrls: images.map(i => i.dataUrl),
          extractedData: row
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحقق");
      setQaResult(data as QAResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQaLoading(false);
    }
  }

  function save() {
    persistSuggestions(row);
    setSaved((c) => [...c, row]);
    setRow(makeEmpty());
    clearImages();
    setNotice("تم حفظ الصف محلياً.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveToSheet() {
    if (!navigator.onLine) {
      const offlineRow = { ...row, pendingSync: true };
      persistSuggestions(offlineRow);
      setSaved((c) => [...c, offlineRow]);
      setRow(makeEmpty());
      clearImages();
      setNotice("تم حفظ الصف محلياً (لا يوجد اتصال بالإنترنت). ستتم المزامنة لاحقاً.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const spreadsheetId = extractSpreadsheetId(sheetInput);
    setSavingSheet(true); setError(null); setNotice(null);
    try {
      const res = await fetch("/api/sheets-append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, sheetName: sheetName || DEFAULT_SHEET_NAME, values: rowToSheetValues(row) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ في Google Sheets");
      persistSuggestions(row);
      setSaved((c) => [...c, row]);
      setRow(makeEmpty());
      clearImages();
      setNotice("تم حفظ الصف وإرساله إلى Google Sheets.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { 
      const offlineRow = { ...row, pendingSync: true };
      persistSuggestions(offlineRow);
      setSaved((c) => [...c, offlineRow]);
      setRow(makeEmpty());
      clearImages();
      setNotice(`فشل الإرسال (${(e as Error).message}). تم الحفظ محلياً بانتظار المزامنة.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    finally { setSavingSheet(false); }
  }

  async function syncPendingAction() {
    const pending = saved.filter(s => s.pendingSync);
    if (pending.length === 0) return;
    setSavingSheet(true); setError(null);
    let successCount = 0;
    try {
      const spreadsheetId = extractSpreadsheetId(sheetInput);
      const newSaved = [...saved];
      for (let i = 0; i < newSaved.length; i++) {
        if (newSaved[i].pendingSync) {
          const res = await fetch("/api/sheets-append", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spreadsheetId, sheetName: sheetName || DEFAULT_SHEET_NAME, values: rowToSheetValues(newSaved[i]) }),
          });
          if (res.ok) {
            delete newSaved[i].pendingSync;
            successCount++;
          }
        }
      }
      setSaved(newSaved);
      if (successCount > 0) setNotice(`تمت مزامنة ${successCount} صفوف بنجاح.`);
    } catch (e) {
      setError(`فشلت المزامنة: ${(e as Error).message}`);
    } finally {
      setSavingSheet(false);
    }
  }

  useEffect(() => {
    const handleOnline = () => setSyncTrigger(t => t + 1);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (syncTrigger > 0 && navigator.onLine) {
      syncPendingAction();
    }
  }, [syncTrigger]);

  function removeSaved(index: number) {
    setSaved((current) => current.filter((_, i) => i !== index));
  }

  function exportCsv() {
    if (saved.length === 0) return;
    const rows = saved.map(rowToSheetValues);
    const csv = [SHEET_HEADERS, ...rows]
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
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
  const remaining = Math.max(0, FREE_TIER_MONTHLY - scans);
  const canAddMore = images.length < MAX_IMAGES;
  const activeSheetId = extractSpreadsheetId(sheetInput);
  const usingDefault = activeSheetId === DEFAULT_SHEET_ID;

  const recentLocations = useMemo(() => locHistory.slice(0, 6), [locHistory]);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-card p-6 shadow-lg border">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="font-medium text-lg">جاري التحليل الذكي...</p>
            <p className="text-sm text-muted-foreground">قد يستغرق بضع ثوانٍ</p>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground sm:text-xs" dir="ltr">
                KFH · IT Asset Inventory
              </p>
              <h1 className="truncate text-lg font-bold sm:text-2xl">جرد الأصول التقنية</h1>
            </div>
            <div className="shrink-0 rounded-md border bg-background px-2 py-1.5 text-[10px] sm:px-3 sm:py-2 sm:text-xs">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">الذكاء</span>
                <span dir="ltr" className="tabular-nums font-semibold">
                  {scans}/{FREE_TIER_MONTHLY.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-muted sm:w-32">
                <div className="h-full bg-primary" style={{ width: `${usagePct}%` }} />
              </div>
              <p className="mt-0.5 hidden text-[9px] text-muted-foreground sm:block">
                متبقي: {remaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4 sm:space-y-6">
          <section 
            className={`rounded-lg border bg-card p-3 shadow-sm sm:p-5 transition-colors ${isDragging ? "border-primary bg-primary/5 ring-2 ring-primary/20" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="mb-3 flex items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold sm:text-lg">صور الجهاز {isDragging && <span className="text-primary text-sm">(أفلت الصور هنا)</span>}</h2>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground" dir="ltr">
                {images.length}/{MAX_IMAGES}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 relative z-10">
              <button
                onClick={() => camRef.current?.click()}
                disabled={!canAddMore}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-base font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                <Camera className="h-5 w-5" />
                كاميرا
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!canAddMore}
                className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-3.5 text-base font-medium hover:bg-accent active:scale-95 disabled:opacity-50"
              >
                <Upload className="h-5 w-5" />
                رفع صور
              </button>
              <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            </div>

            {images.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed bg-muted/50 px-3 py-6 text-center text-xs text-muted-foreground sm:text-sm">
                أضف حتى {MAX_IMAGES} صور (ملصق، شاسيه، شاشة المواصفات...).
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {images.map((image) => (
                    <div key={image.id} className="group relative overflow-hidden rounded-md border bg-muted">
                      <img src={image.dataUrl} alt="معاينة" className="aspect-square w-full object-cover" />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive shadow hover:bg-background"
                        aria-label="حذف"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <span
                        className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${
                          image.quality.status === "good" ? "bg-emerald-600" : image.quality.status === "medium" ? "bg-amber-600" : "bg-red-600"
                        }`}
                        dir="ltr"
                      >
                        {image.quality.score}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button
                    onClick={analyze}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-60"
                  >
                    <ScanLine className="h-4 w-4" />
                    {loading ? "جاري التحليل..." : `تحليل ${images.length > 1 ? images.length + " صور" : "الصورة"}`}
                  </button>
                  <button
                    onClick={clearImages}
                    className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent"
                    title="مسح كل الصور"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold sm:text-lg">Google Sheets</h2>
              </div>
              <button
                onClick={() => setShowSheetSettings((v) => !v)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {showSheetSettings ? "إخفاء" : "تغيير الوجهة"}
              </button>
            </div>
            <div className={`rounded-md border p-3 text-xs ${usingDefault ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted"}`}>
              <p className="font-medium">
                {usingDefault ? "🟢 الوجهة الافتراضية (شيت KFH المشترك)" : "🟡 وجهة مخصصة"}
              </p>
              <p className="mt-1 truncate text-muted-foreground" dir="ltr" title={activeSheetId}>
                {activeSheetId} · {sheetName || DEFAULT_SHEET_NAME}
              </p>
            </div>
            {showSheetSettings && (
              <div className="mt-3 space-y-3">
                <Field label="رابط الشيت أو Spreadsheet ID (اتركه فارغاً للافتراضي)" v={sheetInput} onChange={setSheetInput} placeholder="افتراضي: شيت KFH" />
                <Field label="اسم التب" v={sheetName} onChange={setSheetName} placeholder={DEFAULT_SHEET_NAME} />
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>أي مستخدم للموقع يضيف تلقائياً في الشيت الافتراضي ما لم يغيره هنا.</p>
                  <p className="text-destructive dark:text-red-400">تنبيه هام: إذا كان الحفظ في الشيت الخاص بك لا يعمل، تأكد من إضافة المتغيرات <strong>LOVABLE_API_KEY</strong> و <strong>GOOGLE_SHEETS_API_KEY</strong> في إعدادات Secrets في مشروعك على Lovable.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {(error || notice) && (
            <div className={`rounded-lg border p-3 text-sm sm:p-4 ${error ? "border-destructive bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
              <div className="flex items-start gap-2">
                {error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm">{error ? `خطأ: ${error}` : notice}</pre>
              </div>
            </div>
          )}

          {lastExtracted && <ExtractionSummary data={lastExtracted} />}

          {lastExtracted && (
            <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-5 mb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold sm:text-lg flex items-center gap-2">
                  <span>وكيل التحقق 🕵️‍♂️</span>
                </h2>
                <button
                  onClick={runQA}
                  disabled={qaLoading}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {qaLoading ? "جاري التحقق..." : "شغّل وكيل التحقق"}
                </button>
              </div>
              {qaResult && (
                <div className={`mt-3 rounded-md border p-3 text-sm ${qaResult.isCorrect && !qaResult.needsHumanVerification ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-400"}`}>
                  <div className="font-semibold mb-1">
                    {qaResult.isCorrect && !qaResult.needsHumanVerification ? "✅ البيانات متطابقة!" : "⚠️ يتطلب تحقق بشري"}
                  </div>
                  <div className="whitespace-pre-wrap">{qaResult.feedback}</div>
                </div>
              )}
            </section>
          )}

          <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold sm:text-lg">مراجعة البيانات</h2>
              <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground sm:text-xs">راجع قبل الحفظ</span>
            </div>

            <FieldGroup title="الأساسيات">
              <Field
                label="Department (القسم)"
                v={row.department}
                onChange={(v) => setRow({ ...row, department: v })}
                suggestions={deptHistory}
                listId="dept-list"
              />
              <Select label="Floor (الدور)" v={row.floor} opts={FLOORS} onChange={(v) => setRow({ ...row, floor: v })} />
              <Field
                label="Room / Employee (الغرفة)"
                v={row.location}
                onChange={(v) => setRow({ ...row, location: v })}
                rtl
                suggestions={locHistory}
                listId="loc-list"
                placeholder="مثال: عيادة العلاج الطبيعي BF-138"
              />
              {recentLocations.length > 0 && (
                <div className="sm:col-span-2 xl:col-span-3">
                  <p className="mb-1 text-[10px] text-muted-foreground">مواقع مستخدمة مؤخراً:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentLocations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setRow({ ...row, location: loc })}
                        className="rounded-full border bg-background px-2.5 py-1 text-[11px] hover:bg-accent"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Ministry Tag" v={row.ministry_tag} onChange={(v) => setRow({ ...row, ministry_tag: v })} />
              <Select label="Device Type" v={row.device_type} opts={DEVICE_TYPES} onChange={(v) => setRow({ ...row, device_type: v })} />
              <Select label="Manufacturer" v={row.manufacturer} opts={MANUFACTURERS} onChange={(v) => setRow({ ...row, manufacturer: v })} />
              <Field label="Serial Number" v={row.serial_number} onChange={(v) => setRow({ ...row, serial_number: v })} />
            </FieldGroup>

            <div className="mb-4 border-b pb-4 sm:mb-5 sm:pb-5">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >
                <span>حقول إضافية (اختيارية — تبقى N/A تلقائياً)</span>
                <span className="text-xs text-muted-foreground">{showAdvanced ? "إخفاء ▲" : "عرض ▼"}</span>
              </button>
            </div>

            {showAdvanced && (
              <>
                <FieldGroup title="الصيانة">
                  <Field label="Last Maintenance" v={row.last_maintenance} onChange={(v) => setRow({ ...row, last_maintenance: v })} placeholder="dd/mm/yyyy" />
                  <Field label="Next Maintenance" v={row.next_maintenance} onChange={(v) => setRow({ ...row, next_maintenance: v })} placeholder="dd/mm/yyyy" />
                </FieldGroup>

                <FieldGroup title="هوية إضافية">
                  <Field label="MAC Address" v={row.mac_address} onChange={(v) => setRow({ ...row, mac_address: v })} placeholder="XX-XX-XX-XX-XX-XX" />
                  <Field label="Device Name" v={row.device_name} onChange={(v) => setRow({ ...row, device_name: v })} placeholder="E2-HS-KFHH-..." />
                </FieldGroup>

                <FieldGroup title="الحالة والشبكة">
                  <Select label="Lifecycle Stage" v={row.lifecycle_stage} opts={LIFECYCLE} onChange={(v) => setRow({ ...row, lifecycle_stage: v })} />
                  <Select label="Device Age" v={row.device_age} opts={AGE} onChange={(v) => setRow({ ...row, device_age: v })} />
                  <Select label="Connection Type" v={row.connection_type} opts={CONNECTION} onChange={(v) => setRow({ ...row, connection_type: v })} />
                  <Select label="In MOH Domain" v={row.in_moh_domain} opts={YESNO_UP} onChange={(v) => setRow({ ...row, in_moh_domain: v })} />
                  <Select label="Admin Local User" v={row.admin_local_user} opts={YESNO} onChange={(v) => setRow({ ...row, admin_local_user: v })} />
                  <Select label="Has Antivirus" v={row.has_antivirus} opts={YESNO} onChange={(v) => setRow({ ...row, has_antivirus: v })} />
                  <Select label="Clean Device" v={row.clean_device} opts={CLEAN} onChange={(v) => setRow({ ...row, clean_device: v })} />
                  <Select label="IP Type" v={row.ip_type} opts={IP_TYPE} onChange={(v) => setRow({ ...row, ip_type: v })} />
                  <Select label="Programming" v={row.programming} opts={PROGRAMMING_OPT} onChange={(v) => setRow({ ...row, programming: v })} />
                </FieldGroup>

                <FieldGroup title="المواصفات">
                  <Select label="Windows Version" v={row.windows_version} opts={WINDOWS} onChange={(v) => setRow({ ...row, windows_version: v })} />
                  <Select label="Processor" v={row.processor} opts={PROCESSORS} onChange={(v) => setRow({ ...row, processor: v })} />
                  <Select label="RAM" v={row.ram} opts={RAM_OPT} onChange={(v) => setRow({ ...row, ram: v })} />
                  <Select label="HDD" v={row.hdd} opts={HDD_OPT} onChange={(v) => setRow({ ...row, hdd: v })} />
                  <Select label="SSD" v={row.ssd} opts={SSD_OPT} onChange={(v) => setRow({ ...row, ssd: v })} />
                </FieldGroup>

                <FieldGroup title="ملاحظات ومتابعة" last>
                  <Field label="ملاحظات" v={row.notes} onChange={(v) => setRow({ ...row, notes: v })} rtl />
                  <Field label="Update" v={row.update} onChange={(v) => setRow({ ...row, update: v })} />
                  <Field label="Need" v={row.need} onChange={(v) => setRow({ ...row, need: v })} />
                  <Select label="Solution By" v={row.solution_by} opts={SOLUTION_BY} onChange={(v) => setRow({ ...row, solution_by: v })} />
                </FieldGroup>
              </>
            )}

            <div className="sticky bottom-0 -mx-3 mt-5 flex flex-wrap gap-2 border-t bg-card/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4">
              <button
                onClick={saveToSheet}
                disabled={savingSheet}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-base font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-60 sm:w-auto"
              >
                <FileSpreadsheet className="h-5 w-5" />
                {savingSheet ? "جاري الإرسال..." : "إرسال للشيت"}
              </button>
              <div className="flex w-full gap-2 sm:w-auto">
                <button onClick={save} className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg border bg-background px-4 py-3.5 text-base font-medium hover:bg-accent">
                  <Save className="h-5 w-5" />
                  محلي
                </button>
                <button onClick={() => setRow(makeEmpty())} className="flex-1 sm:flex-none rounded-lg border bg-background px-4 py-3.5 text-base font-medium hover:bg-accent">
                  مسح
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold sm:text-lg">الصفوف المحفوظة ({saved.length})</h2>
              <div className="flex gap-2">
                {saved.some(s => s.pendingSync) && (
                   <button
                     onClick={syncPendingAction}
                     disabled={savingSheet}
                     className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 sm:text-sm"
                   >
                     مزامنة المعلقات ⏳
                   </button>
                )}
                <button
                  onClick={exportCsv}
                  disabled={saved.length === 0}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:text-sm"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
              </div>
            </div>
            {saved.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/50 p-4 text-center text-xs text-muted-foreground sm:text-sm">لا توجد صفوف بعد.</p>
            ) : (
              <div className="-mx-3 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[600px] text-xs">
                  <thead className="bg-muted">
                    <tr className="border-b text-right">
                      <th className="p-2">#</th>
                      <th className="p-2">Tag</th>
                      <th className="p-2">Device</th>
                      <th className="p-2">Serial</th>
                      <th className="p-2">Room</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {saved.map((s, i) => (
                      <tr key={`${s.serial_number}-${i}`} className="border-b last:border-b-0">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2" dir="ltr">{s.ministry_tag}</td>
                        <td className="p-2" dir="ltr">{s.device_type}</td>
                        <td className="p-2" dir="ltr">{s.serial_number}</td>
                        <td className="p-2">{s.location}</td>
                        <td className="p-2">
                          <button onClick={() => removeSaved(i)} className="text-destructive hover:underline">
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

      <datalist id="loc-list">
        {locHistory.map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id="dept-list">
        {deptHistory.map((v) => <option key={v} value={v} />)}
      </datalist>
    </div>
  );
}

function FieldGroup({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-4 border-b pb-4 sm:mb-5 sm:pb-5"}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-3 sm:text-xs">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">{children}</div>
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
  ].filter(([, v]) => v && String(v).toUpperCase() !== "N/A");

  return (
    <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-5">
      <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold sm:text-lg">نتيجة التحليل</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground sm:text-sm">لم يتم استخراج حقول واضحة.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([label, value]) => (
            <div key={label as string} className="rounded-md border bg-background p-2.5">
              <p className="text-[10px] text-muted-foreground sm:text-[11px]">{label}</p>
              <p className="mt-0.5 text-sm font-semibold" dir="ltr">{value as string}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({
  label, v, onChange, placeholder, rtl, suggestions, listId,
}: {
  label: string; v: string; onChange: (v: string) => void; placeholder?: string; rtl?: boolean;
  suggestions?: string[]; listId?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-foreground sm:text-sm">{label}</span>
      <input
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={rtl ? "rtl" : "ltr"}
        list={suggestions && suggestions.length ? listId : undefined}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </label>
  );
}

function Select({ label, v, opts, onChange }: { label: string; v: string; opts: string[]; onChange: (v: string) => void }) {
  const merged = v && !opts.includes(v) ? [v, ...opts] : opts;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-foreground sm:text-sm">{label}</span>
      <select
        value={v}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        <option value=""></option>
        {merged.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
