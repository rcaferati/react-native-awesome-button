import { cancelFrame, requestFrame, type FrameHandle } from './frameLoop';

type TextTransitionOptions = {
  fromText: string;
  targetText: string;
  onUpdate: (value: string) => void;
  onComplete?: () => void;
  random?: () => number;
};

type TextTransitionController = {
  stop: () => void;
};

type TextTransitionTimeline = {
  sourceLength: number;
  targetLength: number;
  maxLength: number;
  lastSourceRandomizeStartMs: number;
  lastRandomizeStartMs: number;
  collapseStartMs: number;
  totalDurationMs: number;
};

const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '#%&^+=-';

export const TEXT_TRANSITION_RANDOMIZE_START_STAGGER_MS = 5;
export const TEXT_TRANSITION_EXPAND_STAGGER_MS = 5;
export const TEXT_TRANSITION_POST_RANDOMIZE_HOLD_MS = 10;
export const TEXT_TRANSITION_COLLAPSE_STAGGER_MS = 10;
export const TEXT_TRANSITION_REFRESH_MS = 16;

const isWhitespace = (character: string) => /\s/.test(character);
const isDigit = (character: string) => /\d/.test(character);
const isUppercaseLetter = (character: string) =>
  character.toUpperCase() === character &&
  character.toLowerCase() !== character;
const isLowercaseLetter = (character: string) =>
  character.toLowerCase() === character &&
  character.toUpperCase() !== character;

export const getTextTransitionRandomizeStartMs = (
  index: number,
  sourceLength: number,
  targetLength: number
) => {
  if (index < sourceLength) {
    return index * TEXT_TRANSITION_RANDOMIZE_START_STAGGER_MS;
  }

  if (index < targetLength) {
    const lastSourceStartMs =
      sourceLength > 0
        ? (sourceLength - 1) * TEXT_TRANSITION_RANDOMIZE_START_STAGGER_MS
        : 0;

    return (
      lastSourceStartMs +
      (index - sourceLength + 1) * TEXT_TRANSITION_EXPAND_STAGGER_MS
    );
  }

  return null;
};

const getLastRandomizeStartMs = (
  sourceLength: number,
  targetLength: number
) => {
  const maxLength = Math.max(sourceLength, targetLength);

  if (maxLength === 0) {
    return 0;
  }

  return (
    getTextTransitionRandomizeStartMs(
      maxLength - 1,
      sourceLength,
      targetLength
    ) ?? 0
  );
};

export const getTextTransitionTimeline = (
  fromText: string,
  targetText: string
): TextTransitionTimeline => {
  const sourceLength = fromText.length;
  const targetLength = targetText.length;
  const maxLength = Math.max(sourceLength, targetLength);
  const lastSourceRandomizeStartMs =
    sourceLength > 0
      ? (sourceLength - 1) * TEXT_TRANSITION_RANDOMIZE_START_STAGGER_MS
      : 0;
  const lastRandomizeStartMs = getLastRandomizeStartMs(
    sourceLength,
    targetLength
  );
  const collapseStartMs =
    lastRandomizeStartMs + TEXT_TRANSITION_POST_RANDOMIZE_HOLD_MS;
  const totalDurationMs =
    maxLength === 0
      ? 0
      : collapseStartMs + (maxLength - 1) * TEXT_TRANSITION_COLLAPSE_STAGGER_MS;

  return {
    sourceLength,
    targetLength,
    maxLength,
    lastSourceRandomizeStartMs,
    lastRandomizeStartMs,
    collapseStartMs,
    totalDurationMs,
  };
};

export const getTextTransitionCharset = (character: string) => {
  if (isWhitespace(character)) {
    return null;
  }

  if (isDigit(character)) {
    return DIGITS;
  }

  if (isUppercaseLetter(character)) {
    return UPPERCASE_LETTERS;
  }

  if (isLowercaseLetter(character)) {
    return LOWERCASE_LETTERS;
  }

  return SYMBOLS;
};

export const getRandomTransitionCharacter = (
  character: string,
  random: () => number = Math.random
) => {
  const charset = getTextTransitionCharset(character);

  if (!charset) {
    return character;
  }

  const index = Math.min(
    charset.length - 1,
    Math.floor(random() * charset.length)
  );

  return charset.charAt(index);
};

export const buildTextTransitionFrame = (
  fromText: string,
  targetText: string,
  elapsedMs: number,
  random: () => number = Math.random
) => {
  if (!fromText) {
    return targetText;
  }

  if (fromText === targetText) {
    return targetText;
  }

  const timeline = getTextTransitionTimeline(fromText, targetText);

  if (elapsedMs >= timeline.totalDurationMs) {
    return targetText;
  }

  return Array.from({ length: timeline.maxLength }, (_, index) => {
    const randomizeStartMs = getTextTransitionRandomizeStartMs(
      index,
      timeline.sourceLength,
      timeline.targetLength
    );
    const collapseMs =
      timeline.collapseStartMs + index * TEXT_TRANSITION_COLLAPSE_STAGGER_MS;
    const sourceCharacter = fromText.charAt(index) ?? '';
    const targetCharacter = targetText.charAt(index) ?? '';
    const randomSourceCharacter =
      index >= timeline.sourceLength ? targetCharacter : sourceCharacter;

    if (randomizeStartMs === null || elapsedMs < randomizeStartMs) {
      return sourceCharacter;
    }

    if (elapsedMs >= collapseMs) {
      return targetCharacter;
    }

    return getRandomTransitionCharacter(randomSourceCharacter, random);
  }).join('');
};

export const runTextTransition = ({
  fromText,
  targetText,
  onUpdate,
  onComplete,
  random = Math.random,
}: TextTransitionOptions): TextTransitionController => {
  const timeline = getTextTransitionTimeline(fromText, targetText);

  if (!fromText || !targetText || fromText === targetText) {
    onUpdate(targetText);
    onComplete?.();

    return {
      stop: () => undefined,
    };
  }

  let frameHandle: FrameHandle | null = null;
  let startTimestamp: number | null = null;
  let lastPublishedValue: string | null = null;

  const tick = (timestamp: number) => {
    if (startTimestamp === null) {
      startTimestamp = timestamp;
    }

    const elapsedMs = Math.min(
      timeline.totalDurationMs,
      timestamp - startTimestamp
    );
    const nextValue = buildTextTransitionFrame(
      fromText,
      targetText,
      elapsedMs,
      random
    );

    if (nextValue !== lastPublishedValue) {
      lastPublishedValue = nextValue;
      onUpdate(nextValue);
    }

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
