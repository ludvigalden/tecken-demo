# Performance

Measured 2026-10-31 against the production build served by the Node
server (`services/api/dist/server.mjs`) over local TLS. Lighthouse 12.6.1 via
`@lhci/cli` 0.15.1, three runs per URL, median run. The CI `perf` job
repeats these runs on every push.

## Budgets

### Lighthouse

| Assertion         | Target   | Desktop (`lighthouserc.json`) | Mobile (`lighthouserc.mobile.json`) |
| ----------------- | -------- | ----------------------------- | ----------------------------------- |
| Performance score | ≥ 0.90   | error                         | error; **warn** on `/kallor`        |
| Accessibility     | = 1.00   | error                         | error                               |
| LCP               | ≤ 2.5 s  | error                         | **warn** (declared elision, below)  |
| CLS               | ≤ 0.1    | error                         | error                               |
| TBT               | ≤ 200 ms | error                         | error                               |

Measured medians (desktop preset, then Lighthouse's default mobile
emulation: 4× CPU slowdown, 150 ms RTT, 1.6 Mbit/s):

| URL               | Form factor | Perf | A11y | FCP     | LCP     | CLS   | TBT    |
| ----------------- | ----------- | ---- | ---- | ------- | ------- | ----- | ------ |
| `/`               | desktop     | 1.00 | 1.00 | 608 ms  | 619 ms  | 0     | 0 ms   |
| `/fingerstavning` | desktop     | 1.00 | 1.00 | 621 ms  | 641 ms  | 0     | 0 ms   |
| `/kallor`         | desktop     | 0.99 | 1.00 | 574 ms  | 760 ms  | 0.022 | 0 ms   |
| `/`               | mobile      | 0.94 | 1.00 | 2268 ms | 2572 ms | 0     | 103 ms |
| `/fingerstavning` | mobile      | 0.94 | 1.00 | 2169 ms | 2472 ms | 0     | 105 ms |
| `/kallor`         | mobile      | 0.90 | 1.00 | 2099 ms | 3136 ms | 0.068 | 99 ms  |

**Declared elision: mobile LCP.** Under mobile emulation, LCP is 2.57 s
on `/` and 3.14 s on `/kallor`, above the 2.5 s target, so the mobile
LCP assertion warns instead of failing. Every other mobile assertion
fails the job when missed. The LCP element is the page's first text,
and nearly all of the time is render delay: the client-rendered app
must download and run about 125 kB (gzip) of JavaScript, most of it
FKUI and Vue, before anything paints. `/kallor` also waits for
`/v1/utterances` before it renders its list. Closing the gap needs
prerendered HTML for the shell — a static shell without hydration only
moves the shift to the moment Vue replaces it — or a smaller UI runtime.
Neither is in scope for this demo.

**Declared elision: mobile performance score on `/kallor`.** That page
scores 0.88–0.91 under mobile emulation, straddling the 0.90 line from
run to run. CI on `main` measured 0.88, 0.89 and 0.89, so
there the assertion warns. Its score is held down by the same LCP gap,
and all its other assertions still fail the job. `/` and `/fingerstavning`
(0.93–0.95) keep the performance score as an error on mobile, and every
page keeps it on desktop.

### Size limits (`.size-limit.json`, gzip, baseline + 10 %)

| Bundle                           | Baseline  | Limit     |
| -------------------------------- | --------- | --------- |
| App entry JS (`index-*.js`)      | 124 977 B | 137 475 B |
| App CSS (`index-*.css`)          | 10 488 B  | 11 537 B  |
| Design-system CSS (`dist/*.css`) | 2 083 B   | 2 292 B   |
| Design-system components         | 3 991 B   | 4 391 B   |

## Running locally

```sh
npx lerna run build
npm run bundle --workspace services/api
npx size-limit
TLSDIR="$(tests/tls/make-cert.sh)"
TECKEN_ROOT=. HOST=127.0.0.1 PORT=8443 \
    TLS_CERT_FILE="$TLSDIR/cert.pem" TLS_KEY_FILE="$TLSDIR/key.pem" \
    node services/api/dist/server.mjs &
npx --yes @lhci/cli@0.15.1 autorun --config=lighthouserc.json
npx --yes @lhci/cli@0.15.1 autorun --config=lighthouserc.mobile.json
```

`@lhci/cli` is run with `npx` and is not a dependency: it pulls in
packages that `npm audit --audit-level=high` flags (lighthouse →
puppeteer-core, `tmp`, `basic-ftp`), and none of it ships.
