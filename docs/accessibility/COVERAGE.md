# Accessibility coverage

Target: WCAG 2.1 level A and AA, plus the WCAG 2.2 A/AA additions
(EN 301 549 clause 9 maps onto the same criteria).

**Automated checks miss things.** axe and the journeys below catch a
known subset of failures — roughly a third of WCAG issues by most
estimates. They cannot judge whether a caption is accurate, whether a
heading describes its section, or whether a screen reader announces a
change in a way that makes sense. Every release therefore also needs the
manual session in [manual-test-checklist.md](manual-test-checklist.md),
and its dated record is the evidence for the rows marked _manual_.

## Browsers

`E2E_BROWSERS = chromium, firefox, webkit`, declared once in
[`tests/playwright.config.mjs`](../../tests/playwright.config.mjs). A
declared browser that is skipped, missing or runs no tests fails the CI
`browser` job (`tools/ci/check-browsers.mjs`). There is no declared
elision.

## What the automated suite covers

The app suite is [`tests/app/journeys.mjs`](../../tests/app/journeys.mjs),
run by `app.spec.mjs` in CI and `run-local.mjs` locally. On every route
and every state (empty, loading, result, suggested with dialog open,
unsupported, error, fingerspelling playing) it asserts:

- axe with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`: zero
  violations;
- zero CSP violations (a `securitypolicyviolation` listener);
- no `<style>` inside any shadow root.

A negative control plants an `<img>` without `alt` in the real app and
requires the same axe gate to report `image-alt`, in every engine, so a
silently broken gate cannot pass.

## Criterion map

Legend: **auto** = asserted by the suite (test named), **manual** = checked
in the manual session, **n/a** = not applicable, with the reason.

| SC     | Name                                      | Level    | Coverage                                                                                                                                                               |
| ------ | ----------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1  | Non-text Content                          | A        | auto: axe `image-alt`, `svg-img-alt` (+ negative control); the icon sprite is `aria-hidden`; badge icons sit beside text. manual: video accessible names read sensibly |
| 1.2.1  | Audio-only and Video-only (Prerecorded)   | A        | manual: each clip is signing with no audio track; its Swedish caption and text label are the text alternative                                                          |
| 1.2.2  | Captions (Prerecorded)                    | A        | auto: Mode A and fingerspelling journeys — `track.mode = showing`, `cues.length > 0`, active cue text equals the record. manual: captions readable                     |
| 1.2.3  | Audio Description or Media Alternative    | A        | manual: the text label and caption give the full content of each clip                                                                                                  |
| 1.2.4  | Captions (Live)                           | AA       | n/a: no live media                                                                                                                                                     |
| 1.2.5  | Audio Description (Prerecorded)           | AA       | n/a: clips carry no audio and no visual-only information beyond the sign, which the caption states                                                                     |
| 1.3.1  | Info and Relationships                    | A        | auto: axe (`label`, `list`, `heading-order`, landmarks). manual: screen-reader structure                                                                               |
| 1.3.2  | Meaningful Sequence                       | A        | auto: keyboard journey (DOM order = visual order). manual                                                                                                              |
| 1.3.3  | Sensory Characteristics                   | A        | manual: no instruction relies on shape, position or colour                                                                                                             |
| 1.3.4  | Orientation                               | AA       | auto: reflow journey at 320 px; manual: portrait and landscape                                                                                                         |
| 1.3.5  | Identify Input Purpose                    | AA       | n/a: no input collects information about the user                                                                                                                      |
| 1.4.1  | Use of Color                              | A        | auto: axe `link-in-text-block`; badges carry icon + text (component tests). manual                                                                                     |
| 1.4.2  | Audio Control                             | A        | n/a: nothing autoplays and clips have no audio                                                                                                                         |
| 1.4.3  | Contrast (Minimum)                        | AA       | auto: axe `color-contrast`; token contrast unit tests over every rendered pair (design-system `contrast.test.ts`)                                                      |
| 1.4.4  | Resize Text                               | AA       | manual: 200 % zoom                                                                                                                                                     |
| 1.4.5  | Images of Text                            | AA       | n/a: no images of text                                                                                                                                                 |
| 1.4.10 | Reflow                                    | AA       | auto: "reflow" journey — no horizontal scroll at 320 CSS px on every route and the result state. manual: 400 % zoom                                                    |
| 1.4.11 | Non-text Contrast                         | AA       | auto: focus-ring and control-border pairs in `contrast.test.ts`. manual: forced colours                                                                                |
| 1.4.12 | Text Spacing                              | AA       | manual: text-spacing bookmarklet                                                                                                                                       |
| 1.4.13 | Content on Hover or Focus                 | AA       | n/a: no hover or focus pop-ups                                                                                                                                         |
| 2.1.1  | Keyboard                                  | A        | auto: "keyboard only" journey (skip link, search, dialog, video). manual                                                                                               |
| 2.1.2  | No Keyboard Trap                          | A        | auto: Escape and decline both leave the dialog, focus returns to `#phrase`. manual                                                                                     |
| 2.1.4  | Character Key Shortcuts                   | A        | n/a: no single-key shortcuts                                                                                                                                           |
| 2.2.1  | Timing Adjustable                         | A        | n/a: no time limits                                                                                                                                                    |
| 2.2.2  | Pause, Stop, Hide                         | A        | n/a: no auto-moving content; video only plays on request and has native controls                                                                                       |
| 2.3.1  | Three Flashes or Below Threshold          | A        | manual: clips reviewed for flashing                                                                                                                                    |
| 2.4.1  | Bypass Blocks                             | A        | auto: keyboard journey uses the skip link into `main`                                                                                                                  |
| 2.4.2  | Page Titled                               | A        | auto: axe `document-title`; router sets a title per route (unit test)                                                                                                  |
| 2.4.3  | Focus Order                               | A        | auto: keyboard journey; focus moves to the result heading (Mode A journey). manual                                                                                     |
| 2.4.4  | Link Purpose (In Context)                 | A        | auto: axe `link-name`. manual                                                                                                                                          |
| 2.4.5  | Multiple Ways                             | AA       | manual: the site is five pages, all in the main navigation                                                                                                             |
| 2.4.6  | Headings and Labels                       | AA       | manual                                                                                                                                                                 |
| 2.4.7  | Focus Visible                             | AA       | auto: keyboard journey asserts a visible outline on the video; tokenised `:focus-visible` everywhere. manual: every control                                            |
| 2.4.11 | Focus Not Obscured (Minimum)              | AA (2.2) | manual: nothing sticky overlaps focused controls                                                                                                                       |
| 2.5.1  | Pointer Gestures                          | A        | n/a: no multipoint or path gestures                                                                                                                                    |
| 2.5.2  | Pointer Cancellation                      | A        | manual: native buttons activate on up-event                                                                                                                            |
| 2.5.3  | Label in Name                             | A        | manual: visible labels and accessible names match (axe's rule for this is experimental and not enabled)                                                                |
| 2.5.4  | Motion Actuation                          | A        | n/a: no motion input                                                                                                                                                   |
| 2.5.7  | Dragging Movements                        | AA (2.2) | n/a: no dragging                                                                                                                                                       |
| 2.5.8  | Target Size (Minimum)                     | AA (2.2) | auto: axe `target-size` (wcag22aa). manual                                                                                                                             |
| 3.1.1  | Language of Page                          | A        | auto: axe `html-has-lang`, `html-lang-valid` (`lang="sv"`)                                                                                                             |
| 3.1.2  | Language of Parts                         | AA       | manual: no English passages in the Swedish UI                                                                                                                          |
| 3.2.1  | On Focus                                  | A        | auto: keyboard journey (focus changes no context). manual                                                                                                              |
| 3.2.2  | On Input                                  | A        | manual: typing changes nothing until the form is submitted                                                                                                             |
| 3.2.3  | Consistent Navigation                     | AA       | manual: one shared header on every route                                                                                                                               |
| 3.2.4  | Consistent Identification                 | AA       | manual                                                                                                                                                                 |
| 3.2.6  | Consistent Help                           | A (2.2)  | n/a: no help mechanism is offered                                                                                                                                      |
| 3.3.1  | Error Identification                      | A        | auto: "state error" journey (announced status, heading, retry). manual: FKUI validation messages                                                                       |
| 3.3.2  | Labels or Instructions                    | A        | auto: axe `label`; every input has a visible label and description                                                                                                     |
| 3.3.3  | Error Suggestion                          | AA       | manual: FKUI required/max-length messages                                                                                                                              |
| 3.3.4  | Error Prevention (Legal, Financial, Data) | AA       | n/a: no transactions                                                                                                                                                   |
| 3.3.7  | Redundant Entry                           | A (2.2)  | n/a: no multi-step process                                                                                                                                             |
| 3.3.8  | Accessible Authentication (Minimum)       | AA (2.2) | n/a: no authentication                                                                                                                                                 |
| 4.1.1  | Parsing                                   | A        | n/a: obsolete in WCAG 2.2; html-validate runs in CI                                                                                                                    |
| 4.1.2  | Name, Role, Value                         | A        | auto: axe (`button-name`, `aria-*`), dialog role and name in the Mode B journey. manual: screen reader                                                                 |
| 4.1.3  | Status Messages                           | AA       | auto: every state journey asserts the `role="status"` text. manual: NVDA announces it                                                                                  |

## Other automated guarantees (not WCAG criteria)

- reduced motion: no animation under `prefers-reduced-motion: reduce`, and
  the fade runs without it ("reduced motion" journey);
- typography from the token layer on `html`, `body`, `h1`, an FKUI button
  and an FKUI input, never a browser default, in every engine;
- the computed primary-button and provenance-badge colours equal the
  Tecken tokens;
- real playback: `currentTime` advances;
- no request to the lexicon's media (`teckensprakslexikon.su.se/movies/`)
  or to the lexicon at all.
