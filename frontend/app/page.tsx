import Link from 'next/link';
import { ArrowRight, BookOpen, Brain, Trophy, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-white">
            <span className="gradient-primary bg-clip-text text-transparent">Pédja</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-white hover:text-purple-300 transition"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Commencer
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Réussis tes examens avec
            <span className="block mt-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Pédja
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Des milliers d'annales, des quiz interactifs et un suivi personnalisé
            pour t'accompagner vers la réussite.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-lg font-semibold"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/exams"
              className="px-8 py-4 border border-purple-400 text-purple-300 rounded-lg hover:bg-purple-900/30 transition text-lg font-semibold"
            >
              Voir les annales
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-purple-500/20">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Annales complètes</h3>
            <p className="text-gray-400">
              Accède à des milliers de sujets d'examens passés (BAC, BEPC, Concours)
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-cyan-500/20">
            <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Quiz adaptatifs</h3>
            <p className="text-gray-400">
              Des quiz qui s'adaptent à ton niveau pour une progression optimale
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-purple-500/20">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Suivi de progression</h3>
            <p className="text-gray-400">
              Suis tes performances et identifie tes points à améliorer
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-cyan-500/20">
            <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Hors-ligne</h3>
            <p className="text-gray-400">
              Étudie partout, même sans connexion internet
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Prêt à réussir ?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Rejoins des milliers d'étudiants qui ont déjà amélioré leurs résultats
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition text-lg font-semibold"
          >
            Créer mon compte gratuit
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; 2024 Pédja. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
