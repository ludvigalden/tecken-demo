# Tecken – svenskt teckenspråk

Tecken är en demonstration av webbutveckling: tillgänglighet, testning,
arkitektur och arbete med öppen källkod. Den spelar upp inspelat svenskt
teckenspråk för ett fåtal vardagliga fraser, med svensk textning och med
källa och licens för varje klipp.

Tecken konkurrerar inte med någon tjänst.
Den verkliga och långt mer fullständiga resursen är
[Svenskt teckenspråkslexikon](https://teckensprakslexikon.su.se/).

**Status:** första utkast, 2026-11. Live på
<https://tecken.demo.ludvigalden.com>.

[English version](README.en.md)

## Vad Tecken är och inte är

Tecken översätter ingenting och genererar ingenting. Den spelar bara upp
inspelningar som redan finns, gjorda av människor, och ersätter ingen
teckenspråkstolk. Tecken följer Dövas världsförbunds (WFD) och WASLI:s
hållning att maskinöversättning och avatarer inte kan ersätta döva
tecknare eller tolkar.

Innehållet är vardagligt. Det finns inga fraser om hälsa, nödsituationer,
samtycke eller juridik.

- **Exakt träff:** klippet spelas upp direkt (ljudlöst, och inte alls
  om du har valt minskad rörelse), med källa, upphov och licens bredvid.
- **Nära träff:** ett stött yttrande föreslås i en dialog och spelas bara
  om du bekräftar. Tecken föreslår aldrig något när frasen innehåller
  en negation (”inte”, ”ej”, ”aldrig”).
- **Ingen träff:** tjänsten säger tydligt att frasen inte stöds, visar
  vad som stöds och länkar till Svenskt teckenspråkslexikon.
- **Fingerstavning:** ett ord stavas bokstav för bokstav med det svenska
  handalfabetet, direkt efter sökningen. Det är inte ett tecken för ordet.

## Innehåll

<!-- coverage-stamp:start -->

3 inspelade yttranden, 7 enskilda tecken och handalfabetet A–Ö (29 bokstäver) från Wikimedia Commons; exempelmeningar ur Svenskt teckenspråkslexikon länkas (6 ord), de visas inte här.
<!-- coverage-stamp:end -->

Raden ovan räknas fram ur `content/` och kontrolleras i CI
(`node tools/ci/check-coverage-stamp.mjs`).

## Teknik

| Del               | Teknik                                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| Webbapp           | Vue 3, TypeScript, Pinia, vue-router, vue-i18n (förkompilerad)                    |
| Komponenter       | FKUI, Försäkringskassans designsystem med öppen källkod                           |
| Eget designsystem | `@ludvigalden-demo/tecken-design-system`: tokens och domänkomponenter             |
| Server och API    | Node.js, Hono, zod, OpenAPI                                                       |
| Kontrakt          | `@ludvigalden-demo/tecken-contracts`: zod-scheman och JSON Schema                 |
| Monorepo          | npm workspaces och Lerna                                                          |
| Tester            | Vitest, Playwright, axe-core, Lighthouse CI, size-limit                           |
| Driftmiljö        | Azure Container Apps (skalar till noll), avbild i privat Azure Container Registry |

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

## Struktur och placering

Varje fil har en plats enligt reglerna nedan. En fil som ingen regel
täcker hör inte hemma i förrådet.

### Roten

- Roten innehåller bara det som gäller hela förrådet: README-filer,
  licenser, policyfiler (`CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, `CODEOWNERS`), `publiccode.yml`, arbetsytornas
  `package.json` och låsfil, `Dockerfile` med `.dockerignore` för
  avbilden och den konfiguration som beskrivs härnäst.
- Konfiguration ligger hos det den konfigurerar. Konfiguration för en
  arbetsyta ligger i arbetsytan (dess `tsconfig`-, Vite- och
  Vitest-filer, Storybooks `.storybook/`), Spectrals `.spectral.yaml`
  ligger bredvid OpenAPI-dokumentet den lintar, och
  Playwright-konfigurationen ligger i `tests/` med sviterna. Roten
  innehåller konfiguration som gäller över arbetsytorna (TypeScript,
  ESLint, Stylelint, Prettier, html-validate, markdownlint, commitlint,
  EditorConfig, npm, Node, Lerna, Nx, Renovate, REUSE), konfiguration för
  en fil i roten (`.hadolint.yaml` för `Dockerfile`) och konfiguration för
  en kontroll som spänner över arbetsytor: `.size-limit.json` sätter
  budgetar för paket från både appen och designsystemet, och
  `lighthouserc*.json` granskar sidorna som servern delar ut.
- `.gitignore` är en tillåtelselista: en ny fil på toppnivån ignoreras
  tills den läggs till med vilje.
- `LICENSES/` innehåller licenstexterna som REUSE-annoteringarna pekar på.
- `.github/` innehåller CI-arbetsflöden och mallar för ärenden och
  pull requests.

### Innehåll och dokumentation

- `content/` innehåller den licensierade korpusen och inget annat:
  klipp, yttrandeposter och per-fil licensannoteringar.
- `contracts/` innehåller det publicerade API-kontraktet: OpenAPI-
  dokumentet, genererat från API:ets rutter, och dess lintregler.
- `docs/` innehåller bara prosa för människor, med de bilder prosan
  visar och deras licensannoteringar. Ingen kod, ingen konfiguration
  och inget som serveras. Prosa som en rutt visar
  (tillgänglighetsredogörelsen) finns enbart i `docs/`, och appens
  generator skriver den till en vykomponent.
- `infra/` innehåller Terraform för driftmiljön och dess README.

### Arbetsytor

- `apps/` innehåller det som byggs till en webbplats: `apps/web`, appen,
  och `apps/storybook`, Storybook för designsystemet.
- `services/api` innehåller Node-servern: API:et och utdelningen av
  appen, Storybook, media och designsystemets exempel.
- `packages/` innehåller de publicerade paketen: `contracts` (scheman och
  typer för yttrandeposten) och `design-system` (tokens och
  domänkomponenter).
- `tools/` innehåller verktyg som körs vid byggtid eller i CI och aldrig
  levereras: `media-pipeline`, `icons` och skripten i `tools/ci`.
- `tests/` innehåller webbläsarsviterna som spänner över arbetsytor,
  deras Playwright-konfiguration och skriptet som skapar testcertifikatet
  för lokal TLS.

En arbetsyta innehåller:

- `package.json`, sin `tsconfig`-, Vite- och Vitest-konfiguration och,
  för de publicerade paketen, en `README.md`;
- `src/` för källkod (i Storybook `.storybook/` för konfigurationen och
  `stories/`, den form Storybook läser);
- `scripts/` för bygg- och genereringsskript, där `generate.mjs` skriver
  arbetsytans genererade filer;
- indata som arbetsytans eget verktyg läser, till exempel
  mediepipelinens `manifest.json` och `link-outs.json`.

`apps/web/index.html` är appens HTML-ingång.

### Maskinskrivna filer

Varje commitad fil som ett program skriver hör till en av klasserna
nedan, var och en med sin skribent och den kontroll som håller den
korrekt.

- **Genererade källfiler:** `scripts/generate.mjs` i arbetsytan som äger
  källan skriver dem till en katalog `generated/` i arbetsytan som
  använder dem. Det enda undantaget är OpenAPI-dokumentet, som
  `services/api/scripts/generate.mjs` skriver till `contracts/openapi/`
  som det publicerade kontraktet. De redigeras aldrig för hand.
  `npx lerna run generate` skriver om alla, och CI-jobbet `drift` fäller
  bygget om något då skiljer sig från det som är commitat.
- **Korpusen:** allt i `content/` (klipp, stillbilder, textning,
  yttrandeposter och deras REUSE-annoteringar) skrivs av mediepipelinen
  i `tools/media-pipeline`. CI laddar inte ned den igen; pipelinens
  tester kontrollerar hashen för varje commitat klipp och stillbild,
  varje registrerad längd mot sitt klipp och varje länk mot de
  verifierade sidtitlarna i `link-outs.json`, och
  `tools/ci/check-media-count.mjs` kontrollerar antalet filer mot
  manifestet.
- **Skärmbilder av lägen:** webbläsarsviten (`tests/app/journeys.mjs`)
  skriver `docs/design/states/*.png` när den körs med
  `TECKEN_WRITE_STATES=1`. CI jämför inte bilderna; CI kör samma flöden
  i alla motorer och kontrollerar varje läge som bilderna visar.
- **Täckningsraden i README** mellan markörerna `coverage-stamp`:
  `node tools/ci/check-coverage-stamp.mjs --write` skriver den, och CI
  kör skriptet utan `--write` och fäller bygget om raden skiljer sig
  från `content/`.
- **Låsfiler:** npm skriver `package-lock.json` och Terraform skriver
  filerna `.terraform.lock.hcl`. CI installerar med `npm ci` och
  initierar Terraform med `-lockfile=readonly`, och båda fäller bygget
  om en låsfil inte stämmer med sina manifest.

`content/` är den enda källan till korpusdata. Kod, tester och
berättelser som använder en posts värden läser dem ur `content/`,
direkt eller genom en genererad fil; de anger poster med id och kopierar
aldrig deras fält. Mediepipelinens indata (`manifest.json` och
`link-outs.json`) är det som `content/` byggs ur, och erkännandena i
README-filerna, `REUSE.toml`-filerna och `docs/content/link-outs.md`
namnger källorna så som deras licenser kräver.

### Kod i appen och designsystemet

- `packages/design-system/src/components` innehåller domänkomponenter
  (T-prefix) som återger teckenspråksbegrepp utan appens routing,
  store, API-typer eller locale-nycklar. Allt som återanvänds utanför
  appen hör hit.
- `packages/design-system/src/tokens` innehåller tokendefinitionerna och
  deras kontroller.
- `packages/design-system/examples` innehåller statiska sidor som visar
  designsystemet utan Vue, och som servern delar ut under `/examples/`.
- `apps/storybook` innehåller Storybook-konfigurationen (`.storybook/`),
  berättelserna (`stories/`) och de genererade poster de visar.
- `apps/web/src` innehåller appens startfiler (`main.ts`, `App.vue`,
  `router.ts`, `route-query.ts` och typdeklarationer) och en katalog
  per slag, enligt tabellen nedan.

| Katalog                   | Innehåll                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/views`      | en komponent per rutt, och hjälpfunktioner som bara vyerna använder; en vy äger URL- och frågehantering, dataladdning och fokus, och hålls tunn |
| `apps/web/src/components` | alla övriga komponenter, dialoger inbegripna                                                                                                    |
| `apps/web/src/api`        | den typade klienten mot API:et                                                                                                                  |
| `apps/web/src/stores`     | Pinia-stores                                                                                                                                    |
| `apps/web/src/icons`      | injiceringen av ikonuppsättningen                                                                                                               |
| `apps/web/src/locales`    | översättningar, en fil per språk                                                                                                                |
| `apps/web/src/styles`     | globala stilmallar: appskal och delmängder av tredjepartsbibliotek; komponentstilar ligger scopade i sina SFC:er                                |
| `apps/web/src/generated`  | genererade filer                                                                                                                                |

### Tester

- Ett enhetstest ligger bredvid filen det testar, och testdata ligger i
  `fixtures/` bredvid testerna som använder den.
- Ett test vars föremål inte är en källfil ligger i arbetsytan som
  vaktar föremålet: kontrollerna av `content/` (`integrity.test.ts`,
  `link-outs.test.ts`) i mediepipelinen, som skriver den, och
  negativkontrollerna för importförbuden i `eslint.config.mjs`
  (`banned-imports.test.ts`) bredvid designsystemets komponenter som
  förbuden skyddar.
- Webbläsarsviter som spänner över arbetsytor ligger i `tests/`.

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
ta en stund.

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
