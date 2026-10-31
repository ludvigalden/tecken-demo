/**
 * The single source of the response header policy.
 * Used by the API server and by the test harness, so tests
 * exercise the exact production policy.
 */

export const BASE_CSP_DIRECTIVES: ReadonlyArray<readonly [string, string]> = [
    ["default-src", "'self'"],
    ["script-src", "'self'"],
    ["style-src", "'self'"],
    ["img-src", "'self' data:"],
    ["media-src", "'self'"],
    ["font-src", "'self'"],
    ["connect-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'none'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["upgrade-insecure-requests", ""],
];

function serialize(
    directives: ReadonlyArray<readonly [string, string]>,
): string {
    return directives
        .map(([name, value]) => (value === "" ? name : `${name} ${value}`))
        .join("; ");
}

/** The production CSP, byte-identical in http and https modes. */
export const CONTENT_SECURITY_POLICY = serialize(BASE_CSP_DIRECTIVES);

export const STATIC_SECURITY_HEADERS: Readonly<Record<string, string>> = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy":
        "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
};

function quoteHash(h: string): string {
    return `'sha256-${h}'`;
}

/**
 * The path-scoped CSP for the Storybook build under /designsystem/.
 * Storybook's HTML carries a fixed set of inline <script> and <style>
 * blocks; rather than `unsafe-inline`, each exact block is allowed by its
 * sha256 hash, computed from the build output (see
 * apps/storybook/scripts/csp-hashes.mjs). Everything else stays as strict
 * as the base policy. The threat model documents this scope.
 */
export function designSystemCsp(hashes: {
    scripts: readonly string[];
    styles: readonly string[];
}): string {
    const directives = BASE_CSP_DIRECTIVES.map(([name, value]) => {
        if (name === "script-src") {
            return [
                name,
                [value, ...hashes.scripts.map(quoteHash)].join(" "),
            ] as const;
        }
        if (name === "style-src") {
            return [
                name,
                [value, ...hashes.styles.map(quoteHash)].join(" "),
            ] as const;
        }
        if (name === "frame-ancestors") {
            // The Storybook manager frames its own preview iframe.
            return [name, "'self'"] as const;
        }
        return [name, value] as const;
    });
    return serialize(directives);
}
