// Catches accidental traces in the repository tree (tracked files plus
// new, not-ignored ones): text that slips into a commit by mistake, such
// as a retired contact address or a note about how the tree was built.
// It is a catcher of known accidental forms, not an exhaustive filter: a
// trace in a form not listed below passes. Documentation states facts
// about the software, not the process that produced it.
//
// Forms caught:
// - the retired addresses, with the at sign and dot as written, as
//   `{'@'}`, `%40`, `&#64;`, `&#x40;`, `&commat;`, `\x40`, `\u0040`,
//   `\u{40}`, or spelled out as at/dot, bracketed or bare;
// - an address split across two adjacent lines, or split into adjacent
//   string literals of the same quote kind joined by `+`;
// - numbered change requests and issues: PR, pull request, issue, GH-n,
//   MR !n, merge request n, a bare !n, owner/repo#n, the /pull/, /issues/
//   and /merge_requests/ URL paths, and a bare or bracketed #n;
// - planning, gate and probe labels (M, G or P and a number);
// - numbered sprints, iterations, phases and tickets, and the Swedish
//   ärende and uppgift with a number;
// - work items named by type and a lettered number (story S, epic E,
//   issue I) and the E/S and S/I path forms;
// - finding labels after review, validation or the words that introduce
//   one (finding, addresses, fixes, closes, resolves), review rounds and
//   fix-up commits, and mile-stones;
// - ruling labels (R and a number) next to "ruling" or "beslut";
// - Co-Authored-By lines;
// - paths into the private working directories (dot-work and
//   context-dot-local);
// - in Markdown files, a date later than the reference date (a deadline
//   or a plan), written as YYYY-MM-DD or as day, month name and year in
//   Swedish or English. The reference date is --as-of YYYY-MM-DD, or else
//   the HEAD commit's date. A missing, empty or non-date --as-of value
//   fails the scan with a named reason.
//
// Before the scan each file is read as UTF-8, NFKC-normalised (full-width
// forms fold to ASCII) and stripped of zero-width and soft-hyphen
// characters. Binary files, package-lock.json and SVG files skip the
// trace patterns; the address patterns run on every file.
//
// Out of scope: deliberate obfuscation. That includes homoglyphs,
// Markdown or HTML escaping beyond the forms above, encodings such as
// base64, hex, rot13 or full percent-encoding, reversed text, an address
// split over three or more lines or across mixed quotes, and a finding
// label that stands alone (`W1`, `E2`), which cannot be told apart from
// ordinary identifiers.
//
// Usage: node tools/ci/check-tree-hygiene.mjs
//     [--self-test | --print-patterns | --as-of YYYY-MM-DD]
// --self-test runs the patterns against planted samples and exits 1 if any
// trace is missed or any clean sample is flagged (the negative control).
// --print-patterns writes the patterns as JSON (source and flags), so other
// scanners apply this exact definition instead of a copy.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Every pattern and sample is joined from parts, so this file never
// matches itself.
const j = (...parts) => parts.join("");
// The separators also match the spelled-out, bracketed, percent-encoded and
// HTML-entity forms, so an obfuscated address is still an address.
const AT = String.raw`\s*(?:@|\{'@'\}|%40|&#0*64;|&#x0*40;|&commat;|\\x40|\\u0040|\\u\{40\}|[\[(<{]\s*at\s*[\])>}]|\bat\b)\s*`;
const DOT = String.raw`\s*(?:\.|%2e|&#0*46;|&#x0*2e;|&period;|[\[(<{]\s*dot\s*[\])>}]|\bdot\b)\s*`;
const ADDRESSES = [
    { local: j("lud", "vig"), host: [j("ld", "en"), "se"].join(DOT) },
    { local: j("tec", "ken"), host: ["demo", "ludvigalden", "com"].join(DOT) },
].map(({ local, host }) => new RegExp(`\\b${local}${AT}${host}\\b`, "iu"));

const PR = j("P", "R");
const PULL = j("pull", " request");
const PULL_ANY = String.raw`${j("pu", "ll")}[\s_-]?requests?`;
const REV = j("rev", "iew");
const VAL = j("valid", "ation");
const ROUND = j("ro", "und");
const TRACES = [
    // A numbered change request or issue, abbreviated or in full, with any
    // separator: GitHub's GH-number and GitLab's MR !number forms too.
    new RegExp(
        String.raw`\b(?:${PR}|${PULL_ANY}|issues?)[\s_-]*#?\d+\b|\b${j("G", "H")}-\d+\b|\b${j("M", "R")}\s*!\d+\b`,
        "iu",
    ),
    // A change request or issue named by repository or by URL.
    /(?<![\w/.:-])[\w.-]+\/[\w.-]+#\d+\b/u,
    new RegExp(
        String.raw`/(?:${j("pu", "ll")}s?|issues|merge_requests)/\d+`,
        "iu",
    ),
    // A bare hash-number reference in prose, also in brackets. Hex colours
    // never match: they continue with more hex digits or letters.
    /(?:^|[\s([{])#\d{1,5}(?=[\s.,;:)\]}]|$)/u,
    // Internal planning labels: M, an optional separator, one or two
    // digits and an optional lowercase suffix, any case. A label after a
    // dot is a CSS class selector or a property path, not a label.
    new RegExp(String.raw`(?<!\.)\b${j("M")}[-_]?\d{1,2}[a-z]?\b`, "iu"),
    // Internal gate and probe labels: G or P and one digit, any case.
    new RegExp(String.raw`\b[${j("G", "P")}]\d\b`, "iu"),
    // Numbered findings from a review pass, and the passes themselves.
    new RegExp(`\\b(?:${VAL}|${REV})\\s+(?:${ROUND}\\s+)?[EFIW]\\d+`, "iu"),
    new RegExp(`\\b(?:${REV}|${VAL})\\s+${ROUND}\\b`, "iu"),
    new RegExp(`\\b${j("fix", "up")}s?\\b`, "iu"),
    new RegExp(`\\b${j("mile", "stone")}s?(?![a-z])`, "iu"),
    // Numbered planning and work-tracking units.
    new RegExp(
        String.raw`\b(?:${j("spr", "int")}s?|${j("iter", "ation")}s?|${j("pha", "se")}s?|${j("tick", "et")}s?)[\s_-]*#?\d{1,4}\b`,
        "iu",
    ),
    // Work items named by type and a lettered number, and the slash path
    // form of two such numbers.
    new RegExp(
        String.raw`\b(?:${j("sto", "ry")}|${j("stor", "ies")}|${j("ep", "ic")}s?|${j("iss", "ue")}s?)[\s_-]*[SEI][-_]?\d{1,3}\b|\b[E]\d{1,3}\/[S]\d{1,3}\b|\b[S]\d{1,3}\/[I]\d{1,3}\b`,
        "iu",
    ),
    // A GitLab merge request referenced as a bare !number.
    /(?<![\w!&|=])![1-9]\d{0,4}\b/u,
    // A merge request named in full.
    new RegExp(
        String.raw`\b${j("mer", "ge")}[\s_-]?requests?[\s_-]*[#!]?\d+\b`,
        "iu",
    ),
    // Swedish case and task numbers.
    new RegExp(
        String.raw`(?<![\wåäöÅÄÖ])(?:${j("ären", "de")}(?:n|t)?|${j("upp", "gift")}(?:en|er)?)[\s_-]*#?\d{1,5}\b`,
        "iu",
    ),
    // Ruling labels in ruling context.
    new RegExp(
        String.raw`\b(?:${j("rul", "ing")}s?|${j("bes", "lut")})[\s_-]*R\d{1,3}\b|\bR\d{1,3}[\s_-]+(?:${j("rul", "ing")}|${j("bes", "lut")})\b`,
        "iu",
    ),
    // Co-authorship trailers copied into file content.
    new RegExp(String.raw`\b${j("co-auth", "ored-by")}\s*:`, "iu"),
    // Paths into the private working directories.
    new RegExp(
        String.raw`(?<![\w.-])\.${j("wo", "rk")}\/|\b${j("context", ".local")}\b`,
        "iu",
    ),
    // A finding label after the words that introduce one.
    new RegExp(
        String.raw`\b(?:${j("find", "ing")}s?|${j("addr", "ess")}(?:es|ed|ing)?|fix(?:es|ed)?|close[sd]?|resolve[sd]?)\s+[EFIW]\d{1,2}\b`,
        "iu",
    ),
];

// Machine-generated content where the trace patterns have no meaning:
// lockfile hashes, and SVG path commands followed by coordinates.
const TRACE_EXEMPT = [/(^|\/)package-lock\.json$/u, /\.svg$/u];

const SAMPLES_BAD = [
    j("measured on ", PR, " #7's CI"),
    j("see ", PULL, " #12"),
    j("arrives in M", "3/M", "4"),
    j("Changes in M", "8b"),
    j("stays a G", "2 step"),
    j("matching the P", "6 probe"),
    j("palette (", VAL, " W", "1)"),
    j("(M", "4 ", VAL, " F", "5/I8)"),
    j("after the second ", REV, " ", ROUND),
    j("a ", "fix", "up commit"),
    j("this ", "mile", "stone"),
    j("fixed in #", "42."),
    j("mail ", "lud", "vig", "@", "ld", "en", ".se"),
    j('mkdtemp(join(tmpdir(), "tecken-', "m", '2-fixture-"))'),
    j("a lowercase ", "g", "2 gap"),
    j("a lowercase ", "p", "1 probe"),
    j("see ", "pull", "-request 7"),
    j("in ", "pull", "request 7"),
    j("P", "R-12 merged"),
    j("G", "H-12"),
    j("M", "R !", "4"),
    j("this ", "mile", "stone4"),
    j("in m", "-3 work"),
    j("in M", "_3"),
    j("fixed [#", "9]"),
    j("ludvigalden/tecken-demo", "#12"),
    j("https://github.com/o/r/", "pu", "ll/12"),
    j("https://github.com/o/r/", "issues/3"),
    j("lud", "vig at ", "ld", "en.se"),
    j("lud", "vig @ ", "ld", "en . se"),
    j("lud", "vig[at]", "ld", "en[dot]se"),
    j("lud", "vig(at)", "ld", "en.se"),
    j("lud", "vig%40", "ld", "en.se"),
    j("lud", "vig&#64;", "ld", "en.se"),
    j("LUD", "VIG AT ", "LD", "EN DOT SE"),
    j("lud", "vig\u{200b}@", "ld", "en.se"),
    j("lud", "vig@\u{2060}", "ld", "en\u{ad}.se"),
    j("lud", "vig\u{ff20}", "ld", "en\u{ff0e}se"),
    j("lud", "vig\\x40", "ld", "en.se"),
    j("lud", "vig\\u0040", "ld", "en.se"),
    j("lud", "vig\\u{40}", "ld", "en.se"),
    j("lud", "vig@\n", "ld", "en.se"),
    j('"lud', 'vig@" + "', "ld", 'en.se"'),
    j("'lud", "vig' +\n    '@", "ld", "en.se'"),
    j("P", "R\u{200b}12"),
    j("in ", "spr", "int 2"),
    j("Spr", "int-3 board"),
    j("the second ", "iter", "ation 3"),
    j("pha", "se 2 of the build"),
    j("tick", "et 12"),
    j("tick", "et #12"),
    j("sto", "ry S03"),
    j("ep", "ic E12"),
    j("iss", "ue I02"),
    j("E1", "2/S03"),
    j("S0", "3/I02"),
    j("merged in !", "4"),
    j("(!", "12)"),
    j("find", "ing W1"),
    j("addr", "esses E1"),
    j("fixes ", "W2"),
    j("closes ", "I4"),
    j("see ", "mer", "ge request 12"),
    j("Mer", "ge-Request !", "7"),
    j("följer ", "ären", "de 12"),
    j("ären", "det #4"),
    j("se ", "upp", "gift 3"),
    j("per ", "rul", "ing R56"),
    j("R4", "5 ", "bes", "lut"),
    j("Co-Auth", "ored-By: Someone <s@example.org>"),
    j("see .", "wo", "rk/reports/x.md"),
    j("context", ".local/notes"),
];
const SAMPLES_CLEAN = [
    "--tecken-green-700: #1f6b4f;",
    "--tecken-ink-600: #525252;",
    j("by opening a ", PULL, " you agree"),
    j("Issue and ", PULL, " templates"),
    "LCP must not exceed 3500 ms",
    'retrieved_at: "2026-10-30"',
    "WCAG 2.2 AA, EN 301 549",
    "Microsoft M365 and Azure",
    ".m-3 { margin: 0; }",
    "an m3u8 playlist",
    "vitest 5.0.5 on Node.js 24, v1.2.3",
    'type = "Microsoft.App/containerApps@2024-03-01"',
    "https://example.org/guide#3-steps",
    "MP4 at 1.6 Mbit/s",
    "Ludvig Aldén at Uppsala",
    "issue templates and pull requests",
    "if (!x) return;",
    "a !== b && !0 && !!x",
    "const total = count + 1;",
    'const label = "Bokstav " + n;',
    "W3C and WCAG 2.2, and E2E tests",
    "IPv4 in phase with the clock",
    "the story of the sign",
    "lud\nvig",
    "Ludvig Aldén\n@ludvigalden on GitHub",
    "merge requests are reviewed",
    "ett ärende om tillgänglighet",
    "uppgiften är att stava",
    "the R2 bucket and an R10 resistor",
    "co-authored the page",
    "network.work/x and framework/y",
    j("context", ".locale = sv"),
];

// Dates in Markdown, checked against the reference date.
const MONTHS = [
    ["januari", "january"],
    ["februari", "february"],
    ["mars", "march"],
    ["april"],
    ["maj", "may"],
    ["juni", "june"],
    ["juli", "july"],
    ["augusti", "august"],
    ["september"],
    ["oktober", "october"],
    ["november"],
    ["december"],
];
const MONTH_OF = new Map(
    MONTHS.flatMap((names, i) => names.map((name) => [name, i + 1])),
);
const ISO_DATE = /(?<![\d.-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/gu;
const MONTH_NAMES = MONTHS.flat().join("|");
const NAMED_DATE = new RegExp(
    String.raw`\b(\d{1,2})\s+(${MONTH_NAMES})\s+(\d{4})\b`,
    "giu",
);
const DATED_FILE = /\.md$/u;
const REFERENCE = "2026-11-01";
const SAMPLES_FUTURE = [
    j("by **20", "27-01-31**: either"),
    j("klart 2 nov", "ember 2026"),
    j("due 3 March 20", "27"),
];
const SAMPLES_CURRENT = [
    "Measured 2026-10-31 against the production build",
    "Redogörelsen uppdaterades senast 31 oktober 2026.",
    'retrieved_at: "2026-10-30"',
    "released 2026-11-01",
    "SFS 2018:1937 and WCAG 2.2",
    'type = "Microsoft.App/containerApps@2024-03-01"',
    "version 2026-13-45 is not a date",
    "about 2 500 ms in 2026",
];
const AS_OF_BAD = [
    ["--as-of"],
    ["--as-of", ""],
    ["--as-of", "--self-test"],
    ["--as-of", "x"],
    ["--as-of", "2026-1-1"],
    ["--as-of", "2026-13-01"],
    ["--as-of", "2026-02-30"],
    ["--as-of", "2026-11-01 2026-11-02"],
];
const AS_OF_GOOD = [["--as-of", "2026-11-01"], []];

/** Valid calendar dates in `line`, as YYYY-MM-DD strings. */
function datesIn(line) {
    const out = [];
    const add = (y, m, d) => {
        const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const t = new Date(`${iso}T00:00:00Z`);
        if (!Number.isNaN(t.getTime()) && t.toISOString().startsWith(iso)) {
            out.push(iso);
        }
    };
    for (const m of line.matchAll(ISO_DATE)) {
        add(m[1], Number(m[2]), Number(m[3]));
    }
    for (const m of line.matchAll(NAMED_DATE)) {
        add(m[3], MONTH_OF.get(m[2].toLowerCase()), Number(m[1]));
    }
    return out;
}

/** 1-based line numbers in `text` that carry a date later than `asOf`. */
function laterDateLines(text, asOf) {
    const lines = [];
    for (const [i, line] of text.split("\n").entries()) {
        if (datesIn(line).some((d) => d > asOf)) {
            lines.push(i + 1);
        }
    }
    return lines;
}

const AS_OF_FORM = /^\d{4}-\d{2}-\d{2}$/u;

/** The --as-of value in `args`: `{ date }` when it is one valid
 * YYYY-MM-DD calendar date, `{ error }` naming why it is not, or `{}`
 * when the flag is absent. */
function parseAsOf(args) {
    const at = args.indexOf("--as-of");
    if (at === -1) {
        return {};
    }
    const value = args[at + 1];
    if (value === undefined || value.startsWith("--")) {
        return { error: "--as-of needs a YYYY-MM-DD date, got no value" };
    }
    if (value === "") {
        return { error: "--as-of needs a YYYY-MM-DD date, got an empty value" };
    }
    if (!AS_OF_FORM.test(value) || datesIn(value).join(",") !== value) {
        return { error: `--as-of needs a YYYY-MM-DD date, got "${value}"` };
    }
    return { date: value };
}

/** The reference date: --as-of, or else the HEAD commit's date. */
function referenceDate() {
    const { date, error } = parseAsOf(process.argv.slice(2));
    if (error) {
        throw new Error(error);
    }
    if (date) {
        return date;
    }
    return execFileSync("/usr/bin/git", ["log", "-1", "--format=%cs", "HEAD"], {
        encoding: "utf8",
    }).trim();
}

const INVISIBLE = /[\u{ad}\u{200b}-\u{200d}\u{2060}\u{feff}]/gu;
// A closing quote, `+`, and an opening quote of the same kind.
const CONCAT = /(["'`])\s*\+\s*\1/gu;

/** NFKC-folded text with zero-width and soft-hyphen characters removed. */
function normalise(text) {
    return text.normalize("NFKC").replaceAll(INVISIBLE, "");
}

const isAddress = (text) => ADDRESSES.some((p) => p.test(text));

/** 1-based line numbers of the address hits in `text` once adjacent
 * string literals are joined. */
function concatenatedAddressLines(text) {
    let joined = "";
    const origin = [];
    let from = 0;
    for (const m of text.matchAll(CONCAT)) {
        for (let k = from; k < m.index; k += 1) {
            joined += text[k];
            origin.push(k);
        }
        from = m.index + m[0].length;
    }
    if (from === 0) {
        return [];
    }
    for (let k = from; k < text.length; k += 1) {
        joined += text[k];
        origin.push(k);
    }
    const lines = [];
    for (const p of ADDRESSES) {
        const global = new RegExp(p.source, `${p.flags}g`);
        for (const m of joined.matchAll(global)) {
            lines.push(text.slice(0, origin[m.index]).split("\n").length);
        }
    }
    return lines;
}

/** 1-based line numbers in `text` that carry an address or a trace. */
function hitLines(raw, exempt) {
    const text = normalise(raw);
    const lines = text.split("\n");
    const hits = new Set(concatenatedAddressLines(text));
    for (const [i, line] of lines.entries()) {
        const next = i + 1 < lines.length ? `${line}\n${lines[i + 1]}` : "";
        if (
            isAddress(line) ||
            (!exempt && TRACES.some((p) => p.test(line))) ||
            isAddress(next)
        ) {
            hits.add(i + 1);
        }
    }
    return [...hits].toSorted((x, y) => x - y);
}

function selfTest() {
    const missed = SAMPLES_BAD.filter((s) => hitLines(s, false).length === 0);
    const flagged = SAMPLES_CLEAN.filter((s) => hitLines(s, false).length > 0);
    for (const s of missed) {
        console.error(`self-test: missed: ${s}`);
    }
    for (const s of flagged) {
        console.error(`self-test: false hit: ${s}`);
    }
    const missedDates = SAMPLES_FUTURE.filter(
        (s) => laterDateLines(s, REFERENCE).length === 0,
    );
    const flaggedDates = SAMPLES_CURRENT.filter(
        (s) => laterDateLines(s, REFERENCE).length > 0,
    );
    for (const s of missedDates) {
        console.error(`self-test: missed later date: ${s}`);
    }
    for (const s of flaggedDates) {
        console.error(`self-test: false later date: ${s}`);
    }
    const acceptedAsOf = AS_OF_BAD.filter((a) => !parseAsOf(a).error);
    const refusedAsOf = AS_OF_GOOD.filter((a) => parseAsOf(a).error);
    for (const a of acceptedAsOf) {
        console.error(`self-test: accepted --as-of: ${JSON.stringify(a)}`);
    }
    for (const a of refusedAsOf) {
        console.error(`self-test: refused --as-of: ${JSON.stringify(a)}`);
    }
    if (
        missed.length > 0 ||
        flagged.length > 0 ||
        missedDates.length > 0 ||
        flaggedDates.length > 0 ||
        acceptedAsOf.length > 0 ||
        refusedAsOf.length > 0
    ) {
        return 1;
    }
    console.log(
        `self-test: ${SAMPLES_BAD.length} traces caught, ${SAMPLES_CLEAN.length} clean samples pass`,
    );
    console.log(
        `self-test: ${SAMPLES_FUTURE.length} later dates caught, ${SAMPLES_CURRENT.length} current dates pass`,
    );
    console.log(
        `self-test: ${AS_OF_BAD.length} bad --as-of values refused, ${AS_OF_GOOD.length} good ones accepted`,
    );
    return 0;
}

function hitsIn(file, asOf) {
    let buf;
    try {
        buf = readFileSync(file);
    } catch {
        return [];
    }
    const exempt = buf.includes(0) || TRACE_EXEMPT.some((p) => p.test(file));
    const text = buf.toString("utf8");
    const lines = new Set(hitLines(text, exempt));
    if (DATED_FILE.test(file)) {
        const later = laterDateLines(normalise(text), asOf);
        for (const n of later) {
            lines.add(n);
        }
    }
    return [...lines].toSorted((x, y) => x - y).map((n) => `${file}:${n}`);
}

function scanTree() {
    let asOf;
    try {
        asOf = referenceDate();
    } catch (error) {
        console.error(`tree-hygiene: ${error.message}`);
        return 1;
    }
    // git by absolute path, so the guard never runs a PATH-substituted binary.
    const files = execFileSync(
        "/usr/bin/git",
        ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        { encoding: "utf8" },
    )
        .split("\0")
        .filter(Boolean);
    const hits = files.flatMap((file) => hitsIn(file, asOf));
    if (hits.length > 0) {
        console.error(
            `retired address, build trace or date later than ${asOf} in ${hits.length} place(s):`,
        );
        for (const hit of hits) {
            console.error(`  ${hit}`);
        }
        return 1;
    }
    console.log(
        `no retired address, build trace or date later than ${asOf} in ${files.length} files`,
    );
    return 0;
}

function patternForm(p) {
    return { source: p.source, flags: p.flags };
}

function printPatterns() {
    const form = patternForm;
    console.log(
        JSON.stringify({
            addresses: ADDRESSES.map(form),
            traces: TRACES.map(form),
            exempt: TRACE_EXEMPT.map(form),
        }),
    );
    return 0;
}

if (process.argv.includes("--self-test")) {
    process.exitCode = selfTest();
} else if (process.argv.includes("--print-patterns")) {
    process.exitCode = printPatterns();
} else {
    process.exitCode = scanTree();
}
