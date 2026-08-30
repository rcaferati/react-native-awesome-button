import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';
import {
  cancelFrame,
  getFrameTimestamp,
  requestFrame,
  type FrameHandle,
} from '../frameLoop';
import {
  getTextTransitionTimeline,
  runTextTransition,
  type TextTransitionTimeline,
} from '../textTransition';
import {
  getAutoWidthTextFlow,
  type WidthCommandPort,
  type WidthMode,
} from './contracts';

const FIT_TOLERANCE = 0.5;
const PHASE_LEAD = 0.3;

type TextMeasurementKind = 'source' | 'target' | 'candidate';

export type HiddenMeasurementRequest = {
  generation: number;
  requestId: number;
  metricRevision: number;
  kind: TextMeasurementKind;
  text: string;
  beforeWidth: number;
  afterWidth: number;
  hasBefore: boolean;
  hasAfter: boolean;
};

type HeldCandidate = {
  generation: number;
  metricRevision: number;
  text: string;
  requiredWidth: number;
};

type PendingTransition = {
  generation: number;
  sourceText: string;
  targetText: string;
  sourceWidth: number | null;
};

type UseAutoWidthTextCoordinatorOptions = {
  after: ReactNode;
  animatedOpacity: Animated.Value;
  animateSize: boolean;
  before: ReactNode;
  children: ReactNode;
  extra: ReactNode;
  measurementSignature: string;
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
  extra: _extra,
  measurementSignature,
  reduceMotion,
  textTransition,
  widthCommands,
  widthMode,
}: UseAutoWidthTextCoordinatorOptions) => {
  const stringChildren = isNonEmptyString(children) ? children : null;
  const hasBefore = Children.toArray(before).length > 0;
  const hasAfter = Children.toArray(after).length > 0;
  const [displayedText, setDisplayedText] = useState<string | null>(
    stringChildren
  );
  const [measurementRequest, setMeasurementRequest] =
    useState<HiddenMeasurementRequest | null>(null);
  const [transientTextFrame, setTransientTextFrame] = useState(false);
  const [alignTextLogicalLeading, setAlignTextLogicalLeading] = useState(false);

  const mountedRef = useRef(true);
  const didInitializeRef = useRef(false);
  const generationRef = useRef(0);
  const requestSequenceRef = useRef(0);
  const metricRevisionRef = useRef(0);
  const measurementSignatureRef = useRef(measurementSignature);
  const widthModeRef = useRef(widthMode);
  const beforePresentRef = useRef(hasBefore);
  const afterPresentRef = useRef(hasAfter);
  const beforeWidthRef = useRef<number | null>(hasBefore ? null : 0);
  const afterWidthRef = useRef<number | null>(hasAfter ? null : 0);
  const displayedTextRef = useRef<string | null>(stringChildren);
  const targetTextRef = useRef<string | null>(stringChildren);
  const displayedFrameWidthRef = useRef<number | null>(null);
  const displayedFrameMetricRevisionRef = useRef<number | null>(null);
  const targetWidthRef = useRef<number | null>(null);
  const availableWidthRef = useRef<number | null>(null);
  const layoutRevisionRef = useRef(0);
  const externallyConstrainedRef = useRef(false);
  const constraintConfirmationFrameRef = useRef<FrameHandle | null>(null);
  const requestRef = useRef<HiddenMeasurementRequest | null>(null);
  const deferredMeasurementRef = useRef<{
    kind: TextMeasurementKind;
    text: string;
  } | null>(null);
  const pendingTransitionRef = useRef<PendingTransition | null>(null);
  const heldCandidateRef = useRef<HeldCandidate | null>(null);
  const latestCandidateRef = useRef<string | null>(null);
  const refreshPendingRef = useRef(false);
  const transitionRef = useRef<{ stop: () => void } | null>(null);
  const timelineRef = useRef<TextTransitionTimeline | null>(null);
  const activeFlowRef =
    useRef<ReturnType<typeof getAutoWidthTextFlow>>('initial');
  const transitionStartedRef = useRef(false);
  const textEngineCompleteRef = useRef(false);
  const textPhaseCompleteRef = useRef(false);
  const widthPhaseCompleteRef = useRef(true);
  const growthTextPendingRef = useRef(false);
  const shrinkWidthPendingRef = useRef(false);
  const widthPhaseStartedAtRef = useRef<number | null>(null);
  const widthPhaseDurationRef = useRef(0);
  const liveConfigRef = useRef({
    animateSize,
    reduceMotion,
    textTransition,
    widthMode,
  });
  const previousBehaviorRef = useRef({
    animateSize,
    reduceMotion,
    textTransition,
    widthMode,
  });

  useLayoutEffect(() => {
    liveConfigRef.current = {
      animateSize,
      reduceMotion,
      textTransition,
      widthMode,
    };
    widthModeRef.current = widthMode;
  }, [animateSize, reduceMotion, textTransition, widthMode]);

  const syncDisplayedText = useCallback((value: string | null) => {
    displayedTextRef.current = value;
    setDisplayedText((current) => (current === value ? current : value));
  }, []);

  const syncRequest = useCallback((value: HiddenMeasurementRequest | null) => {
    requestRef.current = value;
    setMeasurementRequest((current) =>
      current?.requestId === value?.requestId ? current : value
    );
  }, []);

  const stopTextEngine = useCallback(() => {
    transitionRef.current?.stop();
    transitionRef.current = null;
  }, []);

  const finishIfSettled = useCallback(() => {
    if (
      !transitionStartedRef.current ||
      !textPhaseCompleteRef.current ||
      !widthPhaseCompleteRef.current
    ) {
      return;
    }
    transitionStartedRef.current = false;
    pendingTransitionRef.current = null;
    timelineRef.current = null;
    activeFlowRef.current = 'initial';
    growthTextPendingRef.current = false;
    shrinkWidthPendingRef.current = false;
    heldCandidateRef.current = null;
    setTransientTextFrame(false);
    setAlignTextLogicalLeading(false);
    displayedFrameWidthRef.current = targetWidthRef.current;
    displayedFrameMetricRevisionRef.current = metricRevisionRef.current;
  }, []);

  const auxiliaryMetricsReady = useCallback(
    () => beforeWidthRef.current !== null && afterWidthRef.current !== null,
    []
  );

  const requestMeasurement = useCallback(
    (kind: TextMeasurementKind, text: string) => {
      if (!mountedRef.current || !text) return;
      if (!auxiliaryMetricsReady()) {
        deferredMeasurementRef.current = { kind, text };
        return;
      }
      requestSequenceRef.current += 1;
      const request: HiddenMeasurementRequest = {
        generation: generationRef.current,
        requestId: requestSequenceRef.current,
        metricRevision: metricRevisionRef.current,
        kind,
        text,
        beforeWidth: beforeWidthRef.current ?? 0,
        afterWidth: afterWidthRef.current ?? 0,
        hasBefore: beforePresentRef.current,
        hasAfter: afterPresentRef.current,
      };
      deferredMeasurementRef.current = null;
      syncRequest(request);
    },
    [auxiliaryMetricsReady, syncRequest]
  );

  const currentAvailableWidth = useCallback(() => {
    const rendered = widthCommands.getCurrent();
    const actual = availableWidthRef.current;
    if (rendered === null) return actual;
    if (actual === null) return rendered;
    return Math.min(rendered, actual);
  }, [widthCommands]);

  const isConstrainedFallback = useCallback(() => {
    if (widthModeRef.current !== 'auto') return true;
    return externallyConstrainedRef.current;
  }, []);

  const retryHeldCandidateRef = useRef<() => void>(() => undefined);
  const confirmConstraintRef = useRef<() => void>(() => undefined);

  const markWidthComplete = useCallback(() => {
    widthPhaseCompleteRef.current = true;
    widthPhaseStartedAtRef.current = null;
    confirmConstraintRef.current();
    retryHeldCandidateRef.current();
    finishIfSettled();
  }, [finishIfSettled]);

  const startTransitionWidth = useCallback(
    (
      generation: number,
      targetWidth: number,
      durationMs: number,
      onProgress?: (progress: number) => void
    ) => {
      if (!mountedRef.current || generationRef.current !== generation) return;
      widthPhaseCompleteRef.current = false;
      widthPhaseStartedAtRef.current = getFrameTimestamp();
      widthPhaseDurationRef.current = durationMs;
      widthCommands.animateTextTransitionTo(targetWidth, {
        durationMs,
        floor: () =>
          activeFlowRef.current === 'shrink-last'
            ? displayedFrameWidthRef.current
            : null,
        onProgress: (progress) => {
          if (!mountedRef.current || generationRef.current !== generation) {
            return;
          }
          onProgress?.(progress);
        },
        onComplete: () => {
          if (!mountedRef.current || generationRef.current !== generation) {
            return;
          }
          markWidthComplete();
        },
      });
    },
    [markWidthComplete, widthCommands]
  );

  const acceptCandidate = useCallback(
    (candidate: HeldCandidate) => {
      if (
        !mountedRef.current ||
        candidate.generation !== generationRef.current ||
        candidate.metricRevision !== metricRevisionRef.current
      ) {
        return false;
      }
      const availableWidth = currentAvailableWidth();
      const fits =
        availableWidth !== null &&
        candidate.requiredWidth <= availableWidth + FIT_TOLERANCE;
      if (!fits && !isConstrainedFallback()) {
        heldCandidateRef.current = candidate;
        return false;
      }

      heldCandidateRef.current = null;
      displayedFrameWidthRef.current = candidate.requiredWidth;
      displayedFrameMetricRevisionRef.current = candidate.metricRevision;
      syncDisplayedText(candidate.text);
      const isFinal =
        textEngineCompleteRef.current &&
        candidate.text === targetTextRef.current;
      setTransientTextFrame(!isFinal);
      if (isFinal) {
        textPhaseCompleteRef.current = true;
        if (
          activeFlowRef.current === 'shrink-last' &&
          widthPhaseCompleteRef.current &&
          targetWidthRef.current !== null
        ) {
          widthCommands.setImmediately(targetWidthRef.current);
        }
        finishIfSettled();
      }
      return true;
    },
    [
      currentAvailableWidth,
      finishIfSettled,
      isConstrainedFallback,
      syncDisplayedText,
      widthCommands,
    ]
  );

  const retryHeldCandidate = useCallback(() => {
    const candidate = heldCandidateRef.current;
    if (candidate !== null) acceptCandidate(candidate);
  }, [acceptCandidate]);
  retryHeldCandidateRef.current = retryHeldCandidate;

  const cancelConstraintConfirmation = useCallback(() => {
    cancelFrame(constraintConfirmationFrameRef.current);
    constraintConfirmationFrameRef.current = null;
  }, []);

  const confirmConstraint = useCallback(() => {
    cancelConstraintConfirmation();
    if (
      widthModeRef.current !== 'auto' ||
      !transitionStartedRef.current ||
      !widthPhaseCompleteRef.current
    ) {
      return;
    }
    const generation = generationRef.current;
    let observedRevision = layoutRevisionRef.current;
    let stableMismatchFrames = 0;
    const tick = () => {
      if (
        !mountedRef.current ||
        generationRef.current !== generation ||
        !transitionStartedRef.current ||
        !widthPhaseCompleteRef.current
      ) {
        constraintConfirmationFrameRef.current = null;
        return;
      }
      const commanded = widthCommands.getCurrent();
      const actual = availableWidthRef.current;
      if (
        commanded !== null &&
        actual !== null &&
        actual + FIT_TOLERANCE >= commanded
      ) {
        externallyConstrainedRef.current = false;
        constraintConfirmationFrameRef.current = null;
        retryHeldCandidateRef.current();
        return;
      }
      if (layoutRevisionRef.current === observedRevision) {
        stableMismatchFrames += 1;
      } else {
        observedRevision = layoutRevisionRef.current;
        stableMismatchFrames = 0;
      }
      if (commanded !== null && actual !== null && stableMismatchFrames >= 2) {
        externallyConstrainedRef.current = true;
        constraintConfirmationFrameRef.current = null;
        retryHeldCandidateRef.current();
        return;
      }
      constraintConfirmationFrameRef.current = requestFrame(tick);
    };
    constraintConfirmationFrameRef.current = requestFrame(tick);
  }, [cancelConstraintConfirmation, widthCommands]);
  confirmConstraintRef.current = confirmConstraint;

  const startTextPhaseRef = useRef<
    (generation: number, sourceText: string, targetText: string) => void
  >(() => undefined);

  const startTextPhase = useCallback(
    (generation: number, sourceText: string, targetText: string) => {
      if (
        !mountedRef.current ||
        generationRef.current !== generation ||
        transitionRef.current !== null
      ) {
        return;
      }
      const config = liveConfigRef.current;
      if (config.reduceMotion || !config.textTransition) {
        textEngineCompleteRef.current = true;
        requestMeasurement('candidate', targetText);
        return;
      }
      transitionRef.current = runTextTransition({
        fromText: sourceText,
        targetText,
        onTick: (elapsedMs, timeline) => {
          if (!mountedRef.current || generationRef.current !== generation)
            return;
          if (
            shrinkWidthPendingRef.current &&
            elapsedMs >= timeline.totalDurationMs * PHASE_LEAD
          ) {
            shrinkWidthPendingRef.current = false;
            const targetWidth = targetWidthRef.current;
            if (targetWidth !== null) {
              startTransitionWidth(
                generation,
                targetWidth,
                timeline.totalDurationMs
              );
            } else {
              markWidthComplete();
            }
          }
        },
        onUpdate: (value) => {
          if (!mountedRef.current || generationRef.current !== generation)
            return;
          latestCandidateRef.current = value;
          if (refreshPendingRef.current) return;
          requestMeasurement('candidate', value);
        },
        onComplete: () => {
          if (!mountedRef.current || generationRef.current !== generation)
            return;
          transitionRef.current = null;
          textEngineCompleteRef.current = true;
          requestMeasurement('candidate', targetText);
        },
      });
    },
    [markWidthComplete, requestMeasurement, startTransitionWidth]
  );
  startTextPhaseRef.current = startTextPhase;

  const startMeasuredTransition = useCallback(
    (pending: PendingTransition, targetWidth: number) => {
      if (!mountedRef.current || pending.generation !== generationRef.current) {
        return;
      }
      const sourceWidth = pending.sourceWidth ?? widthCommands.getCurrent();
      const timeline = getTextTransitionTimeline(
        pending.sourceText,
        pending.targetText
      );
      const flow =
        widthModeRef.current === 'auto'
          ? getAutoWidthTextFlow(sourceWidth, targetWidth)
          : 'text-only';
      timelineRef.current = timeline;
      activeFlowRef.current = flow;
      targetWidthRef.current = targetWidth;
      displayedFrameWidthRef.current = sourceWidth;
      displayedFrameMetricRevisionRef.current = metricRevisionRef.current;
      transitionStartedRef.current = true;
      textEngineCompleteRef.current = false;
      textPhaseCompleteRef.current = false;
      widthPhaseCompleteRef.current =
        widthModeRef.current !== 'auto' || flow === 'text-only';
      growthTextPendingRef.current = false;
      shrinkWidthPendingRef.current = false;
      setTransientTextFrame(true);
      setAlignTextLogicalLeading(
        flow === 'shrink-last' ||
          (widthModeRef.current !== 'auto' &&
            timeline.targetLength < timeline.sourceLength)
      );
      animatedOpacity.setValue(1);

      const config = liveConfigRef.current;
      if (widthModeRef.current !== 'auto' || !config.animateSize) {
        if (widthModeRef.current === 'auto') {
          widthCommands.setImmediately(targetWidth);
        }
        widthPhaseCompleteRef.current = true;
        startTextPhaseRef.current(
          pending.generation,
          pending.sourceText,
          pending.targetText
        );
        return;
      }

      if (flow === 'initial') {
        widthCommands.setImmediately(targetWidth);
        widthPhaseCompleteRef.current = true;
        startTextPhaseRef.current(
          pending.generation,
          pending.sourceText,
          pending.targetText
        );
      } else if (flow === 'text-only') {
        startTextPhaseRef.current(
          pending.generation,
          pending.sourceText,
          pending.targetText
        );
      } else if (flow === 'grow-first') {
        growthTextPendingRef.current = true;
        startTransitionWidth(
          pending.generation,
          targetWidth,
          timeline.totalDurationMs,
          (progress) => {
            if (growthTextPendingRef.current && progress >= PHASE_LEAD) {
              growthTextPendingRef.current = false;
              startTextPhaseRef.current(
                pending.generation,
                pending.sourceText,
                pending.targetText
              );
            }
            retryHeldCandidate();
          }
        );
      } else {
        shrinkWidthPendingRef.current = true;
        startTextPhaseRef.current(
          pending.generation,
          pending.sourceText,
          pending.targetText
        );
      }
    },
    [animatedOpacity, retryHeldCandidate, startTransitionWidth, widthCommands]
  );

  const settleMeasuredTarget = useCallback(
    (targetText: string, targetWidth: number) => {
      targetWidthRef.current = targetWidth;
      displayedFrameWidthRef.current = targetWidth;
      displayedFrameMetricRevisionRef.current = metricRevisionRef.current;
      syncDisplayedText(targetText);
      setTransientTextFrame(false);
      setAlignTextLogicalLeading(false);
      animatedOpacity.setValue(1);
      if (widthModeRef.current === 'auto') {
        if (
          widthCommands.getCurrent() === null ||
          !liveConfigRef.current.animateSize ||
          liveConfigRef.current.reduceMotion
        ) {
          widthCommands.setImmediately(targetWidth);
        } else {
          widthCommands.animateTo(targetWidth);
        }
      }
    },
    [animatedOpacity, syncDisplayedText, widthCommands]
  );

  const retargetActiveWidth = useCallback(
    (targetWidth: number) => {
      if (!transitionStartedRef.current || widthModeRef.current !== 'auto') {
        return;
      }
      targetWidthRef.current = targetWidth;
      if (widthPhaseCompleteRef.current) {
        widthCommands.setImmediately(targetWidth);
        return;
      }
      const startedAt = widthPhaseStartedAtRef.current;
      if (startedAt === null) return;
      const elapsed = Math.max(0, getFrameTimestamp() - startedAt);
      const remaining = Math.max(0, widthPhaseDurationRef.current - elapsed);
      startTransitionWidth(
        generationRef.current,
        targetWidth,
        remaining,
        activeFlowRef.current === 'grow-first'
          ? (progress) => {
              if (growthTextPendingRef.current && progress >= PHASE_LEAD) {
                growthTextPendingRef.current = false;
                const pending = pendingTransitionRef.current;
                if (pending !== null) {
                  startTextPhaseRef.current(
                    pending.generation,
                    pending.sourceText,
                    pending.targetText
                  );
                }
              }
              retryHeldCandidate();
            }
          : undefined
      );
    },
    [retryHeldCandidate, startTransitionWidth, widthCommands]
  );

  const handleHiddenMeasurementLayout = useCallback(
    (request: HiddenMeasurementRequest, event: LayoutChangeEvent) => {
      const current = requestRef.current;
      const requiredWidth = event.nativeEvent.layout.width;
      if (
        !mountedRef.current ||
        current === null ||
        current.requestId !== request.requestId ||
        current.generation !== request.generation ||
        current.metricRevision !== request.metricRevision ||
        request.generation !== generationRef.current ||
        request.metricRevision !== metricRevisionRef.current ||
        !Number.isFinite(requiredWidth) ||
        requiredWidth < 0
      ) {
        return;
      }
      syncRequest(null);

      if (request.kind === 'source') {
        displayedFrameWidthRef.current = requiredWidth;
        displayedFrameMetricRevisionRef.current = request.metricRevision;
        const pending = pendingTransitionRef.current;
        if (pending !== null && pending.generation === request.generation) {
          pending.sourceWidth = requiredWidth;
          requestMeasurement('target', pending.targetText);
        }
        return;
      }

      if (request.kind === 'target') {
        targetWidthRef.current = requiredWidth;
        const pending = pendingTransitionRef.current;
        if (refreshPendingRef.current && transitionStartedRef.current) {
          refreshPendingRef.current = false;
          retargetActiveWidth(requiredWidth);
          const latest = latestCandidateRef.current;
          if (latest !== null) requestMeasurement('candidate', latest);
          return;
        }
        if (pending === null || pending.generation !== request.generation) {
          return;
        }
        const shouldAnimate =
          liveConfigRef.current.textTransition &&
          !liveConfigRef.current.reduceMotion &&
          pending.sourceText.length > 0 &&
          pending.targetText.length > 0 &&
          pending.sourceText !== pending.targetText;
        if (!shouldAnimate) {
          settleMeasuredTarget(pending.targetText, requiredWidth);
          pendingTransitionRef.current = null;
          return;
        }
        startMeasuredTransition(pending, requiredWidth);
        return;
      }

      acceptCandidate({
        generation: request.generation,
        metricRevision: request.metricRevision,
        text: request.text,
        requiredWidth,
      });
    },
    [
      acceptCandidate,
      requestMeasurement,
      retargetActiveWidth,
      settleMeasuredTarget,
      startMeasuredTransition,
      syncRequest,
    ]
  );

  const beginCurrentTarget = useCallback(
    (targetText: string | null) => {
      const generation = generationRef.current;
      const sourceText = displayedTextRef.current;
      targetTextRef.current = targetText;
      latestCandidateRef.current = null;
      heldCandidateRef.current = null;
      targetWidthRef.current = null;

      if (targetText === null) {
        pendingTransitionRef.current = null;
        syncDisplayedText(null);
        setTransientTextFrame(false);
        setAlignTextLogicalLeading(false);
        if (widthModeRef.current === 'auto') widthCommands.setImmediately(null);
        return;
      }

      if (sourceText === null || sourceText === targetText) {
        syncDisplayedText(targetText);
      } else {
        setTransientTextFrame(
          liveConfigRef.current.textTransition &&
            !liveConfigRef.current.reduceMotion
        );
      }

      if (widthModeRef.current !== 'auto') {
        if (
          sourceText !== null &&
          sourceText !== targetText &&
          liveConfigRef.current.textTransition &&
          !liveConfigRef.current.reduceMotion
        ) {
          const pending = {
            generation,
            sourceText,
            targetText,
            sourceWidth: currentAvailableWidth(),
          };
          pendingTransitionRef.current = pending;
          startMeasuredTransition(pending, currentAvailableWidth() ?? 0);
        } else {
          syncDisplayedText(targetText);
          setTransientTextFrame(false);
        }
        return;
      }

      const pending: PendingTransition = {
        generation,
        sourceText: sourceText ?? targetText,
        targetText,
        sourceWidth:
          displayedFrameMetricRevisionRef.current === metricRevisionRef.current
            ? displayedFrameWidthRef.current
            : null,
      };
      pendingTransitionRef.current = pending;
      if (pending.sourceWidth === null) {
        requestMeasurement('source', pending.sourceText);
      } else {
        requestMeasurement('target', targetText);
      }
    },
    [
      currentAvailableWidth,
      requestMeasurement,
      startMeasuredTransition,
      syncDisplayedText,
      widthCommands,
    ]
  );

  const invalidateTransition = useCallback(() => {
    generationRef.current += 1;
    cancelConstraintConfirmation();
    stopTextEngine();
    syncRequest(null);
    deferredMeasurementRef.current = null;
    pendingTransitionRef.current = null;
    heldCandidateRef.current = null;
    latestCandidateRef.current = null;
    refreshPendingRef.current = false;
    transitionStartedRef.current = false;
    textEngineCompleteRef.current = false;
    textPhaseCompleteRef.current = false;
    widthPhaseCompleteRef.current = true;
    growthTextPendingRef.current = false;
    shrinkWidthPendingRef.current = false;
    widthPhaseStartedAtRef.current = null;
    timelineRef.current = null;
    widthCommands.cancel();
  }, [
    cancelConstraintConfirmation,
    stopTextEngine,
    syncRequest,
    widthCommands,
  ]);

  const refreshMeasurements = useCallback(() => {
    if (!mountedRef.current) return;
    metricRevisionRef.current += 1;
    displayedFrameMetricRevisionRef.current = null;
    heldCandidateRef.current = null;
    syncRequest(null);
    const target = targetTextRef.current;
    const displayed = displayedTextRef.current;
    if (target === null || displayed === null) return;
    if (transitionStartedRef.current) {
      refreshPendingRef.current = true;
      const pending = pendingTransitionRef.current;
      if (pending !== null) pending.sourceWidth = null;
      requestMeasurement('source', displayed);
      return;
    }
    pendingTransitionRef.current = {
      generation: generationRef.current,
      sourceText: displayed,
      targetText: target,
      sourceWidth: null,
    };
    requestMeasurement('source', displayed);
  }, [requestMeasurement, syncRequest]);

  useLayoutEffect(() => {
    if (measurementSignatureRef.current === measurementSignature) return;
    measurementSignatureRef.current = measurementSignature;
    refreshMeasurements();
  }, [measurementSignature, refreshMeasurements]);

  useLayoutEffect(() => {
    const beforeChanged = beforePresentRef.current !== hasBefore;
    const afterChanged = afterPresentRef.current !== hasAfter;
    if (!beforeChanged && !afterChanged) return;
    beforePresentRef.current = hasBefore;
    afterPresentRef.current = hasAfter;
    beforeWidthRef.current = hasBefore ? null : 0;
    afterWidthRef.current = hasAfter ? null : 0;
    refreshMeasurements();
  }, [hasAfter, hasBefore, refreshMeasurements]);

  useLayoutEffect(() => {
    const previousBehavior = previousBehaviorRef.current;
    const behaviorChanged =
      previousBehavior.animateSize !== animateSize ||
      previousBehavior.reduceMotion !== reduceMotion ||
      previousBehavior.textTransition !== textTransition ||
      previousBehavior.widthMode !== widthMode;
    previousBehaviorRef.current = {
      animateSize,
      reduceMotion,
      textTransition,
      widthMode,
    };
    if (!didInitializeRef.current) {
      didInitializeRef.current = true;
      targetTextRef.current = stringChildren;
      beginCurrentTarget(stringChildren);
      return;
    }
    if (stringChildren === targetTextRef.current) {
      if (behaviorChanged) {
        invalidateTransition();
        beginCurrentTarget(stringChildren);
      }
      return;
    }
    invalidateTransition();
    beginCurrentTarget(stringChildren);
  }, [
    beginCurrentTarget,
    invalidateTransition,
    animateSize,
    reduceMotion,
    stringChildren,
    textTransition,
    widthMode,
  ]);

  const onVisibleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;
      if (!Number.isFinite(nextWidth) || nextWidth < 0) return;
      availableWidthRef.current = nextWidth;
      layoutRevisionRef.current += 1;
      const commanded = widthCommands.getCurrent();
      if (
        widthModeRef.current !== 'auto' ||
        (transitionStartedRef.current && !widthPhaseCompleteRef.current)
      ) {
        externallyConstrainedRef.current = false;
      } else {
        externallyConstrainedRef.current =
          commanded !== null && nextWidth + FIT_TOLERANCE >= commanded
            ? false
            : externallyConstrainedRef.current;
      }
      retryHeldCandidate();

      if (stringChildren !== null || widthModeRef.current !== 'auto') return;
      animatedOpacity.setValue(1);
      if (
        commanded === null ||
        !liveConfigRef.current.animateSize ||
        liveConfigRef.current.reduceMotion
      ) {
        widthCommands.setImmediately(nextWidth);
      } else {
        widthCommands.animateTo(nextWidth);
      }
    },
    [animatedOpacity, retryHeldCandidate, stringChildren, widthCommands]
  );

  const handleAuxiliaryLayout = useCallback(
    (kind: 'before' | 'after', event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (!Number.isFinite(width) || width < 0) return;
      const ref = kind === 'before' ? beforeWidthRef : afterWidthRef;
      if (ref.current !== null && Math.abs(ref.current - width) < 0.001) return;
      const wasReady = auxiliaryMetricsReady();
      ref.current = width;
      const isReady = auxiliaryMetricsReady();
      if (wasReady && isReady) {
        refreshMeasurements();
        return;
      }
      if (isReady) {
        const deferred = deferredMeasurementRef.current;
        if (deferred !== null) {
          requestMeasurement(deferred.kind, deferred.text);
        }
      }
    },
    [auxiliaryMetricsReady, refreshMeasurements, requestMeasurement]
  );

  useEffect(
    () => () => {
      mountedRef.current = false;
      generationRef.current += 1;
      cancelConstraintConfirmation();
      stopTextEngine();
      requestRef.current = null;
      deferredMeasurementRef.current = null;
      heldCandidateRef.current = null;
      widthCommands.cancel();
    },
    [cancelConstraintConfirmation, stopTextEngine, widthCommands]
  );

  return {
    alignTextLogicalLeading,
    displayedText,
    measurementRequest,
    onAfterLayout: (event: LayoutChangeEvent) =>
      handleAuxiliaryLayout('after', event),
    onBeforeLayout: (event: LayoutChangeEvent) =>
      handleAuxiliaryLayout('before', event),
    onHiddenMeasurementLayout: handleHiddenMeasurementLayout,
    onVisibleContentLayout,
    transientTextFrame,
  };
};

export default useAutoWidthTextCoordinator;
