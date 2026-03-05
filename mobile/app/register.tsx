import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { GradientButton } from '../components/GradientButton';
import { NeoCard } from '../components/NeoCard';
import { colors, radius, neoInset } from '../lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof typeof formData) => (text: string) =>
    setFormData((prev) => ({ ...prev, [field]: text }));

  const handleRegister = async () => {
    setError('');
    const { firstName, lastName, email, password } = formData;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setIsLoading(true);
    try {
      await register(formData);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Une erreur est survenue';
      setError(Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.orb} />

        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Pédja — Inscription</Text>
        </View>

        <Text style={styles.title}>Crée ton compte</Text>
        <Text style={styles.subtitle}>Rejoins des milliers d'élèves qui préparent leurs examens</Text>

        <NeoCard style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {[
            { field: 'firstName', label: 'Prénom', placeholder: 'Jean', keyboard: 'default' },
            { field: 'lastName', label: 'Nom', placeholder: 'Dupont', keyboard: 'default' },
            { field: 'email', label: 'Email', placeholder: 'jean@email.com', keyboard: 'email-address' },
            { field: 'password', label: 'Mot de passe', placeholder: '••••••••', keyboard: 'default', secure: true },
          ].map(({ field, label, placeholder, keyboard, secure }) => (
            <View key={field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={colors.textLight}
                value={formData[field as keyof typeof formData]}
                onChangeText={update(field as keyof typeof formData)}
                keyboardType={keyboard as any}
                autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
                autoCorrect={false}
                secureTextEntry={secure}
                editable={!isLoading}
              />
            </View>
          ))}

          <View style={{ height: 8 }} />
          <GradientButton label="Créer mon compte" onPress={handleRegister} loading={isLoading} variant="secondary" />
        </NeoCard>

        <TouchableOpacity onPress={() => router.push('/login')} disabled={isLoading}>
          <Text style={styles.link}>Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  orb: {
    position: 'absolute', top: 0, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: colors.secondary, opacity: 0.06,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(147,51,234,0.08)', borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.25)', borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 16,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.secondary },
  badgeText: { color: colors.secondaryDark, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textMuted, marginBottom: 28 },
  card: { marginBottom: 20 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', borderRadius: radius.md,
    padding: 12, marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14 },
  label: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  input: {
    ...neoInset, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 16,
    color: colors.text, fontSize: 15, marginBottom: 16,
  },
  link: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
  linkBold: { color: colors.secondary, fontWeight: '700' },
});
