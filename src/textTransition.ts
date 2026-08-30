import Graphemer from 'graphemer';
import { cancelFrame, requestFrame, type FrameHandle } from './frameLoop';

type TextTransitionOptions = {
  fromText: string;
  targetText: string;
  onUpdate: (value: string) => void;
  onComplete?: () => void;
  onTick?: (elapsedMs: number, timeline: TextTransitionTimeline) => void;
  random?: () => number;
  slotStaggerMs?: number;
};

type TextTransitionController = {
  stop: () => void;
};

type TextTransitionTimeline = {
  sourceLength: number;
  targetLength: number;
  maxLength: number;
  slotStaggerMs: number;
  lastSourceRandomizeStartMs: number;
  lastRandomizeStartMs: number;
  collapseStartMs: number;
  totalDurationMs: number;
};

const graphemeSplitter = new Graphemer();

const NARROW_LOWERCASE_LETTERS = 'iljtfr';
const AVERAGE_LOWERCASE_LETTERS = 'acesuvxznhok';
const WIDE_LOWERCASE_LETTERS = 'mwdbpqgy';
const NARROW_UPPERCASE_LETTERS = NARROW_LOWERCASE_LETTERS.toUpperCase();
const AVERAGE_UPPERCASE_LETTERS = AVERAGE_LOWERCASE_LETTERS.toUpperCase();
const WIDE_UPPERCASE_LETTERS = WIDE_LOWERCASE_LETTERS.toUpperCase();
const DIGITS = '0123456789';
const SYMBOLS = '#%&^+=-';

export const TEXT_TRANSITION_SLOT_STAGGER_MS = 7;
export const TEXT_TRANSITION_RANDOMIZE_START_STAGGER_MS =
  TEXT_TRANSITION_SLOT_STAGGER_MS;
export const TEXT_TRANSITION_EXPAND_STAGGER_MS =
  TEXT_TRANSITION_SLOT_STAGGER_MS;
export const TEXT_TRANSITION_POST_RANDOMIZE_HOLD_MS = 10;
export const TEXT_TRANSITION_COLLAPSE_STAGGER_MS =
  TEXT_TRANSITION_SLOT_STAGGER_MS;
export const TEXT_TRANSITION_REFRESH_MS = 16;

const normalizeSlotStaggerMs = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export const splitTextGraphemes = (value: string) =>
  graphemeSplitter.splitGraphemes(value);

const isWhitespace = (grapheme: string) => /^\s+$/u.test(grapheme);

export const getTextTransitionRandomizeStartMs = (
  index: number,
  sourceLength: number,
  targetLength: number,
  slotStaggerMs = TEXT_TRANSITION_SLOT_STAGGER_MS
) => {
  if (index < 0 || index >= Math.max(sourceLength, targetLength)) {
    return null;
  }
  return index * normalizeSlotStaggerMs(slotStaggerMs);
};

export const getTextTransitionTimeline = (
  fromText: string,
  targetText: string,
  slotStaggerMs = TEXT_TRANSITION_SLOT_STAGGER_MS
): TextTransitionTimeline => {
  const sourceLength = splitTextGraphemes(fromText).length;
  const targetLength = splitTextGraphemes(targetText).length;
  const maxLength = Math.max(sourceLength, targetLength);
  const stagger = normalizeSlotStaggerMs(slotStaggerMs);
  const lastSourceRandomizeStartMs =
    sourceLength > 0 ? (sourceLength - 1) * stagger : 0;
  const lastRandomizeStartMs = maxLength > 0 ? (maxLength - 1) * stagger : 0;
  const collapseStartMs =
    lastRandomizeStartMs + TEXT_TRANSITION_POST_RANDOMIZE_HOLD_MS;
  const totalDurationMs =
    maxLength === 0 ? 0 : collapseStartMs + (maxLength - 1) * stagger;

  return {
    sourceLength,
    targetLength,
    maxLength,
    slotStaggerMs: stagger,
    lastSourceRandomizeStartMs,
    lastRandomizeStartMs,
    collapseStartMs,
    totalDurationMs,
  };
};

const getCollapseOrder = (index: number, timeline: TextTransitionTimeline) => {
  if (timeline.targetLength >= timeline.sourceLength) return index;

  const extraCount = timeline.sourceLength - timeline.targetLength;
  if (index >= timeline.targetLength) {
    return Math.max(0, timeline.sourceLength - 1 - index);
  }
  return extraCount + index;
};

export const getTextTransitionCollapseMs = (
  index: number,
  timeline: TextTransitionTimeline
) =>
  timeline.collapseStartMs +
  getCollapseOrder(index, timeline) * timeline.slotStaggerMs;

export const getTextTransitionCharset = (grapheme: string) => {
  if (isWhitespace(grapheme)) return null;
  if (grapheme.length === 1 && DIGITS.includes(grapheme)) return DIGITS;
  if (grapheme.length === 1 && SYMBOLS.includes(grapheme)) return SYMBOLS;
  if (NARROW_LOWERCASE_LETTERS.includes(grapheme)) {
    return NARROW_LOWERCASE_LETTERS;
  }
  if (AVERAGE_LOWERCASE_LETTERS.includes(grapheme)) {
    return AVERAGE_LOWERCASE_LETTERS;
  }
  if (WIDE_LOWERCASE_LETTERS.includes(grapheme)) {
    return WIDE_LOWERCASE_LETTERS;
  }
  if (NARROW_UPPERCASE_LETTERS.includes(grapheme)) {
    return NARROW_UPPERCASE_LETTERS;
  }
  if (AVERAGE_UPPERCASE_LETTERS.includes(grapheme)) {
    return AVERAGE_UPPERCASE_LETTERS;
  }
  if (WIDE_UPPERCASE_LETTERS.includes(grapheme)) {
    return WIDE_UPPERCASE_LETTERS;
  }
  return null;
};

export const getRandomTransitionCharacter = (
  grapheme: string,
  random: () => number = Math.random
) => {
  const charset = getTextTransitionCharset(grapheme);
  if (!charset) return grapheme;

  const randomValue = random();
  const safeValue = Number.isFinite(randomValue)
    ? Math.max(0, Math.min(0.9999999999999999, randomValue))
    : 0;
  return charset.charAt(Math.floor(safeValue * charset.length));
};

const buildFrame = (
  source: string[],
  target: string[],
  timeline: TextTransitionTimeline,
  elapsedMs: number,
  random: () => number
) => {
  if (source.length === 0 || source.join('') === target.join('')) {
    return target.join('');
  }
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed >= timeline.totalDurationMs) return target.join('');

  return Array.from({ length: timeline.maxLength }, (_, index) => {
    const randomizeStartMs = index * timeline.slotStaggerMs;
    const collapseMs = getTextTransitionCollapseMs(index, timeline);
    const sourceCharacter = source[index] ?? '';
    const targetCharacter = target[index] ?? '';
    const randomSourceCharacter =
      index < source.length ? sourceCharacter : targetCharacter;

    if (elapsed < randomizeStartMs) return sourceCharacter;
    if (elapsed >= collapseMs) return targetCharacter;
    return getRandomTransitionCharacter(randomSourceCharacter, random);
  }).join('');
};

export const buildTextTransitionFrame = (
  fromText: string,
  targetText: string,
  elapsedMs: number,
  random: () => number = Math.random
) => {
  const source = splitTextGraphemes(fromText);
  const target = splitTextGraphemes(targetText);
  return buildFrame(
    source,
    target,
    getTextTransitionTimeline(fromText, targetText),
    elapsedMs,
    random
  );
};

export const buildTextTransitionFrameWithStagger = ({
  fromText,
  targetText,
  elapsedMs,
  slotStaggerMs,
  random = Math.random,
}: {
  fromText: string;
  targetText: string;
  elapsedMs: number;
  slotStaggerMs: number;
  random?: () => number;
}) => {
  const source = splitTextGraphemes(fromText);
  const target = splitTextGraphemes(targetText);
  return buildFrame(
    source,
    target,
    getTextTransitionTimeline(fromText, targetText, slotStaggerMs),
    elapsedMs,
    random
  );
};

export const runTextTransition = ({
  fromText,
  targetText,
  onUpdate,
  onComplete,
  onTick,
  random = Math.random,
  slotStaggerMs = TEXT_TRANSITION_SLOT_STAGGER_MS,
}: TextTransitionOptions): TextTransitionController => {
  const source = splitTextGraphemes(fromText);
  const target = splitTextGraphemes(targetText);
  const timeline = getTextTransitionTimeline(
    fromText,
    targetText,
    slotStaggerMs
  );

  if (!fromText || !targetText || fromText === targetText) {
    onUpdate(targetText);
    onComplete?.();
    return { stop: () => undefined };
  }

  let frameHandle: FrameHandle | null = null;
  let startTimestamp: number | null = null;
  let lastPublishedValue: string | null = null;
  let stopped = false;

  const tick = (timestamp: number) => {
    if (stopped) return;
    if (startTimestamp === null) startTimestamp = timestamp;

    const elapsedMs = Math.min(
      timeline.totalDurationMs,
      Math.max(0, timestamp - startTimestamp)
    );
    onTick?.(elapsedMs, timeline);
    if (stopped) return;

    const nextValue = buildFrame(source, target, timeline, elapsedMs, random);
    if (nextValue !== lastPublishedValue) {
      lastPublishedValue = nextValue;
      onUpdate(nextValue);
    }
    if (stopped) return;

    if (elapsedMs >= timeline.totalDurationMs) {
      frameHandle = null;
      onComplete?.();
      return;
    }
    frameHandle = requestFrame(tick);
  };

  frameHandle = requestFrame(tick);
  return {
    stop: () => {
      stopped = true;
      cancelFrame(frameHandle);
      frameHandle = null;
    },
  };
};

export type {
  TextTransitionController,
  TextTransitionOptions,
  TextTransitionTimeline,
};
