# Tecken – Swedish Sign Language

Tecken plays recorded Swedish Sign Language for everyday phrases. You type
a phrase in Swedish. If it is one of the supported utterances, a recording
of a person signing it plays with Swedish captions, and the source and
licence are shown before the clip plays.

**Status:** first draft, 2026-11. Not in production.

[Svensk version](README.md)

## What Tecken is and is not

Tecken translates nothing and generates nothing. It only plays existing
recordings of people signing, and it replaces no sign language
interpreter. Tecken follows the position of the World Federation of the
Deaf (WFD) and WASLI that machine translation and avatars cannot replace
deaf signers or interpreters.

The content is everyday. There are no phrases about health, emergencies,
consent or law.

- **Exact match:** the phrase plays, with source, author and licence shown
  before playback.
- **Near match:** a supported utterance is offered in a dialog and plays
  only if you confirm. Tecken never suggests anything when the
  phrase contains a negation ("inte", "ej", "aldrig").
- **No match:** the service says plainly that the phrase is not
  supported, shows what is, and links to the Swedish Sign Language
  Dictionary.
- **Fingerspelling:** a word is spelled letter by letter with the Swedish
  manual alphabet. That is not a sign for the word.

## Content

<!-- coverage-stamp:start -->

3 recorded utterances, 7 single signs and the Swedish manual alphabet A–Ö (29 letters) from Wikimedia Commons; example sentences from the Swedish Sign Language Dictionary are linked (6 words), not shown here.
<!-- coverage-stamp:end -->

The line above is computed from `content/` and checked in CI
(`node tools/ci/check-coverage-stamp.mjs`).

## Technology

| Part              | Technology                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Web app           | Vue 3, TypeScript, Pinia, vue-router, vue-i18n (precompiled)        |
| Components        | FKUI, the open-source design system from Försäkringskassan          |
| Own design system | `@ludvigalden-demo/tecken-design-system`: tokens, domain components |
| Server and API    | Node.js, Hono, zod, OpenAPI                                         |
| Contracts         | `@ludvigalden-demo/tecken-contracts`: zod schemas and JSON Schema   |
| Monorepo          | npm workspaces and Lerna                                            |
| Tests             | Vitest, Playwright, axe-core, Lighthouse CI, size-limit             |
| Hosting           | Azure Container Apps (scales to zero), image on GHCR                |

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
| `tests/`     | browser tests for the app and the design system                   |

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

The service scales to zero, so the first visit after idle can take a few
seconds.

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
