# Tillgänglighetsredogörelse för Tecken

Tecken är en demonstration av webbutveckling och ingen offentlig
webbplats. För teckenspråk i verkligheten finns
[Svenskt teckenspråkslexikon](https://teckensprakslexikon.su.se/). Redogörelsen
följer ändå den form som lagen om tillgänglighet till digital offentlig
service (DOS-lagen, SFS 2018:1937) kräver av offentliga aktörer, så att
det syns hur tjänsten uppfyller kraven och var den brister.

## Hur tillgänglig är webbplatsen?

Kravnivån är EN 301 549 V3.2.1, som motsvarar WCAG 2.1 nivå AA. Målet är
WCAG 2.2 nivå AA.

**Status: delvis förenlig.** Automatiska tester visar inga fel, men den
manuella granskningen med skärmläsare är inte genomförd. Därför räknas
tjänsten som delvis förenlig.

## Kända brister

- **Manuell granskning saknas.** Skärmläsartest med NVDA, zoom till
  400 %, tvingade färger och textavstånd är inte genomförda. De står
  i [checklistan för manuell testning](manual-test-checklist.md).
- **Teckenspråksinnehållet är litet.** Tjänsten har bara ett fåtal
  inspelade fraser och tecken. Allt annat besvaras med en tydlig
  upplysning om att frasen inte stöds, och med länkar till Svenskt
  teckenspråkslexikon.
- **Klipp startar av sig själva.** Ett sökresultat spelas upp direkt,
  ljudlöst och en gång. Den som har valt minskad rörelse får inget
  automatiskt uppspel, och klippet kan alltid pausas med kontrollerna.
  Teckenspråksklippen har inget meningsfullt ljud.
- **Lång laddningstid på långsamma mobilnät.** På en simulerad långsam
  mobilanslutning tar det runt 2,5 sekunder innan sidans text visas, och
  på sidan Källor runt 3 sekunder.

## Så har vi testat

Tjänsten testas automatiskt vid varje ändring och manuellt före varje
version.

- **Automatiskt:** axe-core med reglerna för WCAG 2.0, 2.1 och 2.2 nivå A
  och AA på alla sidor och i alla lägen, i Chromium, Firefox och WebKit.
  Testerna kontrollerar också tangentbordsanvändning, att fokus
  återvänder efter dialogen, ombrytning vid 320 pixlars bredd, minskad
  rörelse, textning och kontrast. Senaste körning: 31 oktober 2026.
- **Manuellt:** tangentbord, NVDA med Firefox och Chrome, zoom till 200 %
  och 400 %, tvingade färger, minskad rörelse, textning och synligt
  fokus. Resultatet dateras i checklistan.
- **Kopplingen till kriterierna:** [COVERAGE.md](COVERAGE.md) visar för
  varje kriterium i WCAG 2.1 och 2.2 om det testas automatiskt eller
  manuellt, eller varför det inte är tillämpligt.

## Rapportera brister

Om något är svårt eller omöjligt att använda vill vi veta det.

- Skapa ett ärende i projektets ärendelista på GitHub, med mallen
  ”Accessibility problem”.
- Eller mejla [tecken-demo@ludvigalden.com](mailto:tecken-demo@ludvigalden.com).

Vi svarar inom fem arbetsdagar.

## Tillsyn

Myndigheten för digital förvaltning (Digg) är tillsynsmyndighet för
DOS-lagen. Tecken är ingen offentlig webbplats och omfattas inte av
lagen, så Digg har ingen tillsyn över den. Om du inte är nöjd med vårt
svar hänvisar vi därför till ärendelistan.

Redogörelsen uppdaterades senast 31 oktober 2026.
