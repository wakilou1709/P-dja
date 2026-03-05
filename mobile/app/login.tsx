import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { GradientButton } from '../components/GradientButton';
import { NeoCard } from '../components/NeoCard';
import { colors, radius, neoInset } from '../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Email ou mot de passe incorrect';
      setError(Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Orbe */}
        <View style={styles.orb} />

        {/* Badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Pédja — Connexion</Text>
        </View>

        <Text style={styles.title}>Bon retour !</Text>
        <Text style={styles.subtitle}>Connecte-toi pour continuer ton apprentissage</Text>

        <NeoCard style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="ton@email.com"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <View style={{ height: 8 }} />
          <GradientButton label="Se connecter" onPress={handleLogin} loading={isLoading} />
        </NeoCard>

        <TouchableOpacity onPress={() => router.push('/register')} disabled={isLoading}>
          <Text style={styles.link}>Pas de compte ? <Text style={styles.linkBold}>S'inscrire</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  orb: {
    position: 'absolute',
    top: 0,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
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
    marginBottom: 16,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  badgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textMuted, marginBottom: 28 },
  card: { marginBottom: 20 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    ...neoInset,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
  },
  link: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
  linkBold: { color: colors.primary, fontWeight: '700' },
});
