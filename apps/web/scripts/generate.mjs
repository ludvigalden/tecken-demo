// Writes the app's generated files into src/generated/:
//  - schema.d.ts, the API types, from contracts/openapi/tecken.openapi.json;
//  - sources.json, the attribution list /kallor renders, from
//    content/utterances (only the provenance fields the page shows);
//  - AccessibilityStatement.vue, the body of /tillganglighet, from
//    docs/accessibility/tillganglighetsredogorelse.md. The h1 is left out
//    because the view renders the page heading, and repo-relative links
//    become absolute GitHub URLs because the page is served without the
//    repository.
// Usage: node apps/web/scripts/generate.mjs (`npm run generate`)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const root = join(import.meta.dirname, "../../..");
const outDir = join(import.meta.dirname, "../src/generated");

async function apiSchema() {
    const spec = readFileSync(
        join(root, "contracts/openapi/tecken.openapi.json"),
        "utf8",
    );
    const ast = await openapiTS(spec);
    return `/* Generated from contracts/openapi/tecken.openapi.json by openapi-typescript — do not edit. */\n${astToString(ast)}`;
}

/** The provenance fields /kallor shows; nothing else is shipped. */
const SHOWN = [
    "author",
    "licence",
    "licence_url",
    "source_title",
    "source_url",
    "permission_ticket",
];

function sources() {
    const dir = join(root, "content/utterances");
    const records = readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .toSorted()
        .map((f) => {
            const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
            return {
                id: r.id,
                kind: r.kind,
                text_sv: r.text_sv,
                ...(r.link_out_url && { link_out_url: r.link_out_url }),
                provenance: Object.fromEntries(
                    SHOWN.map((k) => [k, r.provenance[k] ?? null]),
                ),
            };
        });
    return `${JSON.stringify(records, null, 4)}\n`;
}

const STATEMENT = "docs/accessibility/tillganglighetsredogorelse.md";
const DOCS_URL =
    "https://github.com/ludvigalden/tecken-demo/blob/main/docs/accessibility/";

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function href(target) {
    return /^[a-z][a-z\d+.-]*:/iu.test(target) ? target : DOCS_URL + target;
}

/** Bold text, with everything escaped. */
function plain(text) {
    return escapeHtml(text).replaceAll(
        /\*\*([^*]+)\*\*/gu,
        (_all, bold) => `<strong>${bold}</strong>`,
    );
}

/** Inline markdown: links and bold text. */
function inline(text) {
    let html = "";
    let last = 0;
    for (const match of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/gu)) {
        const [whole, label = "", target = ""] = match;
        html += plain(text.slice(last, match.index));
        html += `<a href="${escapeHtml(href(target))}">${plain(label)}</a>`;
        last = match.index + whole.length;
    }
    return html + plain(text.slice(last));
}

/** Headings, paragraphs and bullet lists, one element per line. */
function blocks(markdown) {
    const out = [];
    let paragraph = [];
    let list = [];
    const flush = () => {
        if (paragraph.length > 0) {
            out.push(`    <p>${inline(paragraph.join(" "))}</p>`);
            paragraph = [];
        }
        if (list.length === 0) {
            return;
        }
        out.push("    <ul>");
        for (const item of list) {
            out.push(`        <li>${inline(item)}</li>`);
        }
        out.push("    </ul>");
        list = [];
    };
    for (const line of markdown.split("\n")) {
        if (line.startsWith("# ") || line.trim() === "") {
            flush();
        } else if (line.startsWith("## ")) {
            flush();
            out.push(`    <h2>${inline(line.slice(3))}</h2>`);
        } else if (line.startsWith("- ")) {
            if (paragraph.length > 0) {
                flush();
            }
            list.push(line.slice(2));
        } else if (list.length > 0 && /^\s/u.test(line)) {
            list[list.length - 1] += ` ${line.trim()}`;
        } else {
            if (list.length > 0) {
                flush();
            }
            paragraph.push(line.trim());
        }
    }
    flush();
    return out;
}

function accessibilityStatement() {
    return [
        `<!-- Generated from ${STATEMENT} by \`lerna run generate\`. Never edit by hand. -->`,
        "<template>",
        ...blocks(readFileSync(join(root, STATEMENT), "utf8")),
        "</template>",
        "",
    ].join("\n");
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "schema.d.ts"), await apiSchema());
writeFileSync(join(outDir, "sources.json"), sources());
writeFileSync(
    join(outDir, "AccessibilityStatement.vue"),
    accessibilityStatement(),
);
