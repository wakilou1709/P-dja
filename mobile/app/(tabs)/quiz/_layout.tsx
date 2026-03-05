import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F172A' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="play" options={{ gestureEnabled: false }} />
      <Stack.Screen name="results" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
