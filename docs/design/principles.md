# Design principles

## Designed states

The lookup has six states, and each one has a designed presentation:

| State       | What the user sees                                                                                            | Announced         |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| idle        | The input and a short "what this is" line                                                                     | —                 |
| loading     | The input stays usable; a status line says the search is running                                              | "Söker…" (polite) |
| result      | The heading moves into view and takes focus; the provenance badge and panel come **before** the video         | Heading text      |
| suggested   | A confirm dialog (FKUI modal, a root component opened via the API) names the supported message and its source | Dialog title      |
| unsupported | A plain list of what is supported, plus lexicon link-outs                                                     | Status line       |
| error       | What went wrong in plain Swedish, with a retry                                                                | Status line       |

Fingerspelling is its own mode with its own label, "Fingerstavning – bokstav
för bokstav, inte ett tecken för ordet", so nobody mistakes a spelled word for
a sign.

## Provenance first

Every recording shows where it came from **before** the user presses play.
The badge says, in words and with an icon, whether the result is a recorded
source, a link-out, or unsupported; colour only reinforces it. The panel lists
source, author, signer ("ej namngiven i källan" when the source does not name
one), publisher, licence and retrieval date. This is the demo's honesty
contract: it plays recorded human signing, translates nothing, and says so.

## Motion

Motion is decoration, never information. Transitions run only under
`prefers-reduced-motion: no-preference`; with reduced motion the interface is
complete and nothing is lost. Videos never autoplay.

## Focus

- A skip link reaches the main region.
- A result moves focus to its heading (`tabindex="-1"`), so screen-reader and
  keyboard users land on the answer.
- The confirm dialog traps focus while open and returns it to the control that
  opened it.
- The focus ring is one token pair, `--tecken-focus-ring` on a
  `--tecken-focus-ring-gap` halo. Tecken's own focusable elements draw it
  as a `:focus-visible` outline (`--tecken-focus-ring-width`,
  `--tecken-focus-ring-offset`); FKUI controls draw it through their own
  focus box-shadow, with `--fkds-focus-indicator-color` and
  `--fkds-focus-indicator-color-background` mapped onto the same pair.
  The contrast suite checks the ring at 3:1 or better against the default and
  muted surfaces, against its own gap, and on a focused primary button.

## Tokens

Two tiers: private `--tecken-*` primitives and semantic roles. Components use
only the semantic tier. The generated `fkui-theme.css` maps every FKUI colour
variable that the shipped FKUI components render (text, surfaces,
borders, actions, feedback and the focus indicator) onto a semantic role. A
test compiles the FKUI SCSS for those components, collects each colour
variable the output references, and fails if any is unmapped. FKUI variables
that no shipped component renders are left at FK's defaults and have no
visible effect; the test widens automatically when a component is added. The
contrast suite checks the pairs as rendered (badge, button, message, focus),
on effective values. FKUI sets no body font, so the token layer owns typography with a
system stack (`--tecken-font-family-base`), which needs no web font and no
`font-src` exception.

## Strict CSP and Storybook

The application runs under `style-src 'self'`, no inline styles. Storybook
(served under `/designsystem/`) has a path-scoped policy that admits its fixed
inline blocks by sha256 hash, computed at build time — never `unsafe-*`.
Storybook's integrated addons that write runtime styles (highlight, measure,
outline, backgrounds, viewport) are disabled, since runtime styles cannot be
hashed; the accessibility check runs as axe in Playwright over every built
story in Chromium, Firefox and WebKit.

The `/designsystem/` policy differs from the base policy in exactly three
directives, all asserted in `services/api/src/security-headers.test.ts`:

- `script-src` and `style-src` add the build-time sha256 hashes of
  Storybook's fixed inline blocks.
- `frame-ancestors` is `'self'`, not `'none'`: the Storybook manager
  page renders each story inside an iframe from the same origin. Only
  same-origin framing is allowed; no other site can frame the Storybook,
  and the application paths keep `frame-ancestors 'none'`.
