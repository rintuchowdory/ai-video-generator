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
- [x] Checkpoint erstellen (Checkpoint 70fdcf89)
- [x] Publish-Readiness dokumentieren; den finalen Publish-Klick führt der Nutzer im Manus-Management aus

## Noch zu implementierende Verbesserungen
- [x] Echtes Frontend-Polling mit trpc.videos.getStatus und trpc.images.getStatus (useJobPolling Hook)
- [x] Vollständige Image-Tools UI (Modell/Stil-Auswahl, Upload, Image-to-Video)
- [x] Per-Szenen-Status für Video und Bild aus Backend-Responses
- [x] Explizite UI-Fehlerzustände für Capabilities und Job-Fehler
- [x] CORS und Security-Headers im Server konfigurieren
- [x] End-to-End-Validierung mit realem Browser-Nutzerfluss dokumentiert (OAuth-Url, tRPC-Interceptor, Vercel-Deploy)

## Qualitätsnachweis vor Abschluss
- [x] Aussagekräftige Tests für Autorisierung, Upload-Validierung, Image-to-Video und Job-Fehlerpfade
- [x] Echten Browser-Smoke-Test durchgeführt und dokumentiert
- [x] Publish-Readiness und Nutzeraktion im Manus-Management dokumentieren

## Dashboard-Visual-Upgrade
- [x] Dashboard farbiger und visueller gestalten, Animationen sowie Bild- und Video-Preview-Elemente ergänzen
- [x] Dashboard-Visual-Upgrade mit Vitest, Build und Desktop-/Mobile-Screenshot verifizieren
- [x] Dashboard-Visual-Upgrade als neuen veröffentlichten Checkpoint speichern

## Video-Reel-Upgrade
- [x] Geschützte Video-Job-Abfrage für das Dashboard mit completed-, in-progress- und failed-Status ergänzen
- [x] Dedizierte Video-Reel-Sektion mit Statusfiltern und Job-Karten implementieren
- [x] Video-Previews beim Hover stumm abspielen und beim Verlassen pausieren
- [x] Reel-Upgrade mit Vitest, Build und Desktop-/Mobile-Screenshot verifiziert
- [x] Reel-Upgrade als neuen veröffentlichten Checkpoint speichern

## GitHub & Vercel Push
- [x] Aktuellen Arbeitsstand (Video-Reel, Statusfilter, Hover-Playback) auf GitHub pushen (main und manus-permanent)
- [x] Vercel-Deployment per Git-Push ausgelöst (Vercel überwacht den verbundenen GitHub-Branch)
- [x] GitHub- und Vercel-Ergebnis dokumentieren
