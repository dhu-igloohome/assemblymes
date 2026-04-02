export interface TraceRecordInput {
  serialNo: string;
  bluetoothId: string;
}

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === ',' || c === '\t' || c === ';') && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

const SERIAL_HEADER_PATTERNS = [
  /^sn$/,
  /^serial$/,
  /^serial_no$/,
  /^serial_number$/,
  /^serialnumber$/,
  /^序列号$/,
];

const BLUETOOTH_HEADER_PATTERNS = [
  /^ble$/,
  /^bt$/,
  /^bluetooth$/,
  /^bluetooth_id$/,
  /^bluetoothid$/,
  /^bt_addr$/,
  /^bt_address$/,
  /^mac$/,
  /^mac_addr$/,
  /^mac_address$/,
  /^蓝牙$/,
  /^蓝牙编号$/,
  /^蓝牙地址$/,
];

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  const normalized = headers.map((h) => normalizeHeader(h));
  for (let i = 0; i < normalized.length; i += 1) {
    const h = normalized[i];
    if (patterns.some((p) => p.test(h))) {
      return i;
    }
  }
  return -1;
}

export function parseRecordsFromCsvText(csvText: string):
  | { ok: true; records: TraceRecordInput[] }
  | { ok: false; error: 'TRACE_CSV_EMPTY' | 'TRACE_CSV_HEADER_INVALID' | 'TRACE_LINE_INVALID'; details?: string } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { ok: false, error: 'TRACE_CSV_EMPTY' };
  }

  const firstRow = splitCsvLine(lines[0]);
  const serialIdx = findColumnIndex(firstRow, SERIAL_HEADER_PATTERNS);
  const bleIdx = findColumnIndex(firstRow, BLUETOOTH_HEADER_PATTERNS);

  if (serialIdx >= 0 && bleIdx >= 0 && serialIdx !== bleIdx) {
    const records: TraceRecordInput[] = [];
    for (let r = 1; r < lines.length; r += 1) {
      const cells = splitCsvLine(lines[r]);
      const serialNo = (cells[serialIdx] ?? '').trim().toUpperCase();
      const bluetoothId = (cells[bleIdx] ?? '').trim().toUpperCase();
      if (!serialNo || !bluetoothId) {
        return { ok: false, error: 'TRACE_LINE_INVALID', details: lines[r] };
      }
      records.push({ serialNo, bluetoothId });
    }
    if (records.length === 0) {
      return { ok: false, error: 'TRACE_CSV_EMPTY' };
    }
    return { ok: true, records };
  }

  if (lines.length === 1 && serialIdx >= 0) {
    return { ok: false, error: 'TRACE_CSV_HEADER_INVALID' };
  }

  const records: TraceRecordInput[] = [];
  for (const line of lines) {
    const parts = splitCsvLine(line).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      return { ok: false, error: 'TRACE_LINE_INVALID', details: line };
    }
    records.push({
      serialNo: parts[0].toUpperCase(),
      bluetoothId: parts[1].toUpperCase(),
    });
  }
  return { ok: true, records };
}

export function parseLinePlain(line: string): TraceRecordInput | null {
  const parts = line
    .split(/[,\t;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return {
    serialNo: parts[0].toUpperCase(),
    bluetoothId: parts[1].toUpperCase(),
  };
}

export function parseRecordsFromPlainText(rawRecords: string):
  | { ok: true; records: TraceRecordInput[] }
  | { ok: false; error: 'TRACE_RECORDS_REQUIRED' | 'TRACE_LINE_INVALID'; details?: string } {
  const lines = rawRecords
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { ok: false, error: 'TRACE_RECORDS_REQUIRED' };
  }
  const records: TraceRecordInput[] = [];
  for (const line of lines) {
    const record = parseLinePlain(line);
    if (!record) {
      return { ok: false, error: 'TRACE_LINE_INVALID', details: line };
    }
    records.push(record);
  }
  return { ok: true, records };
}

export function validateUniqueRecords(records: TraceRecordInput[]):
  | { ok: true }
  | { ok: false; error: 'SERIAL_NO_DUPLICATE_IN_FILE' | 'BLUETOOTH_ID_DUPLICATE_IN_FILE' | 'SERIAL_NO_REQUIRED' | 'BLUETOOTH_ID_REQUIRED' } {
  const serialSet = new Set<string>();
  const bluetoothSet = new Set<string>();
  for (const row of records) {
    if (!row.serialNo) {
      return { ok: false, error: 'SERIAL_NO_REQUIRED' };
    }
    if (!row.bluetoothId) {
      return { ok: false, error: 'BLUETOOTH_ID_REQUIRED' };
    }
    if (serialSet.has(row.serialNo)) {
      return { ok: false, error: 'SERIAL_NO_DUPLICATE_IN_FILE' };
    }
    if (bluetoothSet.has(row.bluetoothId)) {
      return { ok: false, error: 'BLUETOOTH_ID_DUPLICATE_IN_FILE' };
    }
    serialSet.add(row.serialNo);
    bluetoothSet.add(row.bluetoothId);
  }
  return { ok: true };
}

export function normalizeRecordsFromJsonPayload(raw: unknown):
  | { ok: true; records: TraceRecordInput[] }
  | { ok: false; error: 'RECORDS_INVALID' } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'RECORDS_INVALID' };
  }
  const records: TraceRecordInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'RECORDS_INVALID' };
    }
    const o = entry as Record<string, unknown>;
    const serialNo =
      typeof o.serialNo === 'string' ? o.serialNo.trim().toUpperCase() : '';
    const bluetoothId =
      typeof o.bluetoothId === 'string' ? o.bluetoothId.trim().toUpperCase() : '';
    if (!serialNo || !bluetoothId) {
      return { ok: false, error: 'RECORDS_INVALID' };
    }
    records.push({ serialNo, bluetoothId });
  }
  return { ok: true, records };
}
