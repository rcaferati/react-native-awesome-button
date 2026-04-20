import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AwesomeButton, {
  ThemedButton,
} from '@rcaferati/react-native-awesome-button';
import Container from '../components/Container';
import Section from '../components/Section';
import type { SizingScreenProps } from '../types';

const THEME_SIZES = ['small', 'medium', 'large'] as const;

export default function Sizing({ navigation }: SizingScreenProps) {
  const [isLongLabel, setIsLongLabel] = useState(false);
  const [sizeIndex, setSizeIndex] = useState(1);

  const currentThemeSize = THEME_SIZES[sizeIndex];
  const autoWidthLabel = isLongLabel ? 'Open analytics dashboard' : 'Open';

  const currentThemeSizeLabel = useMemo(
    () => currentThemeSize.charAt(0).toUpperCase() + currentThemeSize.slice(1),
    [currentThemeSize]
  );

  useEffect(() => {
    navigation.setOptions({
      title: 'Size Changes',
      headerStyle: {
        backgroundColor: '#4f6fc4',
      },
      headerTintColor: '#FFF',
    });
  }, [navigation]);

  return (
    <Container>
      <Section title="Auto Width String Change">
        <Text style={styles.caption}>
          Evaluates how the button reacts when a plain string label switches
          between short and long content.
        </Text>
        <Text style={styles.variantLabel}>With text transition</Text>
        <AwesomeButton style={styles.button} textTransition>
          {autoWidthLabel}
        </AwesomeButton>
        <Text style={styles.variantLabel}>Without text transition</Text>
        <AwesomeButton style={styles.button}>{autoWidthLabel}</AwesomeButton>
        <ThemedButton
          name="basic"
          style={styles.controlButton}
          type="secondary"
          onPress={() => setIsLongLabel((currentValue) => !currentValue)}
        >
          Toggle Label Length
        </ThemedButton>
      </Section>

      <Section title="Themed Fixed Size Change">
        <Text style={styles.caption}>
          Evaluates how a themed button behaves when its built-in size preset
          changes between fixed widths.
        </Text>
        <ThemedButton
          name="rick"
          type="primary"
          size={currentThemeSize}
          style={styles.button}
        >
          {currentThemeSizeLabel}
        </ThemedButton>
        <ThemedButton
          name="basic"
          style={styles.controlButton}
          type="secondary"
          onPress={() =>
            setSizeIndex((currentValue) => (currentValue + 1) % THEME_SIZES.length)
          }
        >
          Cycle Theme Size
        </ThemedButton>
      </Section>

      <Section title="Scope">
        <View style={styles.scopeCard}>
          <Text style={styles.scopeText}>
            This screen is the dedicated RN size-behavior reference for future
            parity work with the web packages.
          </Text>
        </View>
      </Section>
    </Container>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: '#5B6472',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
    maxWidth: 320,
  },
  variantLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 6,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  button: {
    marginTop: 8,
    marginBottom: 8,
  },
  controlButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  scopeCard: {
    backgroundColor: '#EFF4FF',
    borderColor: '#D5E3FF',
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 320,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scopeText: {
    color: '#38507B',
    fontSize: 13,
    lineHeight: 19,
  },
});
