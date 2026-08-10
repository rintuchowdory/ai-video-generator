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
- [ ] Bild-Upload und Bild-zu-Video-Prozedur
- [x] Job-Status-Polling-Prozedur
- [x] Projektlisten- und Detailprozeduren
- [ ] Vitest-Tests für kritische Prozeduren

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
- [x] CORS und Sicherheits-Header konfigurieren

## Finalisierung & Deployment
- [x] Vollständiger End-to-End-Test (Vitest-Tests bestanden)
- [ ] Checkpoint erstellen
- [ ] Auf Manus Live veröffentlichen

## Noch zu implementierende Verbesserungen
- [ ] Echtes Frontend-Polling mit trpc.videos.getStatus und trpc.images.getStatus
- [ ] Vollständige Image-Tools UI (Modell/Stil-Auswahl, Upload, Image-to-Video)
- [ ] Per-Szenen-Status für Video und Bild aus Backend-Responses
- [ ] Explizite UI-Fehlerzustände für Capabilities und Job-Fehler
- [ ] CORS und Security-Headers im Server konfigurieren
- [ ] End-to-End-Validierung (Login, Projekt, Storyboard, Media, Status)
