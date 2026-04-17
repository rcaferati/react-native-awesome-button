/* eslint-disable no-bitwise */

import type { ThemeButtonStyle } from '../types';

type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const COLOR_STYLE_KEYS = [
  'activityColor',
  'backgroundActive',
  'backgroundColor',
  'backgroundDarker',
  'backgroundPlaceholder',
  'backgroundProgress',
  'backgroundShadow',
  'borderColor',
  'textColor',
] as const satisfies ReadonlyArray<keyof ThemeButtonStyle>;

const HEX_REGEX = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB_REGEX =
  /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i;

const clampChannel = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const clampAlpha = (value: number) =>
  Math.max(0, Math.min(1, Number(value.toFixed(3))));

const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

const parseHexColor = (value: string): ParsedColor | null => {
  if (!HEX_REGEX.test(value)) {
    return null;
  }

  let normalized = value.slice(1);

  if (normalized.length === 3 || normalized.length === 4) {
    normalized = normalized
      .split('')
      .map((token) => `${token}${token}`)
      .join('');
  }

  if (normalized.length === 6) {
    normalized = `${normalized}ff`;
  }

  const number = Number.parseInt(normalized, 16);

  if (Number.isNaN(number)) {
    return null;
  }

  return {
    r: (number >>> 24) & 255,
    g: (number >>> 16) & 255,
    b: (number >>> 8) & 255,
    a: clampAlpha((number & 255) / 255),
  };
};

const parseRgbColor = (value: string): ParsedColor | null => {
  const match = value.match(RGB_REGEX);

  if (!match) {
    return null;
  }

  return {
    r: clampChannel(Number(match[1])),
    g: clampChannel(Number(match[2])),
    b: clampChannel(Number(match[3])),
    a: match[4] === undefined ? 1 : clampAlpha(Number(match[4])),
  };
};

const parseColor = (value: string): ParsedColor | null => {
  if (value[0] === '#') {
    return parseHexColor(value);
  }

  if (value.startsWith('rgb')) {
    return parseRgbColor(value);
  }

  return null;
};

const toHex = ({ r, g, b, a }: ParsedColor, includeAlpha: boolean) => {
  const channels = [r, g, b].map((value) =>
    clampChannel(value).toString(16).padStart(2, '0')
  );

  if (!includeAlpha) {
    return `#${channels.join('')}`;
  }

  return `#${channels.join('')}${Math.round(clampAlpha(a) * 255)
    .toString(16)
    .padStart(2, '0')}`;
};

const toRgb = ({ r, g, b, a }: ParsedColor, includeAlpha: boolean) => {
  const channels = `${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}`;

  if (!includeAlpha) {
    return `rgb(${channels})`;
  }

  return `rgba(${channels}, ${clampAlpha(a)})`;
};

export const interpolateColors = (
  startColor?: string,
  endColor?: string,
  progress = 1
): string | undefined => {
  if (typeof endColor !== 'string') {
    return endColor;
  }

  if (typeof startColor !== 'string') {
    return endColor;
  }

  const safeProgress = clampProgress(progress);

  if (safeProgress === 0) {
    return startColor;
  }

  if (safeProgress === 1) {
    return endColor;
  }

  const start = parseColor(startColor);
  const end = parseColor(endColor);

  if (!start || !end) {
    return endColor;
  }

  const result = {
    r: start.r + (end.r - start.r) * safeProgress,
    g: start.g + (end.g - start.g) * safeProgress,
    b: start.b + (end.b - start.b) * safeProgress,
    a: clampAlpha(start.a + (end.a - start.a) * safeProgress),
  };
  const includeAlpha = start.a !== 1 || end.a !== 1;
  const useRgbOutput =
    startColor.startsWith('rgb') || endColor.startsWith('rgb');

  return useRgbOutput
    ? toRgb(result, includeAlpha)
    : toHex(result, includeAlpha);
};

export const interpolateThemeButtonStyle = (
  from: ThemeButtonStyle,
  to: ThemeButtonStyle,
  progress = 1
): ThemeButtonStyle => {
  const nextStyle: ThemeButtonStyle = { ...to };

  COLOR_STYLE_KEYS.forEach((key) => {
    nextStyle[key] = interpolateColors(from[key], to[key], progress);
  });

  return nextStyle;
};

export default function blendColors(
  percentage: number,
  startColor: string,
  endColor?: string,
  linear = false
): string | undefined {
  if (typeof percentage !== 'number' || percentage < -1 || percentage > 1) {
    return undefined;
  }

  const start = parseColor(startColor);

  if (!start) {
    return undefined;
  }

  const useRgbOutput =
    endColor === 'c'
      ? !startColor.startsWith('rgb')
      : startColor.startsWith('rgb');
  const blendTarget =
    endColor && endColor !== 'c'
      ? parseColor(endColor)
      : percentage < 0
      ? { r: 0, g: 0, b: 0, a: 1 }
      : { r: 255, g: 255, b: 255, a: 1 };

  if (!blendTarget) {
    return undefined;
  }

  const ratio = Math.abs(percentage);
  const inverse = 1 - ratio;
  const mix = (startValue: number, targetValue: number) =>
    linear
      ? inverse * startValue + ratio * targetValue
      : Math.sqrt(
          inverse * startValue * startValue + ratio * targetValue * targetValue
        );
  const alpha =
    start.a === 1 && blendTarget.a === 1
      ? 1
      : clampAlpha(inverse * start.a + ratio * blendTarget.a);
  const result = {
    r: mix(start.r, blendTarget.r),
    g: mix(start.g, blendTarget.g),
    b: mix(start.b, blendTarget.b),
    a: alpha,
  };
  const includeAlpha = start.a !== 1 || blendTarget.a !== 1;

  return useRgbOutput
    ? toRgb(result, includeAlpha)
    : toHex(result, includeAlpha);
}
