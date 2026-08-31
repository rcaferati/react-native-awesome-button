import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ThemedButton,
  getTheme,
  type ButtonVariant,
  type ProgressCompletionHandler,
} from '@rcaferati/react-native-awesome-button';
import Container from './Container';
import Section from './Section';
import Character from './Character';
import DemoIcon from '../icons/DemoIcon';
import type { ProgressDemoHandler, ThemeExampleProps } from '../types';

const TRANSITION_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'anchor',
  'danger',
];
const TEXT_TRANSITION_LABELS = ['welcome', 'Level 2', 'Mission#42', 'Go#3'];
const HEAVY_JS_TASK_MS = 900;

function simulateHeavyJsTask(durationMs: number) {
  const start = Date.now();

  while (Date.now() - start < durationMs) {
    // Intentionally block the JS thread to simulate expensive work.
    Math.sqrt(Math.random() * durationMs);
  }
}

export default function Example({ index }: ThemeExampleProps) {
  const theme = getTheme(index);
  const [transitionVariantIndex, setTransitionVariantIndex] = useState(0);
  const [textTransitionIndex, setTextTransitionIndex] = useState(0);
  const transitionVariant = TRANSITION_VARIANTS[transitionVariantIndex];
  const textTransitionLabel = TEXT_TRANSITION_LABELS[textTransitionIndex];
  const handleTimeout: ProgressDemoHandler = (
    next?: ProgressCompletionHandler
  ) => {
    setTimeout(() => {
      next?.();
    }, 500);
  };
  const handleVariantTransitionPress = () => {
    setTransitionVariantIndex((currentIndex) => {
      return (currentIndex + 1) % TRANSITION_VARIANTS.length;
    });
  };
  const handleTextTransitionPress = () => {
    setTextTransitionIndex((currentIndex) => {
      return (currentIndex + 1) % TEXT_TRANSITION_LABELS.length;
    });
  };
  const handleHeavyStretchProgressPress: ProgressDemoHandler = (
    next?: ProgressCompletionHandler
  ) => {
    simulateHeavyJsTask(HEAVY_JS_TASK_MS);
    next?.();
  };

  useEffect(() => {
    setTransitionVariantIndex(0);
    setTextTransitionIndex(0);
  }, [theme.name]);

  return (
    <View style={styles.screen}>
      <Character char={theme.name} />
      <Container>
        <Section title="Common">
          <ThemedButton
            config={theme}
            style={styles.button}
            type="primary"
            size="medium"
          >
            Primary
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="secondary"
            size="medium"
          >
            Secondary
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="anchor"
            size="medium"
          >
            Anchor
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="danger"
            size="medium"
          >
            Danger
          </ThemedButton>
          <ThemedButton
            config={theme}
            disabled
            style={styles.button}
            type="primary"
            size="medium"
          >
            Disabled
          </ThemedButton>
        </Section>
        <Section title="Progress">
          <ThemedButton
            config={theme}
            progress
            onPress={handleTimeout}
            style={styles.button}
            type="primary"
            size="medium"
          >
            Primary
          </ThemedButton>
          <ThemedButton
            config={theme}
            progress
            onPress={handleTimeout}
            style={styles.button}
            type="secondary"
            size="medium"
          >
            Secondary
          </ThemedButton>
          <ThemedButton
            config={theme}
            progress
            onPress={handleTimeout}
            style={styles.button}
            type="anchor"
            size="medium"
          >
            Anchor
          </ThemedButton>
          <ThemedButton
            config={theme}
            progress
            onPress={handleTimeout}
            style={styles.button}
            type="danger"
            size="medium"
          >
            Danger
          </ThemedButton>
        </Section>
        <Section title="Variant Transition">
          <View style={styles.transitionControlRow}>
            <ThemedButton
              name={theme.name}
              style={styles.transitionPreviewButton}
              type={transitionVariant}
            >
              {transitionVariant}
            </ThemedButton>
            <ThemedButton
              name={theme.name}
              style={styles.transitionIconButton}
              type="flat"
              size="icon"
              accessibilityLabel="Cycle variant"
              onPress={handleVariantTransitionPress}
            >
              <DemoIcon
                name="right-left"
                size={18}
                color={theme.buttons.primary.backgroundColor ?? theme.color}
              />
            </ThemedButton>
          </View>
        </Section>
        <Section title="Text Transition">
          <View style={styles.transitionControlRow}>
            <ThemedButton
              config={theme}
              textTransition
              style={styles.transitionPreviewButton}
              type="primary"
            >
              {textTransitionLabel}
            </ThemedButton>
            <ThemedButton
              config={theme}
              style={styles.transitionIconButton}
              type="flat"
              size="icon"
              accessibilityLabel="Cycle text"
              onPress={handleTextTransitionPress}
            >
              <DemoIcon
                name="forward-step"
                size={18}
                color={theme.buttons.primary.backgroundColor ?? theme.color}
              />
            </ThemedButton>
          </View>
        </Section>
        <Section title="Empty Placeholder">
          <ThemedButton
            config={theme}
            style={styles.button}
            type="primary"
            size="medium"
          />
          <ThemedButton
            config={theme}
            style={styles.button}
            type="secondary"
            size="medium"
          />
          <ThemedButton
            config={theme}
            style={styles.button}
            type="anchor"
            size="medium"
          />
          <ThemedButton
            config={theme}
            style={styles.button}
            type="danger"
            size="medium"
          />
        </Section>
        <Section title="Flat Buttons">
          <ThemedButton
            config={theme}
            raiseLevel={0}
            activeOpacity={0.75}
            style={styles.button}
            type="primary"
            size="medium"
          >
            Primary
          </ThemedButton>
          <ThemedButton
            config={theme}
            raiseLevel={0}
            activeOpacity={0.75}
            style={styles.button}
            type="secondary"
            size="medium"
          >
            Secondary
          </ThemedButton>
          <ThemedButton
            config={theme}
            raiseLevel={0}
            activeOpacity={0.75}
            style={styles.button}
            type="anchor"
            size="medium"
          >
            Anchor
          </ThemedButton>
          <ThemedButton
            config={theme}
            raiseLevel={0}
            progress
            onPress={handleTimeout}
            activeOpacity={0.75}
            style={styles.button}
            type="danger"
            size="medium"
          >
            Danger
          </ThemedButton>
        </Section>

        <Section title="Before / After / Icon">
          <ThemedButton
            config={theme}
            style={styles.button}
            type="primary"
            size="medium"
            buttonStyle={{ contentGap: 8 }}
            before={
              <DemoIcon
                name="bars"
                size={24}
                color={theme.buttons.primary.textColor ?? theme.color}
              />
            }
          >
            Button Icon
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            buttonStyle={{ contentGap: 8 }}
            after={
              <DemoIcon
                name="table-cells-large"
                size={24}
                color={theme.buttons.anchor.textColor ?? theme.color}
              />
            }
            type="anchor"
            size="medium"
          >
            Button Icon
          </ThemedButton>
          <ThemedButton
            progress
            onPress={handleTimeout}
            config={theme}
            style={styles.button}
            type="danger"
            size="medium"
            buttonStyle={{ contentGap: 8 }}
            before={
              <DemoIcon
                name="trash-can"
                size={24}
                color={theme.buttons.danger.textColor ?? theme.color}
              />
            }
          >
            Button Icon
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="primary"
            size="icon"
            accessibilityLabel="Add"
          >
            <DemoIcon
              name="square-plus"
              size={24}
              color={theme.buttons.primary.textColor ?? theme.color}
            />
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="anchor"
            size="icon"
            accessibilityLabel="Add user"
          >
            <DemoIcon
              name="user-plus"
              size={24}
              color={theme.buttons.anchor.textColor ?? theme.color}
            />
          </ThemedButton>
          <ThemedButton
            progress
            onPress={handleTimeout}
            config={theme}
            style={styles.button}
            type="danger"
            size="icon"
            accessibilityLabel="Delete"
          >
            <DemoIcon
              name="trash-can"
              size={24}
              color={theme.buttons.danger.textColor ?? theme.color}
            />
          </ThemedButton>
        </Section>
        <Section title="With auto and stretch">
          <ThemedButton
            config={theme}
            width={null}
            style={styles.button}
            type="primary"
          >
            Primary Auto
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            width={null}
            type="secondary"
            size="small"
          >
            Secondary Small Auto
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="anchor"
            size="large"
          >
            Anchor Large Auto
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="danger"
            size="large"
            stretch
          >
            Primary Large Stretch
          </ThemedButton>
          <ThemedButton
            config={theme}
            style={styles.button}
            type="primary"
            size="large"
            progress
            stretch
            onPress={handleHeavyStretchProgressPress}
          >
            Stretch Progress + JS Load
          </ThemedButton>
        </Section>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 8,
    marginBottom: 8,
  },
  transitionControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  transitionPreviewButton: {
    marginTop: 0,
    marginBottom: 0,
  },
  transitionIconButton: {
    marginTop: 0,
    marginBottom: 0,
  },
});
