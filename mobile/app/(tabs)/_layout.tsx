import { Tabs } from 'expo-router';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.shadowDark,
          borderTopWidth: 0.5,
          shadowColor: colors.shadowDark,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Accueil' }} />
      <Tabs.Screen name="exams" options={{ tabBarLabel: 'Examens' }} />
      <Tabs.Screen name="quiz" options={{ tabBarLabel: 'Quiz' }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: 'Profil' }} />
      <Tabs.Screen name="exams/[id]" options={{ href: null }} />
    </Tabs>
  );
}
