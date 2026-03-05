import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { neoCard, neoCardSm, colors } from '../lib/theme';

interface NeoCardProps {
  children: ReactNode;
  style?: ViewStyle;
  size?: 'sm' | 'md';
  accent?: 'cyan' | 'purple' | 'none';
  padding?: number;
}

export function NeoCard({ children, style, size = 'md', accent = 'none', padding = 20 }: NeoCardProps) {
  const base = size === 'sm' ? neoCardSm : neoCard;
  const accentStyle = accent !== 'none' ? {
    borderTopWidth: 3,
    borderTopColor: accent === 'cyan' ? colors.primary : colors.secondary,
  } : {};

  return (
    <View style={[base, { padding }, accentStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({});
