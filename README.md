# Tecken – svenskt teckenspråk

Tecken spelar upp inspelat svenskt teckenspråk för vardagliga fraser.
Du skriver en fras på svenska. Finns den bland de stödda yttrandena
spelas en inspelning av en människa som tecknar, med svensk textning, och
källan och licensen visas innan klippet spelas.

**Status:** första utkast, 2026-11. Inte i produktion.

[English version](README.en.md)

## Vad Tecken är och inte är

Tecken översätter ingenting och genererar ingenting. Den spelar bara upp
inspelningar som redan finns, gjorda av människor, och ersätter ingen
teckenspråkstolk. Tecken följer Dövas världsförbunds (WFD) och WASLI:s
hållning att maskinöversättning och avatarer inte kan ersätta döva
tecknare eller tolkar.

Innehållet är vardagligt. Det finns inga fraser om hälsa, nödsituationer,
samtycke eller juridik.

- **Exakt träff:** frasen spelas upp, med källa, upphov och licens före
  uppspelningen.
- **Nära träff:** ett stött yttrande föreslås i en dialog och spelas bara
  om du bekräftar. Tecken föreslår aldrig något när frasen innehåller
  en negation (”inte”, ”ej”, ”aldrig”).
- **Ingen träff:** tjänsten säger tydligt att frasen inte stöds, visar
  vad som stöds och länkar till Svenskt teckenspråkslexikon.
- **Fingerstavning:** ett ord stavas bokstav för bokstav med det svenska
  handalfabetet. Det är inte ett tecken för ordet.

## Innehåll

<!-- coverage-stamp:start -->

3 inspelade yttranden, 7 enskilda tecken och handalfabetet A–Ö (29 bokstäver) från Wikimedia Commons; exempelmeningar ur Svenskt teckenspråkslexikon länkas (6 ord), de visas inte här.
<!-- coverage-stamp:end -->

Raden ovan räknas fram ur `content/` och kontrolleras i CI
(`node tools/ci/check-coverage-stamp.mjs`).

## Teknik

| Del               | Teknik                                                                |
| ----------------- | --------------------------------------------------------------------- |
| Webbapp           | Vue 3, TypeScript, Pinia, vue-router, vue-i18n (förkompilerad)        |
| Komponenter       | FKUI, Försäkringskassans designsystem med öppen källkod               |
| Eget designsystem | `@ludvigalden-demo/tecken-design-system`: tokens och domänkomponenter |
| Server och API    | Node.js, Hono, zod, OpenAPI                                           |
| Kontrakt          | `@ludvigalden-demo/tecken-contracts`: zod-scheman och JSON Schema     |
| Monorepo          | npm workspaces och Lerna                                              |
| Tester            | Vitest, Playwright, axe-core, Lighthouse CI, size-limit               |
| Driftmiljö        | Azure Container Apps (skalar till noll), avbild på GHCR               |

## Katalogstruktur

| Katalog      | Innehåll                                                            |
| ------------ | ------------------------------------------------------------------- |
| `apps/`      | webbappen och Storybook                                             |
| `services/`  | Node-servern: API, statiska filer och media                         |
| `packages/`  | publicerade paket: kontrakt och designsystem                        |
| `tools/`     | mediepipeline, ikonsanering och CI-skript                           |
| `content/`   | licensierade klipp och yttrandeposter                               |
| `contracts/` | det genererade OpenAPI-dokumentet                                   |
| `docs/`      | design, tillgänglighet, säkerhet, prestanda, CI och innehållskällor |
| `infra/`     | Terraform för driftmiljön i Azure                                   |
| `tests/`     | webbläsartester för appen och designsystemet                        |

## Köra lokalt

Du behöver Node.js 24.

```sh
npm ci
npx lerna run build
npm run bundle --workspace services/api
TLSDIR="$(tests/tls/make-cert.sh)"
TECKEN_ROOT=. TLS_CERT_FILE="$TLSDIR/cert.pem" TLS_KEY_FILE="$TLSDIR/key.pem" \
    node services/api/dist/server.mjs
```

Öppna `https://localhost:8443/` och godkänn det tillfälliga certifikatet.
Använd inte `http://` lokalt: säkerhetspolicyn uppgraderar alla
förfrågningar till https, och Safari visar då en tom sida.

## Tester och kontroller

Varje ändring körs genom CI:

- **static:** typkontroll, ESLint, Prettier, Stylelint, html-validate,
  markdownlint, commitlint, REUSE och täckningsraden ovan
- **unit:** enhetstester i alla arbetsytor
- **drift:** alla genererade filer återskapas och får inte skilja sig
- **release-dry-run:** versionshöjning och paketinnehåll utan publicering
- **browser:** alla sidor och lägen i Chromium, Firefox och WebKit, med
  axe, CSP-kontroll, tangentbord, ombrytning, minskad rörelse och textning
- **perf:** storleksbudgetar och Lighthouse CI för dator och mobil
- **Security:** `npm audit`, och granskning av nya beroenden i pull
  requests
- **CodeQL:** kodanalys

**Deklarerade undantag:** på mobil ger Lighthouses LCP-gräns och
prestandapoängen för sidan Källor bara varningar, men med felgränser
(LCP över 3,5 sekunder och poäng under 0,85 fäller bygget). Detaljerna
står i [docs/performance/README.md](docs/performance/README.md).

## Tillgänglighet och säkerhet

- [Tillgänglighetsredogörelse](docs/accessibility/tillganglighetsredogorelse.md)
- [Täckning per WCAG-kriterium](docs/accessibility/COVERAGE.md)
- [Checklista för manuell testning](docs/accessibility/manual-test-checklist.md)
- [Hotmodell](docs/security/threat-model.md) och [säkerhetspolicy](SECURITY.md)

Tjänsten skalar till noll. Det första besöket efter en paus kan därför
ta några sekunder.

## Licenser

- **Kod:** MIT, © 2026 Ludvig Aldén. Se [LICENSE](LICENSE).
- **Klipp och stillbilder:** varje fil behåller sin källicens, CC BY-SA
  3.0 eller CC BY 3.0. Att koda om ett klipp gör det inte till ett nytt
  verk, så licensen och upphovet följer med varje kopia.
- **Textning och yttrandeposter:** CC BY 4.0, © 2026 Ludvig Aldén.

Varje fil har sin licens angiven enligt [REUSE](https://reuse.software/),
se [REUSE.toml](REUSE.toml) och `content/media/REUSE.toml`.

## Tack

- **Spread the Sign** för de flesta inspelade fraserna och tecknen.
- **MSLink** för tecknet ”hej”.
- **LittleGun** för det svenska handalfabetet.
- **Wikimedia Commons**, där alla klipp finns med öppna licenser, och
  Wikimedia Sverige, som arbetar för fri kunskap på svenska.
- **Svenskt teckenspråkslexikon** (Stockholms universitet), som Tecken
  länkar till.
- Byggt på **FKUI**, Försäkringskassans designsystem med öppen källkod.
  Projektet har ingen koppling till Försäkringskassan.

## Bidra

Se [CONTRIBUTING.md](CONTRIBUTING.md) och [uppförandekoden](CODE_OF_CONDUCT.md).
