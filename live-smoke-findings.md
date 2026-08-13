# Live-Smoke-Test: Audio-Sync

- `https://werkbankvid-9spu9obw.manus.space/project/7` wurde am 13.08.2026 geprüft. Die Live-App antwortete mit „Projekt nicht verfügbar (ID: 7)“.
- `https://werkbankvid-9spu9obw.manus.space/project/60001` wurde anschließend geprüft. Auch diese URL antwortete mit „Projekt nicht verfügbar (ID: 60001)“.
- Daher konnte die authentifizierte Audio-Sync-Oberfläche in einem vorhandenen Live-Projekt nicht interaktiv geöffnet werden. Die Ursache ist fehlende Projektverfügbarkeit für beide Test-IDs, nicht ein nachgewiesener UI-Fehler.
- Lokale TypeScript-Prüfung, 40 Vitest-Tests und Produktions-Build sind erfolgreich.

## Nächster manueller Schritt

Ein authentifizierter Nutzer muss im Dashboard ein vorhandenes Projekt öffnen oder ein Testprojekt anlegen und dort eine Audio-Datei hochladen. Danach sollte der Bereich „Synchronisationsmodus“ mit „Automatisch an Szenen ausrichten“, Offset, Übergangspuffer und dem berechneten „Synchronisiertes Fenster“ sichtbar sein.

## Datenschutz-/Sicherheitsnotiz

Es wurden keine API-Schlüssel in Repository-Dateien aufgenommen. Die Live-Prüfung hat keine mutierende Aktion ausgeführt.

