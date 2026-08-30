import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';
import { runTextTransition } from '../textTransition';
import {
  getAutoWidthTextFlow,
  type WidthCommandPort,
  type WidthMode,
} from './contracts';

type HiddenMeasurementRequest = {
  id: number;
  text: string;
};

type UseAutoWidthTextCoordinatorOptions = {
  after: ReactNode;
  animatedOpacity: Animated.Value;
  animateSize: boolean;
  before: ReactNode;
  children: ReactNode;
  extra: ReactNode;
  reduceMotion: boolean;
  textTransition: boolean;
  widthCommands: WidthCommandPort;
  widthMode: WidthMode;
};

const isNonEmptyString = (value: ReactNode): value is string =>
  typeof value === 'string' && value.length > 0;

const useAutoWidthTextCoordinator = ({
  after,
  animatedOpacity,
  animateSize,
  before,
  children,
  extra,
  reduceMotion,
  textTransition,
  widthCommands,
  widthMode,
}: UseAutoWidthTextCoordinatorOptions) => {
  const stringChildren = isNonEmptyString(children) ? children : null;
  const canChoreograph =
    widthMode === 'auto' &&
    stringChildren !== null &&
    before === null &&
    after === null &&
    extra === null;
  const initialRequest =
    canChoreograph && stringChildren !== null
      ? { id: 0, text: stringChildren }
      : null;
  const [displayedText, setDisplayedText] = useState<string | null>(
    stringChildren
  );
  const [hiddenRequest, setHiddenRequest] =
    useState<HiddenMeasurementRequest | null>(initialRequest);
  const displayedTextRef = useRef<string | null>(stringChildren);
  const currentTargetTextRef = useRef<string | null>(stringChildren);
  const hiddenRequestRef = useRef<HiddenMeasurementRequest | null>(
    initialRequest
  );
  const transitionRef = useRef<{ stop: () => void } | null>(null);
  const textRunIdRef = useRef(0);
  const didInitializeTextRef = useRef(false);
  const widthModeRef = useRef(widthMode);
  const canChoreographRef = useRef(canChoreograph);

  const syncDisplayedText = useCallback((value: string | null) => {
    displayedTextRef.current = value;
    setDisplayedText((current) => (current === value ? current : value));
  }, []);

  const stopTextTransition = useCallback(() => {
    transitionRef.current?.stop();
    transitionRef.current = null;
  }, []);

  const runTextPhase = useCallback(
    (runId: number, targetText: string | null, onComplete?: () => void) => {
      stopTextTransition();
      if (
        !textTransition ||
        reduceMotion ||
        !isNonEmptyString(targetText) ||
        !isNonEmptyString(displayedTextRef.current) ||
        displayedTextRef.current === targetText
      ) {
        syncDisplayedText(targetText);
        onComplete?.();
        return;
      }

      transitionRef.current = runTextTransition({
        fromText: displayedTextRef.current,
        targetText,
        onUpdate: syncDisplayedText,
        onComplete: () => {
          transitionRef.current = null;
          if (textRunIdRef.current !== runId) return;
          syncDisplayedText(targetText);
          onComplete?.();
        },
      });
    },
    [reduceMotion, stopTextTransition, syncDisplayedText, textTransition]
  );

  const requestHiddenMeasurement = useCallback((text: string) => {
    const request = { id: textRunIdRef.current, text };
    hiddenRequestRef.current = request;
    setHiddenRequest((current) =>
      current?.id === request.id && current.text === request.text
        ? current
        : request
    );
  }, []);

  const onHiddenMeasurementLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const request = hiddenRequestRef.current;
      if (request === null) return;
      hiddenRequestRef.current = null;
      setHiddenRequest(null);
      const nextWidth = event.nativeEvent.layout.width;
      const flow = getAutoWidthTextFlow(widthCommands.getCurrent(), nextWidth);
      if (textRunIdRef.current !== request.id) return;
      animatedOpacity.setValue(1);

      if (flow === 'initial') {
        widthCommands.setImmediately(nextWidth);
        syncDisplayedText(request.text);
      } else if (flow === 'text-only') {
        runTextPhase(request.id, request.text);
      } else if (flow === 'grow-first') {
        widthCommands.animateTo(nextWidth, () => {
          if (textRunIdRef.current === request.id) {
            runTextPhase(request.id, request.text);
          }
        });
      } else {
        runTextPhase(request.id, request.text, () => {
          if (textRunIdRef.current === request.id) {
            widthCommands.animateTo(nextWidth);
          }
        });
      }
    },
    [animatedOpacity, runTextPhase, syncDisplayedText, widthCommands]
  );

  const onVisibleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (widthMode !== 'auto' || canChoreograph) return;
      const nextWidth = event.nativeEvent.layout.width;
      animatedOpacity.setValue(1);
      if (widthCommands.getCurrent() === null || !animateSize || reduceMotion) {
        widthCommands.setImmediately(nextWidth);
      } else {
        widthCommands.animateTo(nextWidth);
      }
    },
    [
      animateSize,
      animatedOpacity,
      canChoreograph,
      reduceMotion,
      widthCommands,
      widthMode,
    ]
  );

  useEffect(() => {
    const previousMode = widthModeRef.current;
    const previouslyCouldChoreograph = canChoreographRef.current;
    widthModeRef.current = widthMode;
    canChoreographRef.current = canChoreograph;
    const enteredChoreography = !previouslyCouldChoreograph && canChoreograph;
    if (previousMode === widthMode && !enteredChoreography) return;
    stopTextTransition();
    const nextRunId = textRunIdRef.current + 1;
    textRunIdRef.current = nextRunId;
    if (canChoreograph && stringChildren !== null) {
      currentTargetTextRef.current = stringChildren;
      widthCommands.snapshot(() => {
        if (textRunIdRef.current === nextRunId) {
          requestHiddenMeasurement(stringChildren);
        }
      });
    }
  }, [
    canChoreograph,
    requestHiddenMeasurement,
    stopTextTransition,
    stringChildren,
    widthCommands,
    widthMode,
  ]);

  useEffect(() => {
    const nextText = stringChildren;
    const nextRunId = textRunIdRef.current + 1;
    if (!didInitializeTextRef.current) {
      didInitializeTextRef.current = true;
      currentTargetTextRef.current = nextText;
      textRunIdRef.current = nextRunId;
      syncDisplayedText(nextText);
      if (canChoreograph && nextText !== null) {
        requestHiddenMeasurement(nextText);
      }
      return;
    }
    if (nextText === currentTargetTextRef.current) return;
    currentTargetTextRef.current = nextText;
    textRunIdRef.current = nextRunId;
    stopTextTransition();
    if (canChoreograph && nextText !== null) {
      widthCommands.snapshot(() => {
        if (textRunIdRef.current === nextRunId) {
          requestHiddenMeasurement(nextText);
        }
      });
      return;
    }
    hiddenRequestRef.current = null;
    setHiddenRequest(null);
    runTextPhase(nextRunId, nextText);
  }, [
    canChoreograph,
    requestHiddenMeasurement,
    runTextPhase,
    stopTextTransition,
    stringChildren,
    syncDisplayedText,
    widthCommands,
  ]);

  useEffect(() => {
    if (canChoreograph) return;
    hiddenRequestRef.current = null;
    setHiddenRequest(null);
  }, [canChoreograph]);

  useEffect(
    () => () => {
      textRunIdRef.current += 1;
      hiddenRequestRef.current = null;
      stopTextTransition();
    },
    [stopTextTransition]
  );

  return {
    displayedText,
    hiddenMeasurementKey:
      hiddenRequest !== null
        ? `aws-btn-hidden-measure-${hiddenRequest.id}`
        : null,
    hiddenMeasurementText: hiddenRequest?.text ?? null,
    onHiddenMeasurementLayout,
    onVisibleContentLayout,
  };
};

export default useAutoWidthTextCoordinator;
