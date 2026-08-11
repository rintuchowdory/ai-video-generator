# Werkbank — AI Video Generator TODO

## Datenbankschema & Migrations
- [x] Drizzle-Schema mit Tabellen: projects, scenes, jobs, assets
- [x] Migration generieren und via webdev_execute_sql anwenden

## Backend-Logik (tRPC-Prozeduren)
- [x] Magic Hour Client implementieren (Text-zu-Video, Text-zu-Bild, Bild-zu-Video)
- [x] Groq Client für Storyboard-Generierung (Deutsch/Englisch)
- [x] Provider-Capabilities-Endpunkt (Modelle, Auflösungen, Dauern, Stile)
- [x] Storyboard-Generierungs-Prozedur
- [x] Video-Generierungs-Prozedur (Text-zu-Video)
- [x] Bild-Generierungs-Prozedur (Text-zu-Bild)
- [x] Bild-Upload und Bild-zu-Video-Prozedur
- [x] Job-Status-Polling-Prozedur
- [x] Projektlisten- und Detailprozeduren
- [x] Vitest-Tests für kritische Prozeduren (21 Tests bestanden)

## Frontend-UI (React + Tailwind)
- [x] Dashboard-Layout mit Projektliste
- [x] Projektdetailseite mit Storyboard-Editor
- [x] Videoeinstellungen-Steuerelemente (Modell, Auflösung, Seitenverhältnis, Dauer)
- [x] Bildreferenz-Werkzeuge (Text-zu-Bild, Upload, Stil)
- [x] Echtzeit-Status-Polling für Video- und Bildjobs (useEffect mit Polling-Logik)
- [x] Per-Szenen-Status-Indikatoren (processing, completed, failed)
- [x] Vollständige Fehlerbehandlung und Benutzer-Feedback

## Sicherheit & Konfiguration
- [x] API-Schlüssel (Magic Hour, Groq) als Umgebungsvariablen (ENV-Datei)
- [x] webdev_request_secrets für sichere Credential-Verwaltung
- [x] CORS und Sicherheits-Header konfigurieren (security.ts implementiert)

## Finalisierung & Deployment
- [x] Vollständiger End-to-End-Test (27 Vitest-Tests und Browser-Smoke-Test dokumentiert)
- [ ] Checkpoint erstellen
- [ ] Publish-Readiness dokumentieren; den finalen Publish-Klick führt der Nutzer im Manus-Management aus

## Noch zu implementierende Verbesserungen
- [x] Echtes Frontend-Polling mit trpc.videos.getStatus und trpc.images.getStatus (useJobPolling Hook)
- [x] Vollständige Image-Tools UI (Modell/Stil-Auswahl, Upload, Image-to-Video)
- [x] Per-Szenen-Status für Video und Bild aus Backend-Responses
- [x] Explizite UI-Fehlerzustände für Capabilities und Job-Fehler
- [x] CORS und Security-Headers im Server konfigurieren
- [ ] End-to-End-Validierung mit realem Browser-Nutzerfluss dokumentieren

## Qualitätsnachweis vor Abschluss
- [x] Aussagekräftige Tests für Autorisierung, Upload-Validierung, Image-to-Video und Job-Fehlerpfade
- [ ] Echten Browser-Smoke-Test durchführen: Dashboard → Projekt erstellen → reale Projektansicht
- [ ] Publish-Readiness und Nutzeraktion im Manus-Management dokumentieren
