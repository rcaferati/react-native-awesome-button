import React, { useMemo } from 'react';
import AwesomeButton from '../Button';
import type { ThemedButtonProps } from '../types';
import { resolveButtonType, TRANSPARENT_STYLES } from './resolution';
import getTheme from './themes';

function ThemedButton({
  disabled,
  index = null,
  config,
  flat = false,
  name = null,
  transparent = false,
  type = 'primary',
  size = 'medium',
  ...extra
}: ThemedButtonProps) {
  const theme = useMemo(
    () => config || getTheme(index, name),
    [config, index, name]
  );
  const buttonType = useMemo(
    () => resolveButtonType(theme, disabled, flat, type),
    [theme, disabled, flat, type]
  );
  const buttonStyles = theme.buttons[buttonType];
  const sizeStyles = theme.size[size] || theme.size.medium;
  const transparentStyles = transparent ? TRANSPARENT_STYLES : undefined;
  const resolvedAwesomeButtonProps = useMemo(
    () => ({
      ...buttonStyles,
      ...transparentStyles,
      ...sizeStyles,
      disabled,
      ...extra,
    }),
    [buttonStyles, disabled, extra, sizeStyles, transparentStyles]
  );

  return <AwesomeButton {...resolvedAwesomeButtonProps} />;
}

export default ThemedButton;
