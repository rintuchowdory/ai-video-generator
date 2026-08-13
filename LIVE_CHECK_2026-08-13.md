# Live-Check 2026-08-13

Die neue Firefox-Konsolendatei enthält keine App-JavaScript-Ausnahme und keine fehlerhaften tRPC-Antworten. `auth.me` antwortete mit HTTP 200; `projects.list,jobs.videoReel` antwortete mit HTTP 200.

Die wiederkehrenden Meldungen betreffen externe Manus-/Browser-Integrationen: `files.manuscdn.com` (Space Editor), `plausible.io`, `cdn.growthbook.io`, Google Fonts und `extension-cdn.getdirecto.com`. Sie werden durch die strikte projektseitige CSP oder Browser-Erweiterungen blockiert und sind nicht der App-Button-Handler.

Die aktuell über `werkbankvid-9spu9obw.manus.space` ausgelieferte HTML-Datei referenziert weiterhin `/assets/index-XwKTT_e5.js` und `/assets/index-CGcXYbyc.css`. Der lokale Build nach dem Button-Fix referenziert `/assets/index-BjcnpaDf.js` und `/assets/index-Bd1KIa_J.css`. Damit ist der Live-Domain-Stand gegenüber dem zuletzt geprüften lokalen/Checkpoint-Stand veraltet oder zeigt noch einen älteren Deployment-Cache. Der veröffentlichte Live-Check sollte nach einem neuen Deployment erneut mit der neuen Asset-Hash-Kombination geprüft werden.
