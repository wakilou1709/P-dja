import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { quizApi } from '../../../lib/api';
import { quizStore, QuizAnswer } from '../../../lib/quiz-store';
import { GradientButton } from '../../../components/GradientButton';
import { NeoCard } from '../../../components/NeoCard';
import { colors, radius, neoInset, gradients } from '../../../lib/theme';

export default function QuizPlayScreen() {
  const router = useRouter();
  const session = quizStore.getSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(session?.timeLimit ? session.timeLimit * 60 : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timePerQuestion = useRef<Record<string, number>>({});

  useEffect(() => { if (!session) router.replace('/(tabs)/quiz'); }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { confirmQuit(); return true; });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) { if (secondsLeft === 0) doSubmit(); return; }
    const t = setTimeout(() => setSecondsLeft(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  if (!session) return null;

  const { questions, attemptId } = session;
  const question = questions[currentIndex];
  const total = questions.length;
  const isLast = currentIndex === total - 1;
  const answeredCount = Object.keys(answers).length;
  const progress = (currentIndex + 1) / total;

  const recordTime = () => {
    const now = Date.now();
    const spent = Math.round((now - questionStartedAt) / 1000);
    timePerQuestion.current[question.id] = (timePerQuestion.current[question.id] ?? 0) + spent;
    setQuestionStartedAt(now);
  };

  const goNext = () => { recordTime(); setCurrentIndex(i => i + 1); };
  const goPrev = () => { recordTime(); setCurrentIndex(i => i - 1); };
  const selectAnswer = (qId: string, ans: string) => setAnswers(prev => ({ ...prev, [qId]: ans }));

  const confirmQuit = () => Alert.alert('Quitter ?', 'Ta progression sera perdue.', [
    { text: 'Continuer', style: 'cancel' },
    { text: 'Quitter', style: 'destructive', onPress: () => { quizStore.clear(); router.replace('/(tabs)/quiz'); } },
  ]);

  const handleSubmit = async () => {
    if (answeredCount < total) {
      Alert.alert('Questions non répondues', `${answeredCount}/${total} répondues. Terminer quand même ?`, [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Terminer', onPress: doSubmit },
      ]);
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    setIsSubmitting(true);
    recordTime();
    const payload: QuizAnswer[] = questions.map(q => ({ questionId: q.id, answer: answers[q.id] ?? '', timeSpent: timePerQuestion.current[q.id] ?? 0 }));
    try {
      const result = await quizApi.submitAttempt(attemptId, { answers: payload });
      quizStore.setResult(result);
      router.replace('/(tabs)/quiz/results');
    } catch (error: any) {
      Alert.alert('Erreur', error?.response?.data?.message ?? 'Erreur lors de la soumission');
    } finally { setIsSubmitting(false); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={confirmQuit} style={styles.quitBtn}>
          <Text style={styles.quitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.counter}>{currentIndex + 1} / {total}</Text>
          <Text style={styles.answeredHint}>{answeredCount} répondu{answeredCount > 1 ? 's' : ''}</Text>
        </View>
        {secondsLeft !== null ? (
          <View style={[styles.timerBadge, secondsLeft < 60 && styles.timerUrgent]}>
            <Text style={[styles.timerText, secondsLeft < 60 && styles.timerTextUrgent]}>{formatTime(secondsLeft)}</Text>
          </View>
        ) : <View style={{ width: 64 }} />}
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBg}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Question */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.diffBadge}>
          <Text style={styles.diffText}>{question.difficulty}</Text>
        </View>
        <Text style={styles.questionText}>{question.content}</Text>

        {question.type === 'MULTIPLE_CHOICE' && question.options && (
          <OptionsSelector options={question.options} selected={answers[question.id]} onSelect={a => selectAnswer(question.id, a)} />
        )}
        {question.type === 'TRUE_FALSE' && (
          <TrueFalseSelector selected={answers[question.id]} onSelect={a => selectAnswer(question.id, a)} />
        )}
        {(question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') && (
          <TextInput
            style={styles.textAnswer}
            placeholder="Tape ta réponse ici..."
            placeholderTextColor={colors.textLight}
            value={answers[question.id] ?? ''}
            onChangeText={t => selectAnswer(question.id, t)}
            multiline={question.type === 'ESSAY'}
            numberOfLines={question.type === 'ESSAY' ? 5 : 1}
          />
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]} onPress={goPrev} disabled={currentIndex === 0}>
          <Text style={styles.navBtnText}>← Préc.</Text>
        </TouchableOpacity>
        {isLast ? (
          <View style={styles.submitWrap}>
            <GradientButton label="Terminer" onPress={handleSubmit} loading={isSubmitting} style={{ paddingVertical: 0 }} />
          </View>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={goNext}>
            <Text style={styles.navBtnText}>Suiv. →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function OptionsSelector({ options, selected, onSelect }: { options: string[]; selected: string | undefined; onSelect: (a: string) => void }) {
  const labels = ['A', 'B', 'C', 'D', 'E'];
  return (
    <View style={optStyles.options}>
      {options.map((opt, i) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity key={i} style={[optStyles.optBtn, isSelected && optStyles.optBtnSelected]} onPress={() => onSelect(opt)}>
            <View style={[optStyles.optLabel, isSelected && optStyles.optLabelSelected]}>
              <Text style={[optStyles.optLabelText, isSelected && optStyles.optLabelTextSelected]}>{labels[i] ?? i + 1}</Text>
            </View>
            <Text style={[optStyles.optText, isSelected && optStyles.optTextSelected]} numberOfLines={3}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TrueFalseSelector({ selected, onSelect }: { selected: string | undefined; onSelect: (a: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {['Vrai', 'Faux'].map(v => {
        const active = selected === v;
        return (
          <TouchableOpacity key={v} style={[optStyles.tfBtn, active && optStyles.tfBtnActive]} onPress={() => onSelect(v)}>
            {active && <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} />}
            <Text style={[optStyles.tfText, active && optStyles.tfTextActive]}>{v}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
  },
  quitBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 3,
  },
  quitText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  headerCenter: { alignItems: 'center' },
  counter: { fontSize: 16, fontWeight: '800', color: colors.text },
  answeredHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  timerBadge: {
    backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2,
  },
  timerUrgent: { backgroundColor: '#FEE2E2' },
  timerText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  timerTextUrgent: { color: colors.error },
  progressBg: { height: 4, backgroundColor: colors.surfaceDeep, marginHorizontal: 20 },
  progressFill: { height: 4, borderRadius: 2 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 8 },
  diffBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,180,216,0.1)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
    borderWidth: 1, borderColor: 'rgba(0,180,216,0.3)', marginBottom: 14,
  },
  diffText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  questionText: { fontSize: 17, color: colors.text, lineHeight: 26, marginBottom: 24 },
  textAnswer: {
    ...neoInset, borderRadius: radius.md, padding: 16,
    color: colors.text, fontSize: 15, textAlignVertical: 'top', minHeight: 56,
  },
  footer: {
    flexDirection: 'row', gap: 10, padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: colors.shadowDark, backgroundColor: colors.surface,
  },
  navBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center',
    shadowColor: colors.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 3,
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  submitWrap: { flex: 2 },
});

const optStyles = StyleSheet.create({
  options: { gap: 10 },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.shadowDark,
    borderRadius: radius.md, padding: 14,
    shadowColor: colors.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 3,
  },
  optBtnSelected: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3 },
  optLabel: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.shadowDark,
  },
  optLabelSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optLabelText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  optLabelTextSelected: { color: colors.white },
  optText: { flex: 1, color: colors.text, fontSize: 15 },
  optTextSelected: { color: colors.primaryDark, fontWeight: '600' },
  tfBtn: {
    flex: 1, paddingVertical: 20, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.shadowDark, alignItems: 'center',
    shadowColor: colors.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 3,
  },
  tfBtnActive: { borderColor: 'transparent' },
  tfText: { fontSize: 18, fontWeight: '800', color: colors.textMuted },
  tfTextActive: { color: colors.white },
});
