import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Download, Search, AlertTriangle } from 'lucide-react';

// Generic half-hourly / hourly CSV viewer. Opens when a Data Panel row is
// clicked, fetches the underlying CSV from /data/, parses it lazily, and
// renders the rows in a paginated table. Works with every CSV shape we have:
//   - Wide HH format (Meter Id, Date, 00:30, 01:00, …)
//   - Long hourly format (datetime, value_kWh, data_type)
//   - Wide HH with TotalUnits column
//   - Hour-of-year format (Hour, Month, Day, Hour of Day, value)

interface HHDataModalProps {
  url: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

// Minimal CSV parser that handles quoted strings with commas and escaped
// quotes ("" inside a quoted field). Sufficient for the spreadsheets we ship.
function parseCsv(text: string): ParsedCsv {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.length > 0 || ch === '\n') {
        lines.push(current);
        current = '';
      }
      // swallow paired \r\n
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);

  const splitRow = (s: string): string[] => {
    const out: string[] = [];
    let buf = '';
    let inQ = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"') {
        if (inQ && s[i + 1] === '"') { buf += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        out.push(buf);
        buf = '';
      } else {
        buf += ch;
      }
    }
    out.push(buf);
    return out;
  };

  if (lines.length === 0) return { headers: [], rows: [] };

  // Skip any leading comment lines that start with "#" — our build-time
  // generated combined CSVs prefix themselves with a couple of comments
  // documenting the merge.
  let firstReal = 0;
  while (firstReal < lines.length && lines[firstReal].trimStart().startsWith('#')) firstReal++;

  // Some of our HH exports start with a banner line like
  //   "HH Data by group, Site Group Manchester City Football Club, Start Date …"
  // followed by a blank row, with the real column header on line 3. Detect
  // that and skip the banner so the table reads as expected.
  let headerLineIdx = firstReal;
  if (lines.length >= firstReal + 3 && /^"?HH Data by group/i.test(lines[firstReal])) {
    headerLineIdx = firstReal + 2;
  }

  const headers = splitRow(lines[headerLineIdx]).map((h) => h.trim());
  const rows: string[][] = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    rows.push(splitRow(lines[i]));
  }
  return { headers, rows };
}

const PAGE_SIZE = 100;

export function HHDataModal({ url, title, subtitle, onClose }: HHDataModalProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const isXlsx = /\.xlsx?$/i.test(url);

  // Load + parse on mount. Two-stage strategy:
  //   1. Check window.__MCFC_HH_DATA__ — set at boot time by the single-file
  //      build, which inlines every /data/*.csv into the HTML. This is the
  //      ONLY path that works on file:// origins (where fetch on a relative
  //      URL throws "Failed to fetch" for security reasons).
  //   2. Otherwise fall back to fetch(url). That's the dev / hosted path
  //      and is unchanged from before.
  // .xlsx is shown as download-only — parsing the binary format inline isn't
  // worth shipping a 200 KB dependency.
  useEffect(() => {
    if (isXlsx) {
      setStatus('ready');
      return;
    }
    let cancelled = false;
    setStatus('loading');

    // 1. Inline registry hit — synchronous, no network.
    const registry = (window as unknown as { __MCFC_HH_DATA__?: Record<string, string> }).__MCFC_HH_DATA__;
    if (registry && typeof registry[url] === 'string') {
      try {
        const p = parseCsv(registry[url]);
        setParsed(p);
        setStatus('ready');
        return () => { cancelled = true; };
      } catch (e) {
        setError('Inline parse failed: ' + (e instanceof Error ? e.message : String(e)));
        setStatus('error');
        return () => { cancelled = true; };
      }
    }

    // 2. Fall back to fetch (dev server / hosted build).
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (cancelled) return;
        const p = parseCsv(text);
        setParsed(p);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        // Make the file:// failure mode obvious: if we're on a file:// origin
        // AND there's no inline registry, the build didn't ship the data
        // (probably opened an older HTML export that pre-dates the inline
        // registry feature). Tell the user exactly that rather than a
        // generic "Failed to fetch".
        const onFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
        const noRegistry = !registry || Object.keys(registry).length === 0;
        if (onFile && noRegistry) {
          setError('This HTML export does not have the HH data inlined. Re-run the export to pick up the latest build.');
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [url, isXlsx]);

  // Esc closes the modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filteredRows = useMemo(() => {
    if (!parsed) return [];
    if (!filter.trim()) return parsed.rows;
    const q = filter.toLowerCase();
    return parsed.rows.filter((r) => r.some((c) => c.toLowerCase().includes(q)));
  }, [parsed, filter]);

  const pageRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const filename = url.split('/').pop() || url;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      data-testid="hh-data-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{filename}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <a
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Download size={13} />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {status === 'loading' && (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Loading {filename}…
            </div>
          )}
          {status === 'error' && (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center max-w-md">
                <AlertTriangle size={28} className="text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800 mb-1">Couldn&apos;t load the data file</p>
                <p className="text-xs text-gray-500 mb-3">{error}</p>
                <p className="text-[11px] text-gray-400">The download button still works. The file may need to be fetched directly.</p>
              </div>
            </div>
          )}
          {status === 'ready' && isXlsx && (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center max-w-md">
                <p className="text-sm font-semibold text-gray-800 mb-1">Excel workbook</p>
                <p className="text-xs text-gray-500">
                  This source is a multi-sheet .xlsx file. Click <strong>Download</strong> above to open it
                  in Excel / Google Sheets / a similar tool. Per-asset CSVs (where available) are previewed
                  inline.
                </p>
              </div>
            </div>
          )}
          {status === 'ready' && !isXlsx && parsed && (
            <>
              {/* Controls */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/60 shrink-0 gap-3">
                <div className="relative flex-1 min-w-0 max-w-sm">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={filter}
                    onChange={(e) => { setFilter(e.target.value); setPage(0); }}
                    placeholder="Filter rows (date, value, MPAN…)"
                    className="w-full text-xs pl-7 pr-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="text-[11px] text-gray-500 whitespace-nowrap font-mono">
                  {parsed.rows.length.toLocaleString()} rows · {parsed.headers.length} cols
                  {filter && ` · ${filteredRows.length.toLocaleString()} match`}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40"
                    >Prev</button>
                    <span className="font-mono text-gray-500 px-2">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40"
                    >Next</button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div ref={tableRef} className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      {parsed.headers.map((h, i) => (
                        <th
                          key={i}
                          className="text-left px-2 py-1.5 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap"
                        >
                          {h || `col${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                        {parsed.headers.map((_, ci) => (
                          <td key={ci} className="px-2 py-1 text-gray-700 font-mono whitespace-nowrap border-b border-gray-100/60">
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={parsed.headers.length} className="px-4 py-8 text-center text-gray-500 text-sm">
                          No rows match the filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
