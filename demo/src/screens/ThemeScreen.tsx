import * as React from 'react';
import Example from '../components/Example';
import type { ThemeScreenProps } from '../types';

function ThemeScreen({ route }: ThemeScreenProps) {
  const index = route.params?.index ?? 0;
  return <Example index={index} />;
}

export default ThemeScreen;
