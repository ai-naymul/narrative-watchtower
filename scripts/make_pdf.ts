/**
 * Render the report + model card markdown into print-styled HTML (for Chromium
 * --print-to-pdf). Light theme, 10.5pt, A4. Run: npx tsx scripts/make_pdf.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { marked } from "marked";

const CSS = `
@page { size: A4; margin: 15mm 14mm; }
* { box-sizing: border-box; }
body { font: 10.5pt/1.46 "Helvetica Neue", Arial, sans-serif; color: #14181f; margin: 0; }
h1 { font-size: 19pt; margin: 0 0 2px; color: #0b1a2b; }
h1 + h3 { margin-top: 0; color: #b45309; font-weight: 600; }
h2 { font-size: 13pt; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #d8dee6; color: #0b1a2b; }
h3 { font-size: 11pt; margin: 10px 0 4px; color: #1f2937; }
p, li { margin: 4px 0; }
a { color: #0369a1; text-decoration: none; }
strong { color: #0b1a2b; }
hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10pt; }
th, td { border: 1px solid #cbd2da; padding: 3px 5px; text-align: left; vertical-align: top; }
th { background: #f1f4f8; color: #0b1a2b; }
code { font-family: "SF Mono", Consolas, monospace; font-size: 10pt; background: #f1f4f8; padding: 0 3px; border-radius: 3px; }
pre { background: #f1f4f8; color: #14181f; padding: 8px 10px; border-radius: 6px; font-size: 10pt; line-height: 1.4; overflow: hidden; white-space: pre-wrap; }
pre code { background: none; color: inherit; padding: 0; }
img { max-width: 100%; border: 1px solid #cbd2da; border-radius: 6px; margin: 8px 0 2px; }
figure { margin: 10px 0; } figcaption { font-size: 10pt; color: #4b5563; margin-top: 2px; }
em { color: #4b5563; }
h2 { page-break-after: avoid; } table, pre { page-break-inside: avoid; }
`;

async function render(mdFile: string, htmlFile: string) {
  const md = await fs.readFile(mdFile, "utf-8");
  const body = await marked.parse(md);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;
  await fs.writeFile(htmlFile, html, "utf-8");
  console.log("wrote", path.basename(htmlFile));
}

async function main() {
  const d = path.join(process.cwd(), "docs");
  await render(path.join(d, "REPORT.md"), path.join(d, "REPORT.html"));
  await render(path.join(d, "MODEL_CARD.md"), path.join(d, "MODEL_CARD.html"));
}
main().catch((e) => (console.error(e), process.exit(1)));
