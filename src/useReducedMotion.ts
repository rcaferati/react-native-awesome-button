import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const useReducedMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);
  const updateReduceMotion = useCallback((enabled: boolean) => {
    if (reduceMotionRef.current === enabled) return;
    reduceMotionRef.current = enabled;
    setReduceMotion(enabled);
  }, []);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) updateReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      updateReduceMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [updateReduceMotion]);

  return reduceMotion;
};

export default useReducedMotion;
