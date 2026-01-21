// remotion/src/lib/fonts.ts
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadSpaceMono } from '@remotion/google-fonts/SpaceMono';

const dmSans = loadDMSans('normal', {
  weights: ['400', '500', '700'],
  subsets: ['latin'],
});

const spaceMono = loadSpaceMono('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
});

export const fonts = {
  heading: dmSans.fontFamily,
  mono: spaceMono.fontFamily,
} as const;
