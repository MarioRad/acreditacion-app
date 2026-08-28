import React, { useEffect } from 'react';
import { Animated, Image, StyleSheet, Text } from 'react-native';

const MS_SPLASH = 1800;

export default function PantallaSplash({ onTerminar }) {
  const opacidad = React.useRef(new Animated.Value(0)).current;
  const escala = React.useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacidad, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(escala, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(onTerminar, MS_SPLASH);
    return () => clearTimeout(t);
  }, [opacidad, escala, onTerminar]);

  return (
    <Animated.View style={[styles.fondo, { opacity: opacidad }]}>
      <Animated.Image
        source={require('../assets/logo.png')}
        style={[styles.logo, { transform: [{ scale: escala }] }]}
        resizeMode="contain"
      />
      <Text style={styles.subtitulo}>Encuentro Nacional Dramatiza Salta 2026</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  logo: {
    width: '88%',
    maxWidth: 420,
    height: 160,
  },
  subtitulo: {
    marginTop: 18,
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
