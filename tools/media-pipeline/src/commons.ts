import { allowedMediaLicences } from "@ludvigalden-demo/tecken-contracts";

/** Commons API client. Fails closed: any missing required field or any
 * licence outside the allowed set aborts the pipeline. */

export class PipelineError extends Error {}

export interface CommonsMetadata {
    title: string;
    url: string;
    sha1: string;
    mime: string;
    author: string;
    licence: string;
    licenceUrl: string;
    description: string;
}

interface CommonsImageInfo {
    url: string;
    sha1: string;
    mime: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
}

interface CommonsPage {
    title?: string;
    imageinfo?: CommonsImageInfo[];
}

const UA =
    "tecken-demo-media-pipeline/0.1 (https://github.com/ludvigalden/tecken-demo)";

/** Removes markup until none is left, then any stray angle bracket, so the
 * result never contains a tag. */
function stripHtml(value: string): string {
    let text = value;
    let previous: string;
    do {
        previous = text;
        text = text.replaceAll(/<[^<>]*>/g, "");
    } while (text !== previous);
    return text.replaceAll(/[<>]/g, "").trim();
}

function field(info: CommonsImageInfo, key: string): string {
    return stripHtml(info.extmetadata?.[key]?.value ?? "");
}

/** Validates one Commons page and returns its metadata, or throws. */
export function parseCommonsPage(page: CommonsPage): CommonsMetadata {
    const info = page.imageinfo?.[0];
    if (!page.title || !info) {
        throw new PipelineError(
            `no imageinfo for ${page.title ?? "(unknown title)"}`,
        );
    }
    const author = field(info, "Artist");
    const licence = field(info, "LicenseShortName");
    const licenceUrl = field(info, "LicenseUrl");
    const missing = Object.entries({
        author,
        licence,
        licenceUrl,
        url: info.url,
    })
        .filter(([, v]) => !v)
        .map(([k]) => k);
    if (missing.length > 0) {
        throw new PipelineError(
            `${page.title}: missing ${missing.join(", ")} — failing closed`,
        );
    }
    if (!(allowedMediaLicences as readonly string[]).includes(licence)) {
        throw new PipelineError(
            `${page.title}: licence "${licence}" is outside the allowed set — failing closed`,
        );
    }
    return {
        title: page.title,
        url: info.url.split("?")[0] ?? info.url,
        sha1: info.sha1,
        mime: info.mime,
        author,
        licence,
        licenceUrl,
        description: field(info, "ImageDescription"),
    };
}

async function fetchBatch(
    batch: string[],
    fetchImpl: typeof fetch,
): Promise<CommonsPage[]> {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|sha1|size|mime|extmetadata");
    url.searchParams.set("titles", batch.join("|"));
    const res = await fetchImpl(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
        throw new PipelineError(`Commons API HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
        query?: { pages?: Record<string, CommonsPage> };
    };
    return Object.values(body.query?.pages ?? {});
}

export async function fetchCommonsMetadata(
    titles: string[],
    fetchImpl: typeof fetch = fetch,
): Promise<Map<string, CommonsMetadata>> {
    const byTitle = new Map<string, CommonsMetadata>();
    for (let i = 0; i < titles.length; i += 40) {
        for (const page of await fetchBatch(
            titles.slice(i, i + 40),
            fetchImpl,
        )) {
            const meta = parseCommonsPage(page);
            byTitle.set(meta.title, meta);
        }
    }
    const absent = titles.filter((t) => !byTitle.has(t));
    if (absent.length > 0) {
        throw new PipelineError(
            `${absent.join(", ")}: no metadata returned — failing closed`,
        );
    }
    return byTitle;
}
