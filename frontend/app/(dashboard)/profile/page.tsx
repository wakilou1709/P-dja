'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { Mail, Phone, Award, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
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
        <div className="text-white text-xl">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Mon Profil</h1>
        <p className="text-gray-400">Gérer tes informations personnelles</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* User Info */}
        <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Informations personnelles</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom complet</label>
              <div className="text-white font-medium">
                {user?.firstName} {user?.lastName}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <div className="flex items-center gap-2 text-white">
                <Mail className="w-4 h-4 text-gray-400" />
                {user?.email}
              </div>
            </div>

            {user?.phone && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Téléphone</label>
                <div className="flex items-center gap-2 text-white">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {user.phone}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Membre depuis</label>
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatDate(user?.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Abonnement</h2>

          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-lg font-semibold text-white">
              {user?.subscription?.plan || 'FREE'}
            </div>
            <div className="text-sm text-gray-400">
              {user?.subscription?.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
            </div>
          </div>

          <button className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
            Mettre à niveau
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid md:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">{user?.points || 0}</div>
          <div className="text-sm text-gray-400">Points</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">Niveau {user?.level || 1}</div>
          <div className="text-sm text-gray-400">Niveau actuel</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">{user?.streak || 0}</div>
          <div className="text-sm text-gray-400">Jours de suite</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">0</div>
          <div className="text-sm text-gray-400">Badges</div>
        </div>
      </div>
    </div>
  );
}
