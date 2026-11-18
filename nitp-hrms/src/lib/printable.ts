export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const csvCell = (v: unknown) => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // stop spreadsheet formula injection
  return `"${t.replace(/"/g, '""')}"`;
};

/** A standalone, print-friendly page (Ctrl/Cmd+P saves it as PDF). */
export function printablePage(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
body{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#16161a;max-width:760px;margin:32px auto;padding:0 20px}
h1{font-size:24px;margin:0 0 4px;letter-spacing:-.02em}.muted{color:#6b6b74;margin:2px 0}.small{font-size:12px;margin-top:24px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:22px;font-weight:700}.brand i{width:28px;height:28px;border-radius:8px;background:#16161a;display:inline-block}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px}table{width:100%;border-collapse:collapse}th,td{padding:7px 0;border-bottom:1px solid #ecebe7;text-align:left}
th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b6b74}.r{text-align:right;font-variant-numeric:tabular-nums}tfoot td{font-weight:800;border-bottom:none}
.net{margin-top:22px;background:#e3f6ec;color:#0c6b44;border-radius:14px;padding:16px 18px;font-size:16px;display:flex;justify-content:space-between}
.cert{border:2px solid #efe9ff;border-radius:18px;padding:56px 36px;text-align:center}.cert h2{font-size:34px;margin:10px 0}
.print{position:fixed;right:20px;top:16px;border:none;background:#16161a;color:#fff;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer}
@media print{.print{display:none}body{margin:0}}@media(max-width:560px){.cols{grid-template-columns:1fr}}
</style></head><body><button class="print" onclick="window.print()">Print / Save PDF</button><div class="brand"><i></i>NITP People</div>${body}</body></html>`;
}
