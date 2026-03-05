import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { examsApi } from '../../../lib/api';
import { Skeleton } from '../../../components/Skeleton';
import { NeoCard } from '../../../components/NeoCard';
import { GradientButton } from '../../../components/GradientButton';
import { colors, radius, gradients } from '../../../lib/theme';

interface ExamSection {
  id: string; title: string; points?: number; preamble?: string;
  questions: Array<{ id: string; number: string | number; text: string; points?: number; subQuestions?: Array<{ id: string; number: string; text: string; points?: number }> }>;
}
interface Exam {
  id: string; title: string; subject: string; examType: string;
  year: number; difficulty: string; series?: string;
  content?: { instructions?: string; totalPoints?: number; duration?: string; sections?: ExamSection[] };
}

const DIFF_COLOR: Record<string, string> = { EASY: '#10B981', MEDIUM: '#F59E0B', HARD: '#EF4444', EXPERT: '#9333ea' };
const DIFF_LABEL: Record<string, string> = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile', EXPERT: 'Expert' };

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    examsApi.getById(id)
      .then(setExam)
      .catch(() => Alert.alert('Erreur', 'Impossible de charger cet examen'))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{isLoading ? '...' : exam?.title}</Text>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Skeleton height={28} width="70%" style={{ marginBottom: 12 }} />
          <Skeleton height={20} width="50%" style={{ marginBottom: 24 }} />
          {[1, 2].map(i => <Skeleton key={i} height={120} borderRadius={16} style={{ marginBottom: 16 }} />)}
        </ScrollView>
      ) : exam ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.examTitle}>{exam.title}</Text>

          <View style={styles.metaRow}>
            <MetaBadge label={exam.examType} />
            <MetaBadge label={exam.subject} />
            {exam.series && <MetaBadge label={`Série ${exam.series}`} />}
            <MetaBadge label={String(exam.year)} />
            <MetaBadge label={DIFF_LABEL[exam.difficulty] ?? exam.difficulty} color={DIFF_COLOR[exam.difficulty]} />
          </View>

          {exam.content?.instructions && (
            <NeoCard accent="cyan" style={styles.instructionsCard}>
              <Text style={styles.cardLabel}>Consignes</Text>
              <Text style={styles.instructionsText}>{exam.content.instructions}</Text>
              {exam.content.duration && <Text style={styles.metaInfo}>Durée : {exam.content.duration}</Text>}
              {exam.content.totalPoints && <Text style={styles.metaInfo}>Total : {exam.content.totalPoints} pts</Text>}
            </NeoCard>
          )}

          {exam.content?.sections?.map(section => (
            <NeoCard key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.points && <Text style={styles.sectionPoints}>{section.points} pts</Text>}
              </View>
              {section.preamble && <Text style={styles.preamble}>{section.preamble}</Text>}
              {section.questions.map(q => (
                <View key={q.id} style={styles.question}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionNum}>{q.number}.</Text>
                    {q.points && <Text style={styles.questionPts}>{q.points} pts</Text>}
                  </View>
                  <Text style={styles.questionText}>{q.text}</Text>
                  {q.subQuestions?.map(sq => (
                    <View key={sq.id} style={styles.subQ}>
                      <Text style={styles.subQNum}>{sq.number}</Text>
                      <Text style={styles.subQText}>{sq.text}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </NeoCard>
          ))}

          {!exam.content?.sections?.length && (
            <NeoCard style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                Le contenu structuré de cet examen n'est pas encore disponible.
              </Text>
            </NeoCard>
          )}

          <View style={{ height: 16 }} />
          <GradientButton label="S'entraîner avec des questions" onPress={() => router.push('/(tabs)/quiz' as any)} />
        </ScrollView>
      ) : (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Examen introuvable</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.primary, marginTop: 12, fontWeight: '600' }}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function MetaBadge({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[styles.metaBadge, color ? { backgroundColor: color + '18', borderColor: color + '44' } : {}]}>
      <Text style={[styles.metaBadgeText, color ? { color } : {}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.shadowDark,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, shadowColor: colors.shadowDark,
    shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 3,
  },
  backArrow: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  content: { padding: 20, paddingBottom: 40 },
  examTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  metaBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: colors.surfaceDeep, borderWidth: 1, borderColor: colors.shadowDark,
  },
  metaBadgeText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  instructionsCard: { marginBottom: 16 },
  cardLabel: {
    fontSize: 11, fontWeight: '800', color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10,
  },
  instructionsText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  metaInfo: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  sectionCard: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, flex: 1 },
  sectionPoints: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  preamble: { color: colors.textMuted, fontSize: 13, lineHeight: 21, marginBottom: 12, fontStyle: 'italic' },
  question: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.surfaceDeep },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  questionNum: { fontSize: 13, fontWeight: '800', color: colors.primary },
  questionPts: { fontSize: 12, color: colors.textLight },
  questionText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  subQ: { flexDirection: 'row', marginTop: 8, paddingLeft: 14 },
  subQNum: { fontSize: 13, fontWeight: '600', color: colors.textMuted, width: 28 },
  subQText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 20 },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textMuted, fontSize: 16 },
});
