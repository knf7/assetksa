import { createFileRoute } from "@tanstack/react-router";

type SearchBody = {
  spreadsheetId?: string;
  sheetName?: string;
  query: string; // Serial Number or Ministry Tag
};

export const Route = createFileRoute("/api/sheets-search")({
  loader: () => null,
});

export const APIRoute = {
  method: "POST",
  handler: async (request: Request) => {
    try {
      if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

      const { spreadsheetId, sheetName, query } = (await request.json()) as SearchBody;
      if (!spreadsheetId || !query) {
        return Response.json({ error: "Missing parameters" }, { status: 400 });
      }

      const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
      
      if (!sheetsKey) {
         return Response.json({ error: "Missing GOOGLE_SHEETS_API_KEY" }, { status: 500 });
      }

      const tab = (sheetName || "Sheet1").trim() || "Sheet1";
      const range = `${tab}!A:AC`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${sheetsKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Sheets read error:", data);
        return Response.json({ error: "Failed to read Google Sheet", details: data }, { status: response.status });
      }

      const rows = data.values || [];
      if (rows.length === 0) {
        return Response.json({ found: false });
      }

      const q = query.trim().toLowerCase();
      let matchedRow = null;

      // Start from 1 to skip header
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const ministryTag = (row[5] || "").toString().trim().toLowerCase(); // Column F
        const serialNumber = (row[8] || "").toString().trim().toLowerCase(); // Column I
        
        if (ministryTag === q || serialNumber === q) {
          matchedRow = row;
          break;
        }
      }

      if (!matchedRow) {
        return Response.json({ found: false });
      }

      const val = (idx: number) => (matchedRow[idx] || "").toString().trim() || "N/A";
      const valEmpty = (idx: number) => (matchedRow[idx] || "").toString().trim();
      
      const assetData = {
        department: valEmpty(0) || "المباني الاداريه", // A
        floor: valEmpty(1), // B
        location: valEmpty(2), // C
        last_maintenance: valEmpty(3), // D
        next_maintenance: valEmpty(4), // E
        ministry_tag: valEmpty(5), // F
        device_type: valEmpty(6), // G
        manufacturer: valEmpty(7), // H
        serial_number: valEmpty(8), // I
        mac_address: val(9), // J
        device_name: val(10), // K
        lifecycle_stage: val(11) === "N/A" ? "In Use" : val(11), // L
        device_age: val(12), // M
        connection_type: val(13), // N
        in_moh_domain: val(14), // O
        admin_local_user: val(15), // P
        has_antivirus: val(16), // Q
        programming: val(17), // R
        clean_device: val(18), // S
        ip_type: val(19), // T
        windows_version: val(20), // U
        processor: val(21), // V
        hdd: val(22), // W
        ssd: val(23), // X
        ram: val(24), // Y
        notes: val(25), // Z
        update: val(26), // AA
        need: val(27), // AB
        solution_by: valEmpty(28) || "IT", // AC
      };

      return Response.json({ found: true, data: assetData });

    } catch (e: any) {
      console.error(e);
      return Response.json({ error: "Internal Error", message: e.message }, { status: 500 });
    }
  },
};
