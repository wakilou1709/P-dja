import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientButton } from '../components/GradientButton';
import { colors, radius } from '../lib/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.orb} />

      <View style={styles.content}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Prépare tes examens</Text>
        </View>

        <Text style={styles.title}>Pédja</Text>
        <Text style={styles.subtitle}>
          La plateforme de référence pour réussir tes examens en Afrique de l'Ouest
        </Text>

        <View style={styles.actions}>
          <GradientButton label="Se connecter" onPress={() => router.push('/login')} />
          <View style={{ height: 12 }} />
          <GradientButton label="Créer un compte" onPress={() => router.push('/register')} variant="secondary" />
        </View>
      </View>

      <View style={styles.features}>
        {[
          { icon: '📚', label: 'Annales' },
          { icon: '🧠', label: 'Quiz adaptatifs' },
          { icon: '📊', label: 'Progression' },
        ].map((f) => (
          <View key={f.label} style={styles.feature}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  orb: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.07,
  },
  content: { marginBottom: 48 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,180,216,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,180,216,0.25)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  badgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 52, fontWeight: '800', color: colors.text, marginBottom: 12, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: colors.textMuted, lineHeight: 24, marginBottom: 36 },
  actions: {},
  features: { flexDirection: 'row', gap: 8 },
  feature: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: { fontSize: 22, marginBottom: 6 },
  featureLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center', fontWeight: '500' },
});
