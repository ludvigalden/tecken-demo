<!-- Generated from docs/accessibility/tillganglighetsredogorelse.md by `lerna run generate`. Never edit by hand. -->
<template>
    <p>Tecken är en demonstration av webbutveckling och ingen offentlig webbplats. För teckenspråk i verkligheten finns <a href="https://teckensprakslexikon.su.se/">Svenskt teckenspråkslexikon</a>. Redogörelsen följer ändå den form som lagen om tillgänglighet till digital offentlig service (DOS-lagen, SFS 2018:1937) kräver av offentliga aktörer, så att det syns hur tjänsten uppfyller kraven och var den brister.</p>
    <h2>Hur tillgänglig är webbplatsen?</h2>
    <p>Kravnivån är EN 301 549 V3.2.1, som motsvarar WCAG 2.1 nivå AA. Målet är WCAG 2.2 nivå AA.</p>
    <p><strong>Status: delvis förenlig.</strong> Automatiska tester visar inga fel, men den manuella granskningen med skärmläsare är inte genomförd. Därför räknas tjänsten som delvis förenlig.</p>
    <h2>Kända brister</h2>
    <ul>
        <li><strong>Manuell granskning saknas.</strong> Skärmläsartest med NVDA, zoom till 400 %, tvingade färger och textavstånd är inte genomförda. De står i <a href="https://github.com/ludvigalden/tecken-demo/blob/main/docs/accessibility/manual-test-checklist.md">checklistan för manuell testning</a>.</li>
        <li><strong>Teckenspråksinnehållet är litet.</strong> Tjänsten har bara ett fåtal inspelade fraser och tecken. Allt annat besvaras med en tydlig upplysning om att frasen inte stöds, och med länkar till Svenskt teckenspråkslexikon.</li>
        <li><strong>Klipp startar av sig själva.</strong> Ett sökresultat spelas upp direkt, ljudlöst och en gång. Den som har valt minskad rörelse får inget automatiskt uppspel, och klippet kan alltid pausas med kontrollerna. Teckenspråksklippen har inget meningsfullt ljud.</li>
        <li><strong>Lång laddningstid på långsamma mobilnät.</strong> På en simulerad långsam mobilanslutning tar det runt 2,5 sekunder innan sidans text visas, och på sidan Källor runt 3 sekunder.</li>
    </ul>
    <h2>Så har vi testat</h2>
    <p>Tjänsten testas automatiskt vid varje ändring och manuellt före varje version.</p>
    <ul>
        <li><strong>Automatiskt:</strong> axe-core med reglerna för WCAG 2.0, 2.1 och 2.2 nivå A och AA på alla sidor och i alla lägen, i Chromium, Firefox och WebKit. Testerna kontrollerar också tangentbordsanvändning, att fokus återvänder efter dialogen, ombrytning vid 320 pixlars bredd, minskad rörelse, textning och kontrast. Senaste körning: 31 oktober 2026.</li>
        <li><strong>Manuellt:</strong> tangentbord, NVDA med Firefox och Chrome, zoom till 200 % och 400 %, tvingade färger, minskad rörelse, textning och synligt fokus. Resultatet dateras i checklistan.</li>
        <li><strong>Kopplingen till kriterierna:</strong> <a href="https://github.com/ludvigalden/tecken-demo/blob/main/docs/accessibility/COVERAGE.md">COVERAGE.md</a> visar för varje kriterium i WCAG 2.1 och 2.2 om det testas automatiskt eller manuellt, eller varför det inte är tillämpligt.</li>
    </ul>
    <h2>Rapportera brister</h2>
    <p>Om något är svårt eller omöjligt att använda vill vi veta det.</p>
    <ul>
        <li>Skapa ett ärende i projektets ärendelista på GitHub, med mallen ”Accessibility problem”.</li>
        <li>Eller mejla <a href="mailto:tecken-demo@ludvigalden.com">tecken-demo@ludvigalden.com</a>.</li>
    </ul>
    <p>Vi svarar inom fem arbetsdagar.</p>
    <h2>Tillsyn</h2>
    <p>Myndigheten för digital förvaltning (Digg) är tillsynsmyndighet för DOS-lagen. Tecken är ingen offentlig webbplats och omfattas inte av lagen, så Digg har ingen tillsyn över den. Om du inte är nöjd med vårt svar hänvisar vi därför till ärendelistan.</p>
    <p>Redogörelsen uppdaterades senast 31 oktober 2026.</p>
</template>
