import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  ThemedButton,
  type ProgressCompletionHandler,
} from 'react-native-really-awesome-button';
import Container from '../components/Container';
import Section from '../components/Section';
import { AntDesign, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ProgressDemoHandler, SocialScreenProps } from '../types';

export default function Social({ navigation }: SocialScreenProps) {
  const handleTimeout: ProgressDemoHandler = (
    next?: ProgressCompletionHandler
  ) => {
    setTimeout(() => {
      next?.();
    }, 1000);
  };
  const theme = 'bojack';

  useEffect(() => {
    navigation.setOptions({
      title: 'Social Buttons',
      headerStyle: {
        backgroundColor: '#4f6fc4',
      },
      headerTintColor: '#FFF',
    });
  }, [navigation]);

  return (
    <Container>
      <Section title="Labeled Buttons">
        <ThemedButton
          name={theme}
          style={styles.button}
          progress
          onPress={handleTimeout}
          type="facebook"
          width={180}
          borderRadius={50}
          raiseLevel={8}>
          <FontAwesome
            style={[styles.iconLeft, { marginTop: -1 }]}
            name="facebook-square"
            size={24}
            color="white"
          />
          <Text style={styles.text}>Facebook</Text>
        </ThemedButton>
        <ThemedButton
          name={theme}
          style={styles.button}
          progress
          onPress={handleTimeout}
          type="twitter"
          width={180}
          borderRadius={8}
          raiseLevel={8}>
          <AntDesign
            style={[styles.iconLeft, { marginTop: 1, marginRight: 5 }]}
            name="twitter"
            size={24}
            color="white"
          />
          <Text style={styles.text}>Twitter</Text>
        </ThemedButton>
        <ThemedButton
          name={theme}
          style={styles.button}
          progress
          onPress={handleTimeout}
          type="messenger"
          width={180}
          borderRadius={0}
          raiseLevel={6}>
          <MaterialCommunityIcons
            style={[styles.iconLeft, { marginTop: 0, marginRight: 4 }]}
            name="facebook-messenger"
            size={25}
            color="white"
          />
          <Text style={styles.text}>Messenger</Text>
        </ThemedButton>
        <ThemedButton
          name={theme}
          backgroundDarker="#EAAC1E"
          progress
          backgroundProgress="rgba(0,0,0,0.15)"
          onPress={handleTimeout}
          extra={
            <LinearGradient
              colors={['#4C63D2', '#BC3081', '#F47133', '#FED576']}
              style={StyleSheet.absoluteFillObject}
            />
          }
          style={styles.button}
          width={180}
        >
          <FontAwesome
            style={[styles.iconLeft, { marginTop: -2, marginRight: 7 }]}
            name="instagram"
            size={24}
            color="white"
          />
          <Text style={styles.text}>Instagram</Text>
        </ThemedButton>
      </Section>
      <Section title="Iconed Buttons">
        <ThemedButton
          name={theme}
          style={styles.button}
          progress
          onPress={handleTimeout}
          type="whatsapp"
          width={60}
          borderRadius={0}
          raiseLevel={0}>
          <FontAwesome
            style={[styles.iconLeft, { marginTop: 0, marginRight: 0 }]}
            name="whatsapp"
            size={24}
            color="white"
          />
        </ThemedButton>
        <ThemedButton
          name={theme}
          style={styles.button}
          progress
          onPress={handleTimeout}
          type="youtube"
          width={60}
          borderRadius={0}
          raiseLevel={8}
        >
          <FontAwesome
            style={[styles.iconLeft, { marginTop: 0, marginRight: 0 }]}
            name="youtube"
            size={24}
            color="white"
          />
        </ThemedButton>
        <ThemedButton
          name={theme}
          style={styles.button}
          progress
          onPress={handleTimeout}
          type="linkedin"
          width={60}
          borderRadius={8}
          raiseLevel={8}>
          <FontAwesome
            style={[styles.iconLeft, { marginTop: 0, marginRight: 0 }]}
            name="linkedin"
            size={24}
            color="white"
          />
        </ThemedButton>
        <ThemedButton
          name={theme}
          style={styles.button}
          progress
          onPress={handleTimeout}
          type="pinterest"
          width={60}
          height={60}
          borderRadius={80}
          raiseLevel={8}>
          <FontAwesome
            style={[styles.iconLeft, { marginTop: 0, marginRight: 0 }]}
            name="pinterest"
            size={24}
            color="white"
          />
        </ThemedButton>
      </Section>
    </Container>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    marginBottom: 8,
  },
  text: {
    fontWeight: 'bold',
    color: 'white',
  },
  iconLeft: { marginRight: 8 },
});
