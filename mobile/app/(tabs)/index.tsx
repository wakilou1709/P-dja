import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { usersApi, examsApi } from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';
import { NeoCard } from '../../components/NeoCard';
import { colors, radius, neoRaised } from '../../lib/theme';

interface Stats { totalQuizzes: number; averageScore: number; totalAchievements: number }
interface Exam { id: string; title: string; subject: string; examType: string; year: number; difficulty: string }

const DIFF_COLOR: Record<string, string> = { EASY: '#10B981', MEDIUM: '#F59E0B', HARD: '#EF4444', EXPERT: '#9333ea' };
const DIFF_LABEL: Record<string, string> = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile', EXPERT: 'Expert' };

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([usersApi.getStats(), examsApi.getAll({ limit: 5 })]);
      setStats(s);
      setRecentExams(e.data ?? e ?? []);
    } catch { Alert.alert('Erreur', 'Impossible de charger les données'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>{user?.firstName?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.firstName} 👋</Text>
          <Text style={styles.subtitle}>Prêt à continuer ?</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {isLoading ? (
          <>
            <Skeleton height={90} borderRadius={16} style={styles.statSkeletonHalf} />
            <Skeleton height={90} borderRadius={16} style={styles.statSkeletonHalf} />
            <Skeleton height={90} borderRadius={16} style={styles.statSkeletonHalf} />
            <Skeleton height={90} borderRadius={16} style={styles.statSkeletonHalf} />
          </>
        ) : (
          <>
            <StatCard value={`${stats?.totalQuizzes ?? 0}`} label="Quiz" icon="🎯" color={colors.primary} />
            <StatCard value={`${Math.round(stats?.averageScore ?? 0)}%`} label="Score moyen" icon="📈" color={colors.secondary} />
            <StatCard value={`${user?.streak ?? 0}`} label="Série" icon="🔥" color="#F59E0B" />
            <StatCard value={`${stats?.totalAchievements ?? 0}`} label="Succès" icon="🏆" color="#10B981" />
          </>
        )}
      </View>

      {/* Examens récents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Examens récents</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/exams')}>
            <Text style={styles.seeAll}>Voir tout →</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? [1, 2, 3].map(i => <Skeleton key={i} height={76} borderRadius={16} style={{ marginBottom: 10 }} />) :
          recentExams.length === 0 ? (
            <NeoCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucun examen disponible</Text>
            </NeoCard>
          ) : recentExams.map(exam => (
            <TouchableOpacity key={exam.id} onPress={() => router.push(`/(tabs)/exams/${exam.id}` as any)}>
              <NeoCard size="sm" style={styles.examCard}>
                <View style={styles.examRow}>
                  <View style={styles.examInfo}>
                    <Text style={styles.examTitle} numberOfLines={1}>{exam.title}</Text>
                    <Text style={styles.examMeta}>{exam.subject} · {exam.year}</Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: DIFF_COLOR[exam.difficulty] + '18', borderColor: DIFF_COLOR[exam.difficulty] + '40' }]}>
                    <Text style={[styles.diffText, { color: DIFF_COLOR[exam.difficulty] }]}>{DIFF_LABEL[exam.difficulty] ?? exam.difficulty}</Text>
                  </View>
                </View>
              </NeoCard>
            </TouchableOpacity>
          ))
        }
      </View>

      {/* Banner quiz */}
      <TouchableOpacity onPress={() => router.push('/(tabs)/quiz' as any)} style={styles.quizBanner}>
        <View>
          <Text style={styles.quizBannerTitle}>Lancer un quiz</Text>
          <Text style={styles.quizBannerSub}>Entraîne-toi avec des questions adaptées</Text>
        </View>
        <Text style={styles.quizArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ value, label, icon, color }: { value: string; label: string; icon: string; color: string }) {
  return (
    <NeoCard size="sm" style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  avatarSmall: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    ...neoRaised,
  },
  avatarSmallText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statSkeletonHalf: { width: '47%' },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: 16 },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  examCard: { marginBottom: 10, paddingVertical: 14 },
  examRow: { flexDirection: 'row', alignItems: 'center' },
  examInfo: { flex: 1, marginRight: 12 },
  examTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  examMeta: { fontSize: 12, color: colors.textMuted },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  diffText: { fontSize: 11, fontWeight: '700' },

  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: colors.textLight, fontSize: 14 },

  quizBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: 20, marginBottom: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  quizBannerTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: 4 },
  quizBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  quizArrow: { fontSize: 22, color: colors.white },
});
