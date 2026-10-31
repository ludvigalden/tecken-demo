# Lexicon link-outs

The six link-out records point at entries in Svenskt teckenspråkslexikon
(Stockholms universitet). The lexicon's example media is CC BY-NC-SA 4.0,
so the demo never embeds, hotlinks or downloads it; it only links.

The record words come from `tools/media-pipeline/link-outs.json`, a fixture
holding each page's live `<title>` text. The unit test
`tools/media-pipeline/src/link-outs.test.ts` proves the committed records
match the fixture. CI does not fetch the lexicon, so the fixture itself is
verified by hand whenever it changes.

## Manual verification

Run from the repository root and compare the output with the fixture's
`title` fields:

```sh
for o in 00032 00192 00360 00625 04074 04856; do
    printf '%s ' "$o"
    curl -sS "https://teckensprakslexikon.su.se/ord/$o" \
        | grep -o '<title>[^<]*</title>' \
        | sed 's/<title>\(.*\) - Svenskt teckenspråkslexikon.*/\1/'
done
```

| Ord | Page title (verified 2026-10-30) | Record word |
| --- | --- | --- |
| 00032 | hej | hej |
| 00192 | välkommen | välkommen |
| 00360 | stäng, stänga, stängd, stängt | stänga |
| 00625 | hjälpa | hjälpa |
| 04074 | toalett | toalett |
| 04856 | hiss | hiss |
