import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getTheme,
  ThemedButton,
  type RegisteredThemeDefinition,
} from '@rcaferati/react-native-awesome-button';
import ThemeScreen from '../screens/ThemeScreen';
import Sizing from '../screens/Sizing';
import Social from '../screens/Social';
import Progress from '../screens/Progress';
import { Entypo, Ionicons, FontAwesome5 } from '@expo/vector-icons';

type TabKey = 'Themed Buttons' | 'Sizing' | 'Progress' | 'Social';

type TabDef = {
  key: TabKey;
  icon: React.ReactNode;
};

const noopNavigation = {
  setOptions: () => {},
  navigate: () => {},
  goBack: () => {},
  push: () => {},
  pop: () => {},
  canGoBack: () => false,
  addListener: () => () => {},
  removeListener: () => {},
  isFocused: () => true,
  dispatch: () => {},
  reset: () => {},
  setParams: () => {},
  getState: () => undefined,
  getParent: () => undefined,
  getId: () => undefined,
} as unknown as any;

type HeaderNavButtonProps = {
  label: string;
  theme: RegisteredThemeDefinition;
  onPress: () => void;
};

function HeaderNavButton({ label, theme, onPress }: HeaderNavButtonProps) {
  return (
    <ThemedButton
      activeOpacity={0.6}
      backgroundActive="rgba(0, 0, 0, 0.05)"
      config={theme}
      debouncedPressTime={875}
      hitSlop={8}
      onPress={onPress}
      size="small"
      style={styles.headerButton}
      textColor={theme.color}
      type="flat"
      width={80}
    >
      {label}
    </ThemedButton>
  );
}

type ThemeHeaderProps = {
  theme: RegisteredThemeDefinition;
  onAdvance: () => void;
  onRetreat: () => void;
};

function ThemeHeader({ theme, onAdvance, onRetreat }: ThemeHeaderProps) {
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.header, { backgroundColor: theme.background }]}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerButtonSlot}>
          {theme.prev ? (
            <HeaderNavButton label="Prev" theme={theme} onPress={onRetreat} />
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, { color: theme.color }]}
        >
          {theme.title}
        </Text>
        <View style={[styles.headerButtonSlot, styles.headerButtonSlotRight]}>
          {theme.next ? (
            <HeaderNavButton label="Next" theme={theme} onPress={onAdvance} />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

type PlainHeaderProps = {
  title: string;
};

function PlainHeader({ title }: PlainHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.plainHeader}>
      <View style={styles.plainHeaderContent}>
        <Text numberOfLines={1} style={styles.plainHeaderTitle}>
          {title}
        </Text>
      </View>
    </SafeAreaView>
  );
}

type TabBarProps = {
  current: TabKey;
  tabs: TabDef[];
  onSelect: (key: TabKey) => void;
};

function TabBar({ current, tabs, onSelect }: TabBarProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.tabBar}>
      <View style={styles.tabBarRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === current;
          const color = isActive ? '#1775c8' : '#8e8e93';
          return (
            <Pressable
              key={tab.key}
              style={styles.tabBarItem}
              onPress={() => onSelect(tab.key)}
            >
              <View style={styles.tabBarIcon}>
                {React.isValidElement(tab.icon)
                  ? React.cloneElement(
                      tab.icon as React.ReactElement<{ color?: string }>,
                      { color }
                    )
                  : tab.icon}
              </View>
              <Text style={[styles.tabBarLabel, { color }]}>{tab.key}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function App() {
  const [tab, setTab] = useState<TabKey>('Themed Buttons');
  const [themeIndex, setThemeIndex] = useState(0);

  const theme = useMemo(() => getTheme(themeIndex), [themeIndex]);

  const handleAdvance = useCallback(() => {
    setThemeIndex((value) => value + 1);
  }, []);

  const handleRetreat = useCallback(() => {
    setThemeIndex((value) => Math.max(0, value - 1));
  }, []);

  const tabs = useMemo<TabDef[]>(
    () => [
      {
        key: 'Themed Buttons',
        icon: <Entypo name="palette" size={22} />,
      },
      {
        key: 'Sizing',
        icon: <Ionicons name="resize" size={22} />,
      },
      {
        key: 'Progress',
        icon: <Ionicons name="reload-circle" size={22} />,
      },
      {
        key: 'Social',
        icon: <FontAwesome5 name="share-alt" size={20} />,
      },
    ],
    []
  );

  const fakeRoute = useMemo(
    () => ({ key: 'ThemeScreen', name: 'ThemeScreen', params: { index: themeIndex } }) as any,
    [themeIndex]
  );

  let header: React.ReactNode = null;
  let body: React.ReactNode = null;

  if (tab === 'Themed Buttons') {
    header = (
      <ThemeHeader
        theme={theme}
        onAdvance={handleAdvance}
        onRetreat={handleRetreat}
      />
    );
    body = (
      <ThemeScreen
        key={themeIndex}
        navigation={noopNavigation}
        route={fakeRoute}
      />
    );
  } else if (tab === 'Sizing') {
    header = <PlainHeader title="Size Changes" />;
    body = <Sizing navigation={noopNavigation} route={{ key: 'Sizing', name: 'Sizing', params: undefined } as any} />;
  } else if (tab === 'Progress') {
    header = <PlainHeader title="Progress Buttons" />;
    body = <Progress navigation={noopNavigation} route={{ key: 'Progress', name: 'Progress', params: undefined } as any} />;
  } else {
    header = <PlainHeader title="Social Buttons" />;
    body = <Social navigation={noopNavigation} route={{ key: 'Social', name: 'Social', params: undefined } as any} />;
  }

  return (
    <View style={styles.root}>
      {header}
      <View style={styles.body}>{body}</View>
      <TabBar current={tab} tabs={tabs} onSelect={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenContainer: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1775c8',
  },
  headerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 8,
  },
  headerButtonSlot: {
    alignItems: 'flex-start',
    width: 88,
  },
  headerButtonSlotRight: {
    alignItems: 'flex-end',
  },
  headerButton: {
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  plainHeader: {
    backgroundColor: '#4f6fc4',
  },
  plainHeaderContent: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  plainHeaderTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: 'rgba(60, 60, 67, 0.29)',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarRow: {
    flexDirection: 'row',
    height: 52,
  },
  tabBarItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabBarIcon: {
    marginBottom: 2,
  },
  tabBarLabel: {
    fontSize: 10,
  },
});

export default App;
