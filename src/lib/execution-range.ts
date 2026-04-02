const MAX_RANGE_ITEMS = 5000;

export type ExpandRangeError =
  | 'RANGE_REQUIRED'
  | 'RANGE_PARSE_FAILED'
  | 'RANGE_PREFIX_MISMATCH'
  | 'RANGE_ORDER_INVALID'
  | 'RANGE_LENGTH_MISMATCH'
  | 'RANGE_TOO_LARGE';

function parseTrailingNumber(s: string): { head: string; num: bigint; width: number } | null {
  const m = s.match(/^(.*?)(\d+)$/);
  if (!m) {
    return null;
  }
  const head = m[1];
  const digits = m[2];
  return { head, num: BigInt(digits), width: digits.length };
}

function bigOne(): bigint {
  return BigInt(1);
}

export function expandCodeRange(
  startRaw: string,
  endRaw: string
): { ok: true; values: string[] } | { ok: false; error: ExpandRangeError } {
  const start = startRaw.trim().toUpperCase();
  const end = endRaw.trim().toUpperCase();
  if (!start || !end) {
    return { ok: false, error: 'RANGE_REQUIRED' };
  }
  const a = parseTrailingNumber(start);
  const b = parseTrailingNumber(end);
  if (!a || !b) {
    return { ok: false, error: 'RANGE_PARSE_FAILED' };
  }
  if (a.head !== b.head) {
    return { ok: false, error: 'RANGE_PREFIX_MISMATCH' };
  }
  if (a.num > b.num) {
    return { ok: false, error: 'RANGE_ORDER_INVALID' };
  }
  const width = Math.max(a.width, b.width);
  const count = Number(b.num - a.num + bigOne());
  if (count > MAX_RANGE_ITEMS) {
    return { ok: false, error: 'RANGE_TOO_LARGE' };
  }
  const values: string[] = [];
  for (let n = a.num; n <= b.num; n += bigOne()) {
    values.push(`${a.head}${n.toString().padStart(width, '0')}`);
  }
  return { ok: true, values };
}

export function expandPairedRanges(
  serialStart: string,
  serialEnd: string,
  bluetoothStart: string,
  bluetoothEnd: string
):
  | { ok: true; pairs: { serialNo: string; bluetoothId: string }[] }
  | { ok: false; error: ExpandRangeError } {
  const serials = expandCodeRange(serialStart, serialEnd);
  if (!serials.ok) {
    return serials;
  }
  const bluetooths = expandCodeRange(bluetoothStart, bluetoothEnd);
  if (!bluetooths.ok) {
    return bluetooths;
  }
  if (serials.values.length !== bluetooths.values.length) {
    return { ok: false, error: 'RANGE_LENGTH_MISMATCH' };
  }
  const pairs = serials.values.map((serialNo, i) => ({
    serialNo,
    bluetoothId: bluetooths.values[i] ?? '',
  }));
  return { ok: true, pairs };
}
