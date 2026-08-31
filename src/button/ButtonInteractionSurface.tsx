import React, { useCallback, useMemo, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';
import { getLongPressAccessibilityLabel } from '../localization';
import { styles } from '../styles';
import type { AwesomeButtonPressableProps } from '../types';

const getMergedAccessibilityState = (
  accessibilityState: PressableProps['accessibilityState'],
  {
    busy,
    disabled,
  }: {
    busy: boolean;
    disabled: boolean;
  }
) => {
  const nextState = {
    ...accessibilityState,
  };

  if (disabled || nextState.disabled !== undefined) {
    nextState.disabled = Boolean(disabled || nextState.disabled);
  }

  if (busy || nextState.busy !== undefined) {
    nextState.busy = Boolean(busy || nextState.busy);
  }

  return Object.keys(nextState).length > 0 ? nextState : undefined;
};

type ButtonInteractionSurfaceProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  accessibilityLongPressLabel?: string;
  activity: boolean;
  children: ReactNode;
  dangerouslySetPressableProps: AwesomeButtonPressableProps;
  disabled: boolean;
  fallbackAccessibilityLabel?: string;
  hasAccessibleLongPress: boolean;
  hasRenderableChildren: boolean;
  hitSlop?: PressableProps['hitSlop'];
  minimumTarget: number;
  onAtomicLongPress: () => void;
  onPress: () => void;
  onPressIn: (event: GestureResponderEvent) => void;
  onPressOut: (event: GestureResponderEvent) => void;
  stretch: boolean;
};

const ButtonInteractionSurface = ({
  accessibilityHint,
  accessibilityLabel,
  accessibilityLongPressLabel,
  activity,
  children,
  dangerouslySetPressableProps,
  disabled,
  fallbackAccessibilityLabel,
  hasAccessibleLongPress,
  hasRenderableChildren,
  hitSlop,
  minimumTarget,
  onAtomicLongPress,
  onPress,
  onPressIn,
  onPressOut,
  stretch,
}: ButtonInteractionSurfaceProps) => {
  const {
    accessibilityActions: dangerousAccessibilityActions,
    accessibilityHint: dangerousAccessibilityHint,
    accessibilityLabel: dangerousAccessibilityLabel,
    accessibilityRole: dangerousAccessibilityRole,
    accessibilityState: dangerousAccessibilityState,
    children: _ignoredDangerousChildren,
    hitSlop: dangerousHitSlop,
    onLongPress: _ignoredDangerousOnLongPress,
    onAccessibilityAction: dangerousOnAccessibilityAction,
    onPress: _ignoredDangerousOnPress,
    onPressIn: _ignoredDangerousOnPressIn,
    onPressOut: _ignoredDangerousOnPressOut,
    style: dangerousPressableStyle,
    ...safePressableProps
  } = dangerouslySetPressableProps as PressableProps & {
    children?: ReactNode;
  };
  const pressableHitSlop = hitSlop ?? dangerousHitSlop;
  const accessibilityRole = dangerousAccessibilityRole ?? 'button';
  const effectiveDisabled = disabled || activity || !hasRenderableChildren;
  const effectiveAccessibilityLabel =
    accessibilityLabel ??
    dangerousAccessibilityLabel ??
    fallbackAccessibilityLabel;
  const effectiveAccessibilityHint =
    accessibilityHint ?? dangerousAccessibilityHint;
  const longAccessibilityActionName =
    Platform.OS === 'ios' ? 'awesome-button-long-press' : 'longpress';
  const accessibilityActions = useMemo(() => {
    const reservedNames = new Set([
      'activate',
      'longpress',
      'awesome-button-long-press',
    ]);
    const consumerActions = (dangerousAccessibilityActions ?? []).filter(
      (action) => !reservedNames.has(action.name)
    );
    const ownedActions: Array<{ name: string; label?: string }> = [];

    if (!effectiveDisabled && hasAccessibleLongPress) {
      ownedActions.push({
        name: longAccessibilityActionName,
        label:
          accessibilityLongPressLabel ??
          (Platform.OS === 'ios'
            ? getLongPressAccessibilityLabel()
            : undefined),
      });
    }

    return [...consumerActions, ...ownedActions];
  }, [
    accessibilityLongPressLabel,
    dangerousAccessibilityActions,
    effectiveDisabled,
    hasAccessibleLongPress,
    longAccessibilityActionName,
  ]);
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const actionName = event.nativeEvent.actionName;
      if (actionName === 'activate') {
        return;
      }
      if (
        actionName === 'longpress' ||
        actionName === 'awesome-button-long-press'
      ) {
        onAtomicLongPress();
        return;
      }
      dangerousOnAccessibilityAction?.(event);
    },
    [dangerousOnAccessibilityAction, onAtomicLongPress]
  );
  const accessibilityState = useMemo(
    () =>
      getMergedAccessibilityState(dangerousAccessibilityState, {
        busy: activity,
        disabled: effectiveDisabled,
      }),
    [activity, dangerousAccessibilityState, effectiveDisabled]
  );

  return (
    <Pressable
      testID="aws-btn-content-view"
      {...safePressableProps}
      accessible
      accessibilityActions={accessibilityActions}
      accessibilityHint={effectiveAccessibilityHint}
      accessibilityLabel={effectiveAccessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      disabled={effectiveDisabled}
      hitSlop={pressableHitSlop}
      onAccessibilityAction={onAccessibilityAction}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={(state) => [
        typeof dangerousPressableStyle === 'function'
          ? dangerousPressableStyle(state)
          : dangerousPressableStyle,
        ...(stretch ? [styles.stretchTarget] : []),
        styles.minimumTarget,
        { minHeight: minimumTarget, minWidth: minimumTarget },
      ]}
    >
      {children}
    </Pressable>
  );
};

export default ButtonInteractionSurface;
