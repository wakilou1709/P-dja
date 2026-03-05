import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { quizStore, QuizResult } from '../../../lib/quiz-store';
import { GradientButton } from '../../../components/GradientButton';
import { NeoCard } from '../../../components/NeoCard';
import { colors, radius, gradients } from '../../../lib/theme';

export default function QuizResultsScreen() {
  const router = useRouter();
  const result = quizStore.getResult();

  useEffect(() => { if (!result) router.replace('/(tabs)/quiz'); }, []);
  if (!result) return null;

  const { score, correctAnswers, wrongAnswers, skippedQuestions, totalQuestions, isPassed, questionsWithAnswers, weakAreas, xpGained } = result;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score card */}
      <NeoCard accent={isPassed ? 'cyan' : 'none'} style={styles.scoreCard}>
        <Text style={styles.scoreEmoji}>{isPassed ? '🎉' : '💪'}</Text>
        <Text style={[styles.scoreValue, { color: isPassed ? colors.primary : colors.textMuted }]}>{score}%</Text>
        <Text style={[styles.scoreLabel, { color: isPassed ? colors.primaryDark : colors.textMuted }]}>
          {isPassed ? 'Réussi !' : 'Continue à t\'entraîner'}
        </Text>
        <LinearGradient colors={gradients.primaryToSecondary} style={styles.xpBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.xpText}>+{xpGained} XP</Text>
        </LinearGradient>
      </NeoCard>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatPill value={correctAnswers} label="Correctes" color={colors.success} />
        <StatPill value={wrongAnswers} label="Incorrectes" color={colors.error} />
        <StatPill value={skippedQuestions} label="Passées" color={colors.warning} />
      </View>

      {/* Zones faibles */}
      {weakAreas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points à revoir</Text>
          <View style={styles.weakRow}>
            {weakAreas.map(area => (
              <View key={area} style={styles.weakChip}>
                <Text style={styles.weakChipText}>{area}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Correction */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Correction ({totalQuestions} questions)</Text>
        {questionsWithAnswers.map((q, i) => <QuestionReview key={q.id} q={q} index={i + 1} />)}
      </View>

      <GradientButton label="Nouveau quiz" onPress={() => { quizStore.clear(); router.replace('/(tabs)/quiz'); }} />
    </ScrollView>
  );
}

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <NeoCard size="sm" style={styles.statPill}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </NeoCard>
  );
}

function QuestionReview({ q, index }: { q: QuizResult['questionsWithAnswers'][0]; index: number }) {
  const statusColor = q.isSkipped ? colors.warning : q.isCorrect ? colors.success : colors.error;
  const statusIcon = q.isSkipped ? '→' : q.isCorrect ? '✓' : '✗';

  return (
    <NeoCard size="sm" style={[styles.reviewCard, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewIcon, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.reviewIconText, { color: statusColor }]}>{statusIcon}</Text>
        </View>
        <Text style={styles.reviewNum}>Q{index}</Text>
      </View>
      <Text style={styles.reviewQuestion}>{q.content}</Text>
      {!q.isSkipped && (
        <View style={styles.reviewAnswerRow}>
          <Text style={styles.reviewAnswerLabel}>Ta réponse :</Text>
          <Text style={[styles.reviewAnswerText, { color: q.isCorrect ? colors.success : colors.error }]}>{q.userAnswer || '—'}</Text>
        </View>
      )}
      {(!q.isCorrect || q.isSkipped) && (
        <View style={styles.reviewAnswerRow}>
          <Text style={styles.reviewAnswerLabel}>Bonne réponse :</Text>
          <Text style={[styles.reviewAnswerText, { color: colors.success }]}>{q.correctAnswer}</Text>
        </View>
      )}
      {q.explanation && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationLabel}>Explication</Text>
          <Text style={styles.explanationText}>{q.explanation}</Text>
        </View>
      )}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  scoreCard: { alignItems: 'center', paddingVertical: 28, marginBottom: 20 },
  scoreEmoji: { fontSize: 40, marginBottom: 8 },
  scoreValue: { fontSize: 60, fontWeight: '900', lineHeight: 68 },
  scoreLabel: { fontSize: 17, fontWeight: '600', marginTop: 4 },
  xpBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.full, marginTop: 14 },
  xpText: { color: colors.white, fontSize: 14, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },

  weakRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weakChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  weakChipText: { color: colors.error, fontSize: 13, fontWeight: '600' },

  reviewCard: { marginBottom: 12, overflow: 'hidden' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reviewIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewIconText: { fontSize: 14, fontWeight: '800' },
  reviewNum: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  reviewQuestion: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: 10 },
  reviewAnswerRow: { flexDirection: 'row', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  reviewAnswerLabel: { fontSize: 13, color: colors.textMuted },
  reviewAnswerText: { fontSize: 13, fontWeight: '700', flex: 1 },
  explanationBox: { backgroundColor: colors.surfaceDeep, borderRadius: 8, padding: 10, marginTop: 8 },
  explanationLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: '700' },
  explanationText: { fontSize: 13, color: colors.text, lineHeight: 19 },
});
