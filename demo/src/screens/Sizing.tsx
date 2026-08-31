import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemedButton } from '@rcaferati/react-native-awesome-button';
import Container from '../components/Container';
import Section from '../components/Section';
import type { SizingScreenProps } from '../types';

const THEME_SIZES = ['small', 'medium', 'large'] as const;
const CONTROL_BUTTON_STYLE = {
  activeOpacity: 0.6,
  raiseAmount: 0,
} as const;

type TextDemoButtonProps = {
  animateSize?: boolean;
  label: string;
  textTransition?: boolean;
};

function TextDemoButton({
  animateSize = true,
  label,
  textTransition = false,
}: TextDemoButtonProps) {
  return (
    <ThemedButton
      animateSize={animateSize}
      autoWidth
      containerStyle={styles.button}
      name="bruce"
      textTransition={textTransition}
      type="anchor"
    >
      {label}
    </ThemedButton>
  );
}

export default function Sizing({ navigation }: SizingScreenProps) {
  const [isLongLabel, setIsLongLabel] = useState(false);
  const [sizeIndex, setSizeIndex] = useState(1);

  const currentThemeSize = THEME_SIZES[sizeIndex] ?? THEME_SIZES[0];
  const autoWidthLabel = isLongLabel ? 'View analytics dashboard' : 'Launch';

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
    <View style={styles.screen}>
      <Container>
        <View style={styles.content}>
          <Section title="Auto Width String Change">
            <Text style={styles.caption}>
              Evaluates how the button reacts when a plain string label switches
              between short and long content.
            </Text>
            <ThemedButton
              autoWidth
              buttonStyle={CONTROL_BUTTON_STYLE}
              containerStyle={styles.button}
              name="bruce"
              onPress={() => setIsLongLabel((currentValue) => !currentValue)}
              size="small"
              type="secondary"
            >
              Toggle Label Length
            </ThemedButton>
            <Text style={styles.variantLabel}>
              Animated with text transition
            </Text>
            <TextDemoButton label={autoWidthLabel} textTransition />
            <Text style={styles.variantLabel}>
              Animated without text transition
            </Text>
            <TextDemoButton label={autoWidthLabel} />
            <Text style={styles.variantLabel}>Instant opt-out</Text>
            <TextDemoButton animateSize={false} label={autoWidthLabel} />
          </Section>

          <Section title="Themed Fixed Size Change">
            <Text style={styles.caption}>
              Evaluates how a themed button behaves when its built-in size
              preset changes between fixed widths.
            </Text>
            <ThemedButton
              autoWidth
              buttonStyle={CONTROL_BUTTON_STYLE}
              containerStyle={styles.button}
              name="bruce"
              onPress={() =>
                setSizeIndex(
                  (currentValue) => (currentValue + 1) % THEME_SIZES.length
                )
              }
              size="small"
              type="secondary"
            >
              Cycle Theme Size
            </ThemedButton>
            <Text style={styles.variantLabel}>
              Animated with text transition
            </Text>
            <ThemedButton
              containerStyle={styles.button}
              name="bruce"
              size={currentThemeSize}
              textTransition
              type="danger"
            >
              {currentThemeSizeLabel}
            </ThemedButton>
            <Text style={styles.variantLabel}>
              Animated without text transition
            </Text>
            <ThemedButton
              containerStyle={styles.button}
              name="bruce"
              size={currentThemeSize}
              type="danger"
            >
              {currentThemeSizeLabel}
            </ThemedButton>
            <Text style={styles.variantLabel}>Instant opt-out</Text>
            <ThemedButton
              animateSize={false}
              containerStyle={styles.button}
              name="bruce"
              size={currentThemeSize}
              type="danger"
            >
              {currentThemeSizeLabel}
            </ThemedButton>
          </Section>
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFF',
  },
  content: {
    width: '100%',
    maxWidth: 520,
  },
  caption: {
    color: '#5B6472',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
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
});
