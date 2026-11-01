# Contributing

Thank you for considering a contribution. Tecken is a small demonstration,
so issues that point out a problem are as welcome as pull requests.

## Development setup

You need Node.js 24 (see `.nvmrc`) and npm 11.

```sh
npm ci
npx lerna run build
npx lerna run test
```

The browser suite runs against the bundled Node server over local HTTPS,
in Chromium, Firefox and WebKit:

```sh
npx playwright install chromium firefox webkit
npm run bundle --workspace services/api
TLSDIR="$(tests/tls/make-cert.sh)"
cd tests
TLS_CERT_FILE="$TLSDIR/cert.pem" TLS_KEY_FILE="$TLSDIR/key.pem" PORT=8443 \
    npx playwright test -c playwright.config.mjs
```

Every gate that CI runs is listed in the README under "Tests and checks".

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
a type such as `feat`, `fix`, `docs`, `test` or `ci`, a short subject of
at most 72 characters, and no body. commitlint enforces this in CI.

## Licence of contributions

Inbound = outbound: by opening a pull request you agree that your
contribution is licensed under the licence of the files it changes (MIT
for code; see [REUSE.toml](REUSE.toml) for the rest). No Signed-off-by
line or DCO sign-off is asked for.

Media is never accepted by pull request. Clips come only from Wikimedia
Commons under CC BY or CC BY-SA, or from recordings made for the project
under CC BY, and each one is added through the media pipeline with its
source, licence and hash.

## Definition of done

A change is ready when:

- `npx lerna run typecheck lint test` passes, and so does `npm run lint:repo`;
- generated files are regenerated (`npx lerna run generate`) and committed;
- the browser suite passes in all three browsers, axe included;
- a change to the interface has been checked by hand against
  [docs/accessibility/manual-test-checklist.md](docs/accessibility/manual-test-checklist.md),
  and the pull request says which items were checked.

## Merging

Maintainers merge by fast-forwarding `main` to the pull request's head
once CI is green. There are no merge commits, so rebase your branch on
`main` when asked.

Please follow the [code of conduct](CODE_OF_CONDUCT.md).
