import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { NeoCard } from '../../components/NeoCard';
import { colors, radius, neoRaised, gradients } from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try { await logout(); router.replace('/'); }
          finally { setIsLoggingOut(false); }
        },
      },
    ]);
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon profil</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar + nom */}
        <View style={styles.avatarWrapper}>
          <LinearGradient colors={gradients.primaryToSecondary} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
        </View>
        <Text style={styles.fullName}>{user ? `${user.firstName} ${user.lastName}` : '—'}</Text>
        <Text style={styles.email}>{user?.email ?? '—'}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatPill value={user?.points ?? 0} label="Points" color={colors.primary} />
          <StatPill value={user?.level ?? 1} label="Niveau" color={colors.secondary} />
          <StatPill value={user?.streak ?? 0} label="Série" color="#F59E0B" />
        </View>

        {/* Info card */}
        <NeoCard accent="cyan" style={styles.infoCard}>
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Rôle" value={user?.role ?? '—'} />
        </NeoCard>

        {/* Déconnexion */}
        <TouchableOpacity
          style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut
            ? <ActivityIndicator color={colors.error} />
            : <Text style={styles.logoutText}>Déconnexion</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  content: { padding: 20, alignItems: 'center' },

  avatarWrapper: { ...neoRaised, borderRadius: 44, marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.white },
  fullName: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  email: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  infoCard: { width: '100%', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceDeep },
  rowLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },

  logoutBtn: {
    width: '100%', paddingVertical: 15, borderRadius: radius.md,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center',
  },
  logoutBtnDisabled: { opacity: 0.5 },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '700' },
});
