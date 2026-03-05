import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { quizApi, examsApi } from '../../../lib/api';
import { quizStore } from '../../../lib/quiz-store';
import { GradientButton } from '../../../components/GradientButton';
import { NeoCard } from '../../../components/NeoCard';
import { colors, radius, gradients } from '../../../lib/theme';

const EXAM_TYPES = ['BAC', 'BEPC', 'CEP', 'CONCOURS_FP', 'Licence', 'Master'];
const TYPE_LABEL: Record<string, string> = { CONCOURS_FP: 'Concours' };
const MODES = [
  { value: 'PRACTICE', label: 'Entraînement', desc: 'Sans limite de temps', gradient: gradients.primary },
  { value: 'TIMED', label: 'Chronométré', desc: '30 minutes', gradient: gradients.secondary },
];
const LIMITS = [5, 10, 20];
const DIFFICULTIES = [
  { value: '', label: 'Tous' },
  { value: 'EASY', label: 'Facile' },
  { value: 'MEDIUM', label: 'Moyen' },
  { value: 'HARD', label: 'Difficile' },
  { value: 'EXPERT', label: 'Expert' },
];

export default function QuizConfigScreen() {
  const router = useRouter();
  const [examType, setExamType] = useState('BAC');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [mode, setMode] = useState<'PRACTICE' | 'TIMED'>('PRACTICE');
  const [limit, setLimit] = useState(10);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => { examsApi.getSubjects().then(setSubjects).catch(() => {}); }, []);

  const handleLaunch = async () => {
    setIsLaunching(true);
    quizStore.clear();
    try {
      const data = await quizApi.startAttempt({ examType, ...(subject ? { subject } : {}), ...(difficulty ? { difficulty } : {}), mode, limit });
      quizStore.setSession({ attemptId: data.attemptId, mode: data.mode, timeLimit: data.timeLimit, questions: data.questions, startedAt: Date.now() });
      router.push('/(tabs)/quiz/play');
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'Impossible de démarrer le quiz';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Quiz</Text>
      <Text style={styles.subtitle}>Configure ton entraînement</Text>

      <Section label="Type d'examen">
        <View style={styles.chips}>
          {EXAM_TYPES.map(t => (
            <Chip key={t} label={TYPE_LABEL[t] ?? t} active={examType === t} onPress={() => setExamType(t)} color={colors.primary} />
          ))}
        </View>
      </Section>

      {subjects.length > 0 && (
        <Section label="Matière (optionnel)">
          <View style={styles.chips}>
            <Chip label="Toutes" active={subject === ''} onPress={() => setSubject('')} color={colors.primary} />
            {subjects.slice(0, 10).map(s => (
              <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} color={colors.primary} />
            ))}
          </View>
        </Section>
      )}

      <Section label="Niveau">
        <View style={styles.chips}>
          {DIFFICULTIES.map(d => (
            <Chip key={d.value} label={d.label} active={difficulty === d.value} onPress={() => setDifficulty(d.value)} color={colors.primary} />
          ))}
        </View>
      </Section>

      <Section label="Mode">
        <View style={styles.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity key={m.value} style={[styles.modeCard, mode === m.value && styles.modeCardActive]} onPress={() => setMode(m.value as any)}>
              {mode === m.value ? (
                <LinearGradient colors={m.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              ) : null}
              <Text style={[styles.modeLabel, mode === m.value && styles.modeLabelActive]}>{m.label}</Text>
              <Text style={[styles.modeDesc, mode === m.value && styles.modeDescActive]}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section label="Nombre de questions">
        <View style={styles.chips}>
          {LIMITS.map(l => (
            <Chip key={l} label={`${l}`} active={limit === l} onPress={() => setLimit(l)} color={colors.primary} />
          ))}
        </View>
      </Section>

      <GradientButton
        label={isLaunching ? 'Démarrage...' : `Lancer le quiz (${limit} questions)`}
        onPress={handleLaunch}
        loading={isLaunching}
      />
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color, borderColor: color, shadowColor: color, shadowOpacity: 0.3 }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 28 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.shadowDark,
    shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2,
  },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeCard: {
    flex: 1, padding: 16, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.shadowDark,
    shadowColor: colors.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 3,
  },
  modeCardActive: { borderColor: 'transparent' },
  modeLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modeLabelActive: { color: colors.white },
  modeDesc: { fontSize: 12, color: colors.textMuted },
  modeDescActive: { color: 'rgba(255,255,255,0.8)' },
});
