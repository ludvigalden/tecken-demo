# Manual accessibility test checklist

Run against the local production build, served over local HTTPS:

```sh
npx lerna run build
npm run bundle --workspace services/api
TLSDIR="$(tests/tls/make-cert.sh)"
TECKEN_ROOT=. TLS_CERT_FILE="$TLSDIR/cert.pem" TLS_KEY_FILE="$TLSDIR/key.pem" \
    node services/api/dist/server.mjs
```

Open `https://localhost:8443/` and accept the browser's warning for the
throwaway self-signed certificate once per browser. Do not use plain
`http://localhost:8080/`: the production CSP carries
`upgrade-insecure-requests`, so Safari and WebKit request the scripts
over https and show a blank page. The https route renders the app in
Chromium, Firefox and WebKit.

Use the same build for every item below. Record each session in the
table at the end: date, tester, browsers and screen readers, result per
item, and any findings. Log every finding as an issue, then fix it or
list it as a known gap in [COVERAGE.md](COVERAGE.md).

Automated checks miss things, so this session is required for every
release. It covers the rows marked _manual_ in the coverage map.

## Items

1. **Keyboard only** (no mouse or touchpad for the whole pass)
    - Tab from the address bar: the first stop is "Hoppa till
      huvudinnehållet", and Enter moves into the main region.
    - Search a supported phrase, a near match, a negation
      ("jag behöver inte tvätta lite") and an unsupported phrase. Each
      result is reachable and operable, and focus lands on the result
      heading.
    - In the suggestion dialog: Tab cycles inside it, Escape and "Nej"
      return focus to the phrase field, and "Ja, visa" shows the result.
    - Play, pause and seek a clip, and switch captions off and on, with
      the native video controls.
    - In Safari: focus a playing clip and press Space. It must pause.
      Headless WebKit (Playwright) does not toggle a focused native
      video on Space, even on a bare page with no app code, while
      Chromium and Firefox do, so only a real Safari session can check
      this.
    - Fingerspell "Åsa" step by step with the button.
    - Visit every page in the navigation. No keyboard trap anywhere.
2. **NVDA with Firefox, and NVDA with Chrome** (Windows). If NVDA is not
   available, use Orca (Linux) or VoiceOver (macOS) and note which one.
    - Page titles, landmarks and headings are announced.
    - The status line announces the outcome of each search ("Ett inspelat
      yttrande hittades." and so on).
    - The provenance badge is read as text ("Inspelad källa: …"), not as
      a colour.
    - The video's name includes the phrase. The dialog's name is its
      heading, and its buttons are announced.
    - Fingerspelling announces "Bokstav 1 av 3: Å" and so on.
3. **200 % zoom** (browser zoom): all content readable, nothing clipped
   or overlapping, no horizontal scrolling for running text.
4. **400 % zoom** (equivalent to 320 CSS px): the layout reflows into
   one column with no horizontal scrolling. The dialog stays usable.
5. **Forced colours** (Windows High Contrast, or Chrome's emulation):
   focus rings, button borders, the badge text and the video frame stay
   visible. Information is never carried by colour alone.
6. **Reduced motion** (OS setting): no fade when a result appears.
7. **Captions readable**: on every clip type (utterance, single sign,
   letter), captions are on at first play and legible at default size.
   They match the text label and do not cover the signing hands for long.
8. **Focus visible on every control**: links, the input, buttons, the
   expandable source panel, dialog buttons and close, and the video.
   The ring is clearly visible against its background.
9. **Text spacing** (WCAG 1.4.12 bookmarklet): no clipped or overlapping
   text.
10. **Flashing**: watch each clip once. Nothing flashes more than three
    times a second.

## Session record

| Date | Tester | Environment | Items passed | Findings (issue links) |
| ---- | ------ | ----------- | ------------ | ---------------------- |
