import React, { useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getTheme } from '@rcaferati/react-native-awesome-button';
import ThemeScreen from '../screens/ThemeScreen';
import Sizing from '../screens/Sizing';
import Social from '../screens/Social';
import Progress from '../screens/Progress';
import DemoIcon from '../icons/DemoIcon';
import type { DemoTabParamList, DemoThemeStackParamList } from '../types';

const Tab = createBottomTabNavigator<DemoTabParamList>();
const Stack = createNativeStackNavigator<DemoThemeStackParamList>();

type ThemeScreenRoute = RouteProp<DemoThemeStackParamList, 'ThemeScreen'>;
type ThemeScreenNavigation = NativeStackNavigationProp<
  DemoThemeStackParamList,
  'ThemeScreen'
>;

type HeaderNavButtonProps = {
  color: string;
  label: string;
  onPress: () => void;
};

function HeaderNavButton({ color, label, onPress }: HeaderNavButtonProps) {
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        pressed ? styles.headerButtonPressed : null,
      ]}
    >
      <Text style={[styles.headerButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function HomeNavigator() {
  const transitionLockedRef = useRef(false);

  const handleAdvance = useCallback(
    (navigation: ThemeScreenNavigation, index: number) => {
      if (transitionLockedRef.current === true) {
        return;
      }

      transitionLockedRef.current = true;
      navigation.push('ThemeScreen', { index: index + 1 });
    },
    []
  );

  const handleRetreat = useCallback((navigation: ThemeScreenNavigation) => {
    if (
      transitionLockedRef.current === true ||
      navigation.canGoBack() !== true
    ) {
      return;
    }

    transitionLockedRef.current = true;
    navigation.pop();
  }, []);

  const options = ({
    route,
    navigation,
  }: {
    route: ThemeScreenRoute;
    navigation: ThemeScreenNavigation;
  }) => {
    const index = route.params?.index ?? 0;
    const theme = getTheme(index);

    const navigationOptions: NativeStackNavigationOptions = {
      title: theme.title,
      headerStyle: {
        backgroundColor: theme.background,
      },
      headerTintColor: theme.color,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerRight: () =>
        theme.next && (
          <HeaderNavButton
            color={theme.color}
            label="Next"
            onPress={() => handleAdvance(navigation, index)}
          />
        ),
      headerLeft: () =>
        theme.prev && (
          <HeaderNavButton
            color={theme.color}
            label="Prev"
            onPress={() => handleRetreat(navigation)}
          />
        ),
    };

    return navigationOptions;
  };

  return (
    <Stack.Navigator
      initialRouteName="ThemeScreen"
      screenListeners={{
        transitionEnd: () => {
          transitionLockedRef.current = false;
        },
        transitionStart: () => {
          transitionLockedRef.current = true;
        },
      }}
    >
      <Stack.Screen
        options={options}
        name="ThemeScreen"
        component={ThemeScreen}
      />
    </Stack.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }: { color: string }) => {
            if (route.name === 'Themed Buttons') {
              return <DemoIcon name="paintbrush" size={21} color={color} />;
            }

            if (route.name === 'Progress') {
              return <DemoIcon name="gauge" size={21} color={color} />;
            }

            if (route.name === 'Sizing') {
              return (
                <DemoIcon
                  name="up-right-and-down-left-from-center"
                  size={21}
                  color={color}
                />
              );
            }

            if (route.name === 'Social') {
              return <DemoIcon name="share-nodes" size={21} color={color} />;
            }

            return null;
          },
          tabBarActiveTintColor: '#038CD9',
          tabBarInactiveTintColor: '#C5C5C5',
        })}
      >
        <Tab.Screen
          options={{ headerShown: false, tabBarLabel: 'Themed' }}
          name="Themed Buttons"
          component={HomeNavigator}
        />
        <Tab.Screen name="Progress" component={Progress} />
        <Tab.Screen name="Social" component={Social} />
        <Tab.Screen
          options={{ tabBarLabel: 'Size Changes' }}
          name="Sizing"
          component={Sizing}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPressed: {
    opacity: 0.6,
  },
  headerButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default App;
