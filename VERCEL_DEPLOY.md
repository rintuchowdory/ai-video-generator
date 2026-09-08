# Vercel Deployment Anleitung

Diese Anwendung hat ein Vite-Frontend **und** eine Node/tRPC-API. Sie darf daher nicht auf GitHub Pages oder einem anderen reinen Static Hosting veröffentlicht werden: Solche Hosts geben bei `/api/trpc` die `index.html` zurück, worauf der Client mit „API backend endpoint returned HTML instead of JSON“ fehlschlägt.

Das Repository enthält nun `api/[...path].ts` als Vercel-Serverless-Adapter. Dadurch wird jeder API-Aufruf in derselben Bereitstellung von Express/tRPC verarbeitet, während das Vite-Bundle weiter aus `dist/public` kommt.

## 1. Projekt-Einstellungen

Öffnen Sie die Vercel-Projekteinstellungen für **ai-video-generator** und verwenden Sie diese Werte unter **General**:

| Einstellung | Wert | Zweck |
|---|---|---|
| **Root Directory** | Leer lassen oder `.` | Frontend, API und Konfiguration liegen im Repository-Root. |
| **Framework Preset** | `Vite` | Baut das Client-Bundle. |
| **Build Command** | `pnpm build` | Erstellt das Vite-Bundle und prüft den Server-Bundle-Schritt. |
| **Output Directory** | `dist/public` | Verzeichnis der gebauten Frontend-Assets. |
| **Install Command** | `pnpm install --frozen-lockfile` | Installiert exakt die gelockten Abhängigkeiten. |

> Entfernen Sie gegebenenfalls ein altes `frontend`-Root-Directory. Es existiert in diesem Projekt nicht.

## 2. Umgebungsvariablen

Hinterlegen Sie diese Werte für **Production**, **Preview** und **Development**. Sie gehören ausschließlich in die Vercel-Umgebungsvariablen und niemals in das Repository oder ein `VITE_*`-Präfix.

```env
MAGIC_HOUR_API_KEY=mhk_live_...
GROQ_API_KEY=gsk_...
DATABASE_URL=mysql://...
```

Die Anwendung erstellt pro Browser automatisch einen anonymen Workspace. Es gibt keine Anmeldung, keinen OAuth-Redirect und keine `JWT_SECRET`-Pflicht mehr. Projekte bleiben über ein zufälliges, HTTP-only Browser-Cookie voneinander getrennt. Beim Löschen der Browserdaten ist der bisherige Gast-Workspace nicht wiederherstellbar.

## 3. Speicher für Uploads

Text-Storyboards sowie Text-zu-Bild/Video benötigen nur die drei Variablen oben. Der bestehende Upload- und Bild-zu-Video-Flow verwendet Manus Storage. Falls diese Funktionen auf Vercel benötigt werden, müssen zusätzlich gültige, serverseitige Storage-Werte bereitgestellt werden:

```env
BUILT_IN_FORGE_API_URL=https://...
BUILT_IN_FORGE_API_KEY=...
```

Ohne diese beiden Werte bleibt der Upload-Button funktionsfähig sichtbar, meldet jedoch klar einen Serverfehler statt Zugangsdaten an den Browser zu übertragen.

## 4. Lokale Validierung

Vor jedem Push führen Sie im Repository aus:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm test
```

Nach dem Deployment öffnen Sie `https://<deployment>/api/trpc/provider.capabilities?batch=1&input=%7B%220%22%3A%7B%7D%7D`. Eine JSON-Antwort bestätigt, dass die API läuft. Beginnt die Antwort mit `<!doctype html>`, ist die Bereitstellung weiterhin statisch konfiguriert und muss auf Vercel erfolgen.
