import { readFileSync } from "node:fs";
import { createServer as createHttpsServer } from "node:https";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";

/** The parts of the environment that choose the transport. */
export interface TransportEnv {
    TLS_CERT_FILE?: string | undefined;
    TLS_KEY_FILE?: string | undefined;
    PORT?: string | undefined;
    HOST?: string | undefined;
}

export interface Listening {
    server: ServerType;
    tls: boolean;
}

/**
 * Starts the Node server. Plain http on PORT (default 8080) in production,
 * where the Container Apps ingress terminates TLS. When TLS_CERT_FILE and
 * TLS_KEY_FILE are both set (local and CI test runs) it serves https on PORT
 * (default 8443) instead. Both modes hand the same `fetch` to the server, so
 * the transport is the only difference: every header is byte-identical.
 */
export function listen(
    fetch: (request: Request) => Response | Promise<Response>,
    env: TransportEnv,
    onListening: (info: { port: number; tls: boolean }) => void,
): Listening {
    const cert = env.TLS_CERT_FILE;
    const key = env.TLS_KEY_FILE;
    const hostname = env.HOST ?? "0.0.0.0";
    if (cert && key) {
        const port = Number(env.PORT ?? 8443);
        const server = serve(
            {
                fetch,
                port,
                hostname,
                createServer: createHttpsServer,
                serverOptions: {
                    cert: readFileSync(cert),
                    key: readFileSync(key),
                },
            },
            (info) => {
                onListening({ port: info.port, tls: true });
            },
        );
        return { server, tls: true };
    }
    const port = Number(env.PORT ?? 8080);
    const server = serve({ fetch, port, hostname }, (info) => {
        onListening({ port: info.port, tls: false });
    });
    return { server, tls: false };
}
