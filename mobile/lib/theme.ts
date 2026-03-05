import { Platform, StyleSheet } from 'react-native';

export const colors = {
  background: '#e0e5ec',
  surface: '#e0e5ec',
  surfaceDeep: '#d1d9e6',   // inputs, pressed
  surfaceLight: '#eef1f5',  // subtle areas
  shadowDark: '#a3b1c6',
  shadowLight: '#ffffff',
  text: '#2d3748',
  textMuted: '#718096',
  textLight: '#a3b1c6',
  primary: '#00b4d8',       // cyan
  primaryDark: '#0077b6',
  secondary: '#9333ea',     // violet
  secondaryDark: '#7c22c5',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#ffffff',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const gradients = {
  primary: ['#00b4d8', '#0077b6'] as const,
  secondary: ['#9333ea', '#7c22c5'] as const,
  primaryToSecondary: ['#00b4d8', '#9333ea'] as const,
  ghost: ['#e8edf3', '#d1d9e6'] as const,
};

// Ombre neomorphique "raised" : cross-platform
export const neoRaised = Platform.select({
  ios: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  android: {
    elevation: 6,
  },
  default: {},
});

export const neoRaisedSm = Platform.select({
  ios: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

// Style inset simulé pour les inputs
export const neoInset = {
  backgroundColor: colors.surfaceDeep,
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderTopColor: '#b8c4d4',
  borderLeftColor: '#b8c4d4',
  borderBottomWidth: 1,
  borderRightWidth: 1,
  borderBottomColor: '#f0f3f8',
  borderRightColor: '#f0f3f8',
};

// Card neomorphique
export const neoCard = {
  backgroundColor: colors.surface,
  borderRadius: radius.xl,
  ...neoRaised,
};

export const neoCardSm = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  ...neoRaisedSm,
};
