import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { runTextTransition } from './textTransition';

const useButtonTextTransition = ({
  children,
  textTransition,
}: {
  children: ReactNode;
  textTransition?: boolean;
}) => {
  const textTransitionControllerRef = useRef<{
    stop: () => void;
  } | null>(null);
  const didMountTextTransitionRef = useRef(false);
  const stringChildren = typeof children === 'string' ? children : null;
  const displayedTextRef = useRef<string | null>(stringChildren);
  const currentTextTargetRef = useRef<string | null>(stringChildren);
  const [displayedText, setDisplayedText] = useState<string | null>(
    stringChildren
  );

  const stopTextTransition = useCallback(() => {
    if (textTransitionControllerRef.current !== null) {
      textTransitionControllerRef.current.stop();
      textTransitionControllerRef.current = null;
    }
  }, []);

  const updateDisplayedText = useCallback((value: string | null) => {
    displayedTextRef.current = value;
    setDisplayedText((currentValue) =>
      currentValue === value ? currentValue : value
    );
  }, []);

  useEffect(() => () => stopTextTransition(), [stopTextTransition]);

  useEffect(() => {
    const nextText = stringChildren;
    const previousTarget = currentTextTargetRef.current;
    const previousDisplayedText = displayedTextRef.current;
    const previousText = previousDisplayedText ?? previousTarget;
    const hasMounted = didMountTextTransitionRef.current;
    const canAnimate =
      hasMounted &&
      textTransition === true &&
      typeof nextText === 'string' &&
      nextText.length > 0 &&
      typeof previousText === 'string' &&
      previousText.length > 0 &&
      nextText !== previousTarget;

    if (!hasMounted) {
      didMountTextTransitionRef.current = true;
      currentTextTargetRef.current = nextText;
      updateDisplayedText(nextText);
      return;
    }

    if (
      textTransition === false ||
      nextText === null ||
      nextText.length === 0
    ) {
      stopTextTransition();
      currentTextTargetRef.current = nextText;
      updateDisplayedText(nextText);
      return;
    }

    if (nextText === previousTarget) {
      return;
    }

    if (!canAnimate) {
      stopTextTransition();
      currentTextTargetRef.current = nextText;
      updateDisplayedText(nextText);
      return;
    }

    stopTextTransition();
    currentTextTargetRef.current = nextText;
    textTransitionControllerRef.current = runTextTransition({
      fromText: previousText ?? nextText,
      targetText: nextText,
      onUpdate: updateDisplayedText,
      onComplete: () => {
        textTransitionControllerRef.current = null;
        updateDisplayedText(nextText);
      },
    });
  }, [stopTextTransition, stringChildren, textTransition, updateDisplayedText]);

  return {
    displayedText,
    stringChildren,
  };
};

export default useButtonTextTransition;
