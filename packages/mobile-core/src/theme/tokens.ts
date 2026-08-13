/**
 * Mobil dizayn tokenlari — Lider Navoiy Manager vizual tili.
 * Primary violet `#6C5CE7` + gold `#E6963C`, yumshoq radius va og'ir tipografiya.
 */

import type { TextStyle, ViewStyle } from 'react-native';

export interface Palette {
  canvas: string;
  canvasAccent: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  line: string;
  lineStrong: string;

  content: string;
  contentSecondary: string;
  contentMuted: string;
  contentInverse: string;

  brand: string;
  brandStrong: string;
  brandSoft: string;
  brandContrast: string;
  accent: string;
  /** Lider oltin accent. */
  gold: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  /** Grafik va diagrammalar uchun ketma-ketlik. */
  chart: readonly string[];
  /** Soya rangi (RN'da alohida `shadowColor`). */
  shadow: string;
  overlay: string;
  /** Primary tugma / monogram soya. */
  brandGlow: string;
}

/** Hero banner gradient: violet → purple → gold. */
export const heroGradient = ['#5B2D8E', '#7C4DFF', '#E6963C'] as const;
export const brandGradient = ['#6C5CE7', '#7C4DFF'] as const;

export const lightPalette: Palette = {
  canvas: '#F8F9FC',
  canvasAccent: '#EDE9FF',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F2F8',
  surfaceRaised: '#FFFFFF',
  line: 'rgba(108,92,231,0.12)',
  lineStrong: 'rgba(108,92,231,0.22)',

  content: '#0D0D1A',
  contentSecondary: '#6B7280',
  contentMuted: '#9CA3AF',
  contentInverse: '#FFFFFF',

  brand: '#6C5CE7',
  brandStrong: '#7C4DFF',
  brandSoft: '#EDE9FF',
  brandContrast: '#FFFFFF',
  accent: '#9B59B6',
  gold: '#E6963C',

  success: '#00C853',
  successSoft: '#E6F9EE',
  warning: '#E6963C',
  warningSoft: '#FFF4E8',
  danger: '#F44336',
  dangerSoft: '#FDECEA',
  info: '#3B82F6',
  infoSoft: '#E8F1FE',

  chart: ['#6C5CE7', '#E6963C', '#00C853', '#7C4DFF', '#3B82F6', '#F44336'],
  shadow: '#5B2D8E',
  overlay: 'rgba(8, 8, 18, 0.5)',
  brandGlow: 'rgba(108,92,231,0.35)',
};

export const darkPalette: Palette = {
  canvas: '#080812',
  canvasAccent: '#1A1635',
  surface: '#13132A',
  surfaceMuted: '#1E1E38',
  surfaceRaised: '#1A1A36',
  line: 'rgba(150,130,255,0.15)',
  lineStrong: 'rgba(150,130,255,0.28)',

  content: '#F0EEFF',
  contentSecondary: '#9E9BC4',
  contentMuted: '#6B6B9A',
  contentInverse: '#080812',

  brand: '#6C5CE7',
  brandStrong: '#7C6FF0',
  brandSoft: '#1A1635',
  brandContrast: '#FFFFFF',
  accent: '#A66BFF',
  gold: '#E6963C',

  success: '#00E676',
  successSoft: '#0F2A1A',
  warning: '#E6963C',
  warningSoft: '#2A1C0A',
  danger: '#F44336',
  dangerSoft: '#2A1010',
  info: '#60A5FA',
  infoSoft: '#0F1A2E',

  chart: ['#7C6FF0', '#E6963C', '#00E676', '#A66BFF', '#60A5FA', '#F44336'],
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
  brandGlow: 'rgba(108,92,231,0.45)',
};

/** 4px shkala — barcha bo'shliqlar shundan olinadi. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/** Lider yumshoq radiuslari: control 16, card 18–20, hero 28. */
export const radius = {
  sm: 10,
  md: 13,
  lg: 16,
  xl: 20,
  '2xl': 24,
  hero: 28,
  pill: 999,
} as const;

/** Inter oilasi — Lider Manager APK dagi asosiy shrift (index.css). */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export type FontWeightKey = keyof typeof fonts;

export function fontForWeight(weight?: TextStyle['fontWeight'] | string): string {
  const w = String(weight ?? '400');
  if (w === '900' || w === 'black') return fonts.black;
  if (w === '800' || w === 'extraBold') return fonts.extraBold;
  if (w === '700' || w === 'bold') return fonts.bold;
  if (w === '600' || w === 'semiBold') return fonts.semiBold;
  if (w === '500' || w === 'medium') return fonts.medium;
  return fonts.regular;
}

/**
 * Inter weight fayllari bilan ishlash: weight faqat `fontFamily` orqali.
 * Androidda `Inter_700Bold` + `fontWeight: '700'` birga berilsa tizim
 * Roboto'siga tushib ketadi — Lider Managerdagi Inter ko'rinishi yo'qoladi.
 */
export function fontStyleForWeight(weight?: TextStyle['fontWeight'] | string): TextStyle {
  return {
    fontFamily: fontForWeight(weight),
    fontWeight: '400',
  };
}

/** Variant + weight bo'yicha to'liq matn stili (Lider tipografiya shkalasi). */
export function typeStyle(
  variant: keyof typeof typography,
  weight?: TextStyle['fontWeight'] | string,
): TextStyle {
  const base = typography[variant];
  return {
    fontSize: base.fontSize,
    lineHeight: base.lineHeight,
    letterSpacing: 'letterSpacing' in base ? base.letterSpacing : undefined,
    ...fontStyleForWeight(weight ?? base.fontWeight),
  };
}

/** Lider Manager og'irliklari: display 900, title 800, heading 700, body 400/600. */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '900' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const, letterSpacing: -0.1 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const, letterSpacing: -0.1 },
  caption: { fontSize: 11.5, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0 },
} as const;

export interface Elevation {
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  brand: ViewStyle;
}

/**
 * Yumshoq soyalar. Dark rejimda soya pasaytiriladi; brand tugma uchun alohida glow.
 */
export function createElevation(palette: Palette, scheme: 'light' | 'dark'): Elevation {
  const opacity = scheme === 'dark' ? 0.45 : 0.1;
  return {
    sm: {
      shadowColor: palette.shadow,
      shadowOpacity: opacity,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    md: {
      shadowColor: palette.shadow,
      shadowOpacity: opacity + 0.04,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    lg: {
      shadowColor: palette.shadow,
      shadowOpacity: opacity + 0.08,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    brand: {
      shadowColor: palette.brand,
      shadowOpacity: scheme === 'dark' ? 0.5 : 0.35,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  };
}

export type ToneName = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

/** Status indikatorlari uchun rang juftligi. */
export function toneColors(palette: Palette, tone: ToneName): { fg: string; bg: string } {
  switch (tone) {
    case 'brand':
      return { fg: palette.brand, bg: palette.brandSoft };
    case 'success':
      return { fg: palette.success, bg: palette.successSoft };
    case 'warning':
      return { fg: palette.warning, bg: palette.warningSoft };
    case 'danger':
      return { fg: palette.danger, bg: palette.dangerSoft };
    case 'info':
      return { fg: palette.info, bg: palette.infoSoft };
    case 'accent':
      return { fg: palette.gold, bg: palette.warningSoft };
    default:
      return { fg: palette.contentSecondary, bg: palette.surfaceMuted };
  }
}
