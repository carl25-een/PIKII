import { useColorScheme } from 'react-native';

const light = {
  bg: '#eef1ec',
  surface: '#ffffff',
  ink: '#15302a',
  muted: '#5d6f69',
  line: '#d7dfda',
  brand: '#0f5b4a',
  brandInk: '#ffffff',
  sun: '#f2b705',
  sunInk: '#1c1600',
  sunSoft: '#fff3c4',
  good: '#1d7a46',
  goodSoft: '#dff2e6',
  warn: '#a15c00',
  warnSoft: '#fdebd0',
  chip: '#e6ece8',
  danger: '#b3261e',
};

const dark: typeof light = {
  bg: '#0e1714',
  surface: '#16231f',
  ink: '#e6efe9',
  muted: '#9db0a9',
  line: '#2a3b35',
  brand: '#3fb08f',
  brandInk: '#08130f',
  sun: '#f5c632',
  sunInk: '#1c1600',
  sunSoft: '#3a3214',
  good: '#5ccf8a',
  goodSoft: '#163323',
  warn: '#f0a94a',
  warnSoft: '#3a2a12',
  chip: '#22332d',
  danger: '#f2b8b5',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
