'use client';

import { useEffect, useState } from 'react';
import { examsApi } from '@/lib/api';
import { BookOpen, Calendar, Clock } from 'lucide-react';

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await examsApi.getAll();
        setExams(data);
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const filteredExams = exams.filter(
    (exam) =>
      exam.title.toLowerCase().includes(filter.toLowerCase()) ||
      exam.subject.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Chargement des examens...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Annales d'examens</h1>
        <p className="text-gray-400">
          Parcours et télécharge les sujets d'examens passés
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher un examen..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Exams Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>
              <span className="px-3 py-1 bg-purple-600/20 text-purple-400 text-xs font-semibold rounded-full">
                {exam.type}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{exam.title}</h3>

            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{exam.year || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{exam.duration ? `${exam.duration} min` : 'Non spécifié'}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <button className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
                Voir l'examen
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredExams.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          Aucun examen trouvé
        </div>
      )}
    </div>
  );
}
