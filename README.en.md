# Tecken – Swedish Sign Language

Tecken is a demonstration of web-platform engineering: accessibility,
testing, architecture and open-source practice. It plays recorded Swedish
Sign Language for a handful of everyday phrases, with Swedish captions and
the source and licence of every clip.

Tecken does not compete with any service. The
real and far more complete resource is the
[Swedish Sign Language Dictionary](https://teckensprakslexikon.su.se/)
(Svenskt teckenspråkslexikon).

**Status:** first draft, 2026-11. Live at
<https://tecken.demo.ludvigalden.com>.

[Svensk version](README.md)

## What Tecken is and is not

Tecken translates nothing and generates nothing. It only plays existing
recordings of people signing, and it replaces no sign language
interpreter. Tecken follows the position of the World Federation of the
Deaf (WFD) and WASLI that machine translation and avatars cannot replace
deaf signers or interpreters.

The content is everyday. There are no phrases about health, emergencies,
consent or law.

- **Exact match:** the clip plays at once (muted, and not at all if you
  prefer reduced motion), with source, author and licence beside it.
- **Near match:** a supported utterance is offered in a dialog and plays
  only if you confirm. Tecken never suggests anything when the
  phrase contains a negation ("inte", "ej", "aldrig").
- **No match:** the service says plainly that the phrase is not
  supported, shows what is, and links to the Swedish Sign Language
  Dictionary.
- **Fingerspelling:** a word is spelled letter by letter with the Swedish
  manual alphabet, right after the search. That is not a sign for the word.

## Content

<!-- coverage-stamp:start -->

3 recorded utterances, 7 single signs and the Swedish manual alphabet A–Ö (29 letters) from Wikimedia Commons; example sentences from the Swedish Sign Language Dictionary are linked (6 words), not shown here.
<!-- coverage-stamp:end -->

The line above is computed from `content/` and checked in CI
(`node tools/ci/check-coverage-stamp.mjs`).

## Technology

| Part              | Technology                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- |
| Web app           | Vue 3, TypeScript, Pinia, vue-router, vue-i18n (precompiled)                       |
| Components        | FKUI, the open-source design system from Försäkringskassan                         |
| Own design system | `@ludvigalden-demo/tecken-design-system`: tokens, domain components                |
| Server and API    | Node.js, Hono, zod, OpenAPI                                                        |
| Contracts         | `@ludvigalden-demo/tecken-contracts`: zod schemas and JSON Schema                  |
| Monorepo          | npm workspaces and Lerna                                                           |
| Tests             | Vitest, Playwright, axe-core, Lighthouse CI, size-limit                            |
| Hosting           | Azure Container Apps (scales to zero), image in a private Azure Container Registry |

## Layout

| Directory    | Contents                                                          |
| ------------ | ----------------------------------------------------------------- |
| `apps/`      | the web app and Storybook                                         |
| `services/`  | the Node server: API, static files and media                      |
| `packages/`  | published packages: contracts and design system                   |
| `tools/`     | media pipeline, icon sanitizer and CI scripts                     |
| `content/`   | licensed clips and utterance records                              |
| `contracts/` | the generated OpenAPI document                                    |
| `docs/`      | design, accessibility, security, performance, CI, content sources |
| `infra/`     | Terraform for the Azure hosting                                   |
| `tests/`     | browser tests for the app and the design system                   |

## Structure and placement

Every file has a place under the rules below. A file that no rule
covers does not belong in the repository.

### The root

- The root holds only what concerns the whole repository: the READMEs,
  licences, policy files (`CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, `CODEOWNERS`), `publiccode.yml`, the workspaces'
  `package.json` and lockfile, the `Dockerfile` with `.dockerignore` for
  the image, and the configuration described next.
- Configuration sits with what it configures. Configuration for one
  workspace lives in that workspace (its `tsconfig`, Vite and Vitest
  files, Storybook's `.storybook/`), Spectral's `.spectral.yaml` sits
  beside the OpenAPI document it lints, and the Playwright configuration
  sits in `tests/` with the suites. The root holds configuration that
  applies across workspaces (TypeScript, ESLint, Stylelint, Prettier,
  html-validate, markdownlint, commitlint, EditorConfig, npm, Node, Lerna,
  Nx, Renovate, REUSE), configuration for a root file (`.hadolint.yaml`
  for the `Dockerfile`), and configuration for a check that spans
  workspaces: `.size-limit.json` budgets bundles of both the app and the
  design system, and the `lighthouserc*.json` files audit the pages the
  server serves.
- `.gitignore` is an allowlist: a new top-level file is ignored until it
  is added on purpose.
- `LICENSES/` holds the licence texts the REUSE annotations point to.
- `.github/` holds the CI workflows and the issue and pull request
  templates.

### Content and documentation

- `content/` holds the licensed corpus and nothing else: clips,
  utterance records and per-file licence annotations.
- `contracts/` holds the published API contract: the OpenAPI document,
  generated from the API's routes, and its lint rules.
- `docs/` holds prose for people only, with the images the prose shows
  and their licence annotations. No code, no configuration and nothing
  that is served. Prose a route shows (the accessibility statement)
  lives only in `docs/`, and the app's generator writes it into a view
  component.
- `infra/` holds the Terraform for the hosting and its README.

### Workspaces

- `apps/` holds what builds into a website: `apps/web`, the app, and
  `apps/storybook`, the design system's Storybook.
- `services/api` holds the Node server: the API, and the serving of the
  app, Storybook, media and the design-system examples.
- `packages/` holds the published packages: `contracts` (schemas and
  types for the utterance record) and `design-system` (tokens and domain
  components).
- `tools/` holds tools that run at build time or in CI and never ship:
  `media-pipeline`, `icons` and the scripts in `tools/ci`.
- `tests/` holds the browser suites that span workspaces, their
  Playwright configuration and the script that makes the local TLS test
  certificate.

A workspace holds:

- `package.json`, its `tsconfig`, Vite and Vitest configuration and, for
  the published packages, a `README.md`;
- `src/` for source code (in Storybook, `.storybook/` for the
  configuration and `stories/`, the shape Storybook reads);
- `scripts/` for build and generation scripts, where `generate.mjs`
  writes the workspace's generated files;
- inputs the workspace's own tool reads, such as the media pipeline's
  `manifest.json` and `link-outs.json`.

`apps/web/index.html` is the app's HTML entry.

### Machine-written files

Every committed file a program writes belongs to one of the classes
below, each with its writer and the check that keeps it honest.

- **Generated sources:** `scripts/generate.mjs` in the workspace that
  owns the source writes them into a `generated/` directory in the
  workspace that uses them. The one exception is the OpenAPI document,
  written by `services/api/scripts/generate.mjs` into `contracts/openapi/`
  as the published contract. They are never edited by hand.
  `npx lerna run generate` rewrites all of them, and the CI `drift` job
  fails if anything then differs from what is committed.
- **The corpus:** everything in `content/` (clips, posters, captions,
  utterance records and their REUSE annotations) is written by the media
  pipeline in `tools/media-pipeline`. CI does not download it again; the
  pipeline's tests check the hash of every committed clip and poster,
  every recorded duration against its clip and every link-out against the
  verified page titles in `link-outs.json`, and
  `tools/ci/check-media-count.mjs` checks the file counts against the
  manifest.
- **State screenshots:** the browser suite (`tests/app/journeys.mjs`)
  writes `docs/design/states/*.png` when it runs with
  `TECKEN_WRITE_STATES=1`. CI does not compare the images; it runs the
  same journeys in every engine and asserts each state the images show.
- **The README coverage line** between the `coverage-stamp` markers:
  `node tools/ci/check-coverage-stamp.mjs --write` writes it, and CI runs
  the script without `--write` and fails if the line differs from
  `content/`.
- **Lockfiles:** npm writes `package-lock.json` and Terraform writes the
  `.terraform.lock.hcl` files. CI installs with `npm ci` and initialises
  Terraform with `-lockfile=readonly`, and both fail on a lockfile that
  disagrees with its manifests.

`content/` is the only source of corpus data. Code, tests and stories
that use a record's values read them from `content/`, directly or
through a generated file; they name records by id and never copy their
fields. The media pipeline's inputs (`manifest.json` and
`link-outs.json`) are what `content/` is built from, and the credits in
the READMEs, the `REUSE.toml` files and `docs/content/link-outs.md` name
the sources as their licences require.

### Code in the app and the design system

- `packages/design-system/src/components` holds domain components
  (T prefix) that render sign-language concepts without the app's
  routing, store, API types or locale keys. Everything reused outside
  the app belongs here.
- `packages/design-system/src/tokens` holds the token definitions and
  their checks.
- `packages/design-system/examples` holds static pages that show the
  design system without Vue, served by the server under `/examples/`.
- `apps/storybook` holds the Storybook configuration (`.storybook/`),
  the stories (`stories/`) and the generated records they show.
- `apps/web/src` holds the app's entry files (`main.ts`, `App.vue`,
  `router.ts`, `route-query.ts` and type declarations) and one directory
  per kind, as in the table below.

| Directory                 | Contents                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/views`      | one component per route, and helpers only the views use; a view owns URL and query handling, data loading and focus, and stays thin |
| `apps/web/src/components` | every other component, dialogs included                                                                                             |
| `apps/web/src/api`        | the typed API client                                                                                                                |
| `apps/web/src/stores`     | Pinia stores                                                                                                                        |
| `apps/web/src/icons`      | the icon sprite injection                                                                                                           |
| `apps/web/src/locales`    | translations, one file per language                                                                                                 |
| `apps/web/src/styles`     | global stylesheets: the app shell and subsets of third-party libraries; component styles live scoped in their SFCs                  |
| `apps/web/src/generated`  | generated files                                                                                                                     |

### Tests

- A unit test sits next to the file it tests, and test data sits in
  `fixtures/` next to the tests that use it.
- A test whose subject is not a source file sits in the workspace that
  guards that subject: the checks of `content/` (`integrity.test.ts`,
  `link-outs.test.ts`) in the media pipeline, which writes it, and the
  negative controls for the import bans in `eslint.config.mjs`
  (`banned-imports.test.ts`) beside the design-system components the
  bans protect.
- Browser suites that span workspaces live in `tests/`.

## Running locally

You need Node.js 24.

```sh
npm ci
npx lerna run build
npm run bundle --workspace services/api
TLSDIR="$(tests/tls/make-cert.sh)"
TECKEN_ROOT=. TLS_CERT_FILE="$TLSDIR/cert.pem" TLS_KEY_FILE="$TLSDIR/key.pem" \
    node services/api/dist/server.mjs
```

Open `https://localhost:8443/` and accept the throwaway certificate. Do
not use `http://` locally: the security policy upgrades every request to
https, and Safari then shows a blank page.

## Tests and checks

Every change runs through CI:

- **static:** type checks, ESLint, Prettier, Stylelint, html-validate,
  markdownlint, commitlint, REUSE and the content line above
- **unit:** unit tests in every workspace
- **drift:** every generated file is regenerated and must not differ
- **release-dry-run:** version bump and package contents, no publishing
- **browser:** every page and state in Chromium, Firefox and WebKit, with
  axe, CSP checks, keyboard, reflow, reduced motion and captions
- **perf:** size budgets and Lighthouse CI for desktop and mobile
- **Security:** `npm audit`, and review of new dependencies in pull
  requests
- **CodeQL:** code analysis

**Declared elisions:** on mobile, Lighthouse's LCP target and the
performance score of the Sources page only warn, with error-level
ceilings (LCP above 3.5 s or a score below 0.85 fails the build). The
details are in [docs/performance/README.md](docs/performance/README.md).

## Accessibility and security

- [Accessibility statement](docs/accessibility/tillganglighetsredogorelse.md) (Swedish)
- [Coverage per WCAG criterion](docs/accessibility/COVERAGE.md)
- [Manual test checklist](docs/accessibility/manual-test-checklist.md)
- [Threat model](docs/security/threat-model.md) and [security policy](SECURITY.md)

The service scales to zero, so the first visit after idle can take a
couple of seconds.

## Licences

- **Code:** MIT, © 2026 Ludvig Aldén. See [LICENSE](LICENSE).
- **Clips and poster frames:** each file keeps its source licence,
  CC BY-SA 3.0 or CC BY 3.0. Transcoding a clip does not make it a new
  work, so the licence and attribution travel with every copy.
- **Captions and utterance records:** CC BY 4.0, © 2026 Ludvig Aldén.

Every file has its licence declared per [REUSE](https://reuse.software/);
see [REUSE.toml](REUSE.toml) and `content/media/REUSE.toml`.

## Credits

- **Spread the Sign**, for most of the recorded phrases and signs.
- **MSLink**, for the sign "hej".
- **LittleGun**, for the Swedish manual alphabet.
- **Wikimedia Commons**, where every clip is published under an open
  licence, and Wikimedia Sverige, which works for free knowledge in
  Swedish.
- **The Swedish Sign Language Dictionary** (Stockholm University), which
  Tecken links to.
- Built on **FKUI**, the open-source design system from
  Försäkringskassan. The project has no affiliation with Försäkringskassan.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).
