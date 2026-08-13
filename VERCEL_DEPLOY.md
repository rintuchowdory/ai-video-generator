# Vercel Deployment Anleitung

Diese Anleitung beschreibt, wie das **Werkbank AI Video Generator** Projekt fehlerfrei auf Vercel eingerichtet und bereitgestellt wird.

## 1. Ursache des vorherigen Deployment-Fehlers

Vercel hatte fälschlicherweise ein Root Directory namens `"frontend"` konfiguriert, das im Repository nicht existiert. Die Plattform verwendet stattdessen das Hauptverzeichnis (Root `.` ) mit einer monorepo-ähnlichen Struktur (`client/` für das Frontend und `server/` für das Backend).

---

## 2. Vercel Projekt-Einstellungen (Project Settings)

Öffnen Sie in Ihrem Vercel-Dashboard die Projekteinstellungen für **ai-video-generator** und korrigieren Sie folgende Werte unter **General**:

| Einstellung | Korrekter Wert | Beschreibung |
|---|---|---|
| **Root Directory** | *Leer lassen* oder `.` | Das Projekt liegt im Hauptverzeichnis des Repositories. |
| **Framework Preset** | `Vite` | Nutzt den Vite-Standard für den Client-Build. |
| **Build Command** | `pnpm build` | Führt `vite build` und den Server-Bundle-Schritt aus. |
| **Output Directory** | `dist/public` | Verzeichnis der gebauten statischen Assets. |
| **Install Command** | `pnpm install` | Installiert alle Projektabhängigkeiten. |

---

## 3. Umgebungsvariablen (Environment Variables)

Hinterlegen Sie unter **Settings → Environment Variables** folgende Schlüssel für **Production**, **Preview** und **Development**:

```env
MAGIC_HOUR_API_KEY=mhk_live_...
GROQ_API_KEY=gsk_...
DATABASE_URL=mysql://...
JWT_SECRET=...
```

*Hinweis: Die API-Schlüssel werden ausschließlich serverseitig verwendet und niemals an den Client übertragen.*

---

## 4. Lokale Validierung

Vor jedem Push können Sie den Vercel-Build lokal im Repository prüfen:

```bash
pnpm install
pnpm build
pnpm test
```
