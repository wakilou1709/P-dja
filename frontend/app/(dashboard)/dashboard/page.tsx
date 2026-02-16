'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { BookOpen, Brain, Trophy, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authApi.getCurrentUser();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Bonjour, {user?.firstName} ! 👋
        </h1>
        <p className="text-gray-400">
          Prêt à continuer ton apprentissage ?
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">0</div>
          <div className="text-sm text-gray-400">Quiz complétés</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">0%</div>
          <div className="text-sm text-gray-400">Score moyen</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{user?.streak || 0}</div>
          <div className="text-sm text-gray-400">Jours de suite</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">Niveau {user?.level || 1}</div>
          <div className="text-sm text-gray-400">{user?.points || 0} points</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Actions rapides</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <a
            href="/quiz"
            className="p-4 bg-purple-600/10 border border-purple-500/30 rounded-lg hover:bg-purple-600/20 transition"
          >
            <h3 className="font-semibold text-white mb-2">Commencer un quiz</h3>
            <p className="text-sm text-gray-400">Teste tes connaissances</p>
          </a>

          <a
            href="/exams"
            className="p-4 bg-cyan-600/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/20 transition"
          >
            <h3 className="font-semibold text-white mb-2">Voir les annales</h3>
            <p className="text-sm text-gray-400">Parcours les examens passés</p>
          </a>

          <a
            href="/profile"
            className="p-4 bg-purple-600/10 border border-purple-500/30 rounded-lg hover:bg-purple-600/20 transition"
          >
            <h3 className="font-semibold text-white mb-2">Mon profil</h3>
            <p className="text-sm text-gray-400">Voir mes statistiques</p>
          </a>
        </div>
      </div>
    </div>
  );
}
