import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowRight, Film, Zap, Lock } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">Werkbank</div>
          {isAuthenticated ? (
            <Button onClick={() => navigate("/dashboard")}>
              Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => startLogin()}>
              Anmelden
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Vom Thema zum Video
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Verwandeln Sie Ihre Marketingideen in professionelle Videoclips. 
            Von der Storyboard-Generierung bis zur fertigen Animation — alles in einer Plattform.
          </p>
          {!isAuthenticated ? (
            <Button size="lg" onClick={() => startLogin()} className="text-lg px-8 py-6">
              Kostenlos starten
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button size="lg" onClick={() => navigate("/dashboard")} className="text-lg px-8 py-6">
              Zum Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <Film className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Storyboard-Generierung</h3>
            <p className="text-slate-300">
              KI-gestützte Storyboard-Erstellung aus Ihrem Thema mit Narration und visuellen Prompts.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <Zap className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Video-Generierung</h3>
            <p className="text-slate-300">
              Konvertieren Sie Szenen in hochwertige Videos mit verschiedenen KI-Modellen und Auflösungen.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <Lock className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sichere API-Verwaltung</h3>
            <p className="text-slate-300">
              Alle API-Schlüssel werden serverseitig verwaltet. Ihre Daten bleiben privat und geschützt.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">So funktioniert es</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Projekt erstellen</h3>
                <p className="text-slate-300">Geben Sie ein Thema für Ihr Video-Projekt ein.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Storyboard generieren</h3>
                <p className="text-slate-300">Unsere KI erstellt automatisch ein Storyboard mit Szenen, Narration und visuellen Prompts.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Szenen bearbeiten</h3>
                <p className="text-slate-300">Passen Sie Narration, visuelle Prompts und Einstellungen nach Bedarf an.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Videos generieren</h3>
                <p className="text-slate-300">Generieren Sie hochwertige Videos für jede Szene mit Ihren bevorzugten Einstellungen.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-900/50 backdrop-blur mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-slate-400">
          <p>© 2026 Werkbank. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </div>
  );
}
