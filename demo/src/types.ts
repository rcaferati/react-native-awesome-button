import type { ReactNode } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type {
  ProgressCompletionHandler,
  ThemeName,
} from 'react-native-really-awesome-button';

export type DemoThemeStackParamList = {
  ThemeScreen: { index?: number } | undefined;
};

export type DemoTabParamList = {
  'Themed Buttons': undefined;
  Progress: undefined;
  Social: undefined;
};

export type ThemeScreenProps = NativeStackScreenProps<
  DemoThemeStackParamList,
  'ThemeScreen'
>;

export type ThemeScreenNavigationProp = NativeStackNavigationProp<
  DemoThemeStackParamList,
  'ThemeScreen'
>;

export type ThemeScreenRouteProp = RouteProp<
  DemoThemeStackParamList,
  'ThemeScreen'
>;

export type ProgressScreenProps = BottomTabScreenProps<
  DemoTabParamList,
  'Progress'
>;

export type SocialScreenProps = BottomTabScreenProps<
  DemoTabParamList,
  'Social'
>;

export type ThemeExampleProps = {
  index: number;
};

export type DemoSectionProps = {
  title: string;
  children: ReactNode;
};

export type DemoContainerProps = {
  children: ReactNode;
};

export type ThemeCharacterName = ThemeName;

export type ThemeCharacterConfig = {
  id: number;
  width: number;
  height: number;
  x: number;
  y: number;
};

export type ProgressDemoHandler = (
  next?: ProgressCompletionHandler
) => void;
