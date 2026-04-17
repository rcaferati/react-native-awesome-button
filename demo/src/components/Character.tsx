import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  type ImageSourcePropType,
} from 'react-native';
import type { ThemeCharacterConfig, ThemeCharacterName } from '../types';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 0,
    bottom: 0,
    right: 0,
  },
  image: {
    width: 300,
    height: 450,
  },
});

const characters: Partial<Record<ThemeCharacterName, ThemeCharacterConfig>> = {
  bojack: {
    id: 1,
    width: 492 / 2,
    height: 696 / 2,
    x: 42,
    y: 0,
  },
  rick: {
    id: 2,
    width: 547 / 2,
    height: 768 / 2,
    x: 90,
    y: 0,
  },
  c137: {
    id: 3,
    width: 416 / 2,
    height: 639 / 2,
    x: 40,
    y: 0,
  },
  cartman: {
    id: 4,
    width: 640 / 2,
    height: 590 / 2,
    x: 70,
    y: 0,
  },
  bruce: {
    id: 5,
    width: 1280 / 3.5,
    height: 1538 / 3.5,
    x: 90,
    y: -25,
  },
  mysterion: {
    id: 6,
    width: 640 / 2,
    height: 590 / 2,
    x: 70,
    y: 0,
  },
  summer: {
    id: 7,
    width: 395 / 2,
    height: 727 / 2,
    x: 30,
    y: -10,
  },
};

const ASSETS = [
  require('../assets/bojack.png'),
  require('../assets/rick.png'),
  require('../assets/c137.png'),
  require('../assets/cartman.png'),
  require('../assets/batman.png'),
  require('../assets/mysterion.png'),
  require('../assets/summer.png'),
] as ImageSourcePropType[];

type CharacterProps = {
  char?: ThemeCharacterName;
};

const Character = ({ char = 'rick' }: CharacterProps) => {
  const image = characters[char];
  const animatedValue = useRef(new Animated.Value(0)).current;

  if (!image) {
    return null;
  }

  const animateCharacter = () => {
    Animated.spring(animatedValue, {
      toValue: 1,
      delay: 185,
      tension: 100,
      friction: 6.75,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    animateCharacter();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [200, image.x],
              }),
            },
          ],
        },
        {
          bottom: image.y,
        },
      ]}
    >
      {!!ASSETS && (
        <Image
          source={ASSETS[image.id - 1]}
          style={{ width: image.width, height: image.height }}
        />
      )}
    </Animated.View>
  );
};

export default Character;
