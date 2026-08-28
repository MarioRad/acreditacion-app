import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { iniciarSesion } from './api';
import { SERVIDOR_URL } from './config';

const CLAVE_CREDENCIALES = 'acreditacion.credenciales';

export default function PantallaLogin({ alIniciarSesion, onVolver }) {
  const [modo, setModo] = useState('contrasena');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [hayBiometria, setHayBiometria] = useState(false);
  const [hayCredenciales, setHayCredenciales] = useState(false);

  const cargarBiometria = async () => {
    try {
      const [disponible, inscrita] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setHayBiometria(disponible && inscrita);
      const cred = await SecureStore.getItemAsync(CLAVE_CREDENCIALES);
      setHayCredenciales(Boolean(cred));
    } catch (_) {
      setHayBiometria(false);
    }
  };

  useEffect(() => {
    cargarBiometria();
  }, []);

  const guardarCredenciales = async (u, p) => {
    try {
      await SecureStore.setItemAsync(CLAVE_CREDENCIALES, JSON.stringify({ u, p }));
    } catch (_) {
      /* noop */
    }
  };

  const entrar = async (u, p) => {
    if (cargando) return;
    setError('');
    setCargando(true);
    try {
      const sesion = await iniciarSesion(SERVIDOR_URL, u, p);
      await guardarCredenciales(u, p);
      alIniciarSesion(sesion);
    } catch (e) {
      setError(e.message || 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  const ingresarConPassword = () => entrar(usuario, password);

  const ingresarConHuella = async () => {
    if (cargando || !hayCredenciales) return;
    setError('');
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Autenticación para acceder',
      cancelLabel: 'Cancelar',
    });
    if (!res.success) return;
    let cred = null;
    try {
      const guardadas = await SecureStore.getItemAsync(CLAVE_CREDENCIALES);
      if (guardadas) cred = JSON.parse(guardadas);
    } catch (_) {
      cred = null;
    }
    if (!cred) {
      setError('No hay credenciales guardadas. Ingresá primero con tu contraseña.');
      return;
    }
    await entrar(cred.u, cred.p);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'android' ? undefined : 'padding'}
    >
      <ScrollView contentContainerStyle={styles.contenedor}>
        {onVolver ? (
          <Pressable style={styles.volver} onPress={onVolver}>
            <Text style={styles.volverTexto}>‹ Volver al menú</Text>
          </Pressable>
        ) : null}

        <Text style={styles.titulo}>Iniciar sesión</Text>
        <Text style={styles.subtitulo}>{SERVIDOR_URL}</Text>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, modo === 'contrasena' && styles.tabActivo]}
            onPress={() => setModo('contrasena')}
          >
            <Text style={[styles.tabTexto, modo === 'contrasena' && styles.tabTextoActivo]}>
              Contraseña
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, modo === 'huella' && styles.tabActivo, !hayBiometria && styles.tabDeshabilitado]}
            onPress={() => hayBiometria && setModo('huella')}
          >
            <Text style={[styles.tabTexto, modo === 'huella' && styles.tabTextoActivo]}>
              Huella
            </Text>
          </Pressable>
        </View>

        {modo === 'contrasena' ? (
          <>
            <Text style={styles.etiqueta}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="Usuario del panel"
              autoCapitalize="none"
              autoCorrect={false}
              value={usuario}
              onChangeText={setUsuario}
            />
            <Text style={styles.etiqueta}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={ingresarConPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.boton, cargando && styles.botonDeshabilitado]}
              onPress={ingresarConPassword}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonTexto}>Ingresar</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {!hayCredenciales ? (
              <Text style={styles.pistaHuella}>
                Primero ingresá con tu contraseña una vez para guardar tus credenciales y poder
                usar la huella después.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.boton, styles.botonHuella, cargando && styles.botonDeshabilitado]}
              onPress={ingresarConHuella}
              disabled={cargando || !hayCredenciales}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonTexto}>Ingresar con huella</Text>
              )}
            </Pressable>
            <Pressable style={styles.cambiar} onPress={() => setModo('contrasena')}>
              <Text style={styles.cambiarTexto}>Usar contraseña</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenedor: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#0f172a',
  },
  volver: {
    position: 'absolute',
    top: 44,
    left: 16,
  },
  volverTexto: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
    marginBottom: 22,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActivo: { backgroundColor: '#16a34a' },
  tabDeshabilitado: { opacity: 0.4 },
  tabTexto: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  tabTextoActivo: { color: '#fff' },
  etiqueta: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 12,
  },
  boton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  botonHuella: { marginTop: 8 },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  pistaHuella: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  cambiar: {
    marginTop: 16,
    alignItems: 'center',
  },
  cambiarTexto: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
  },
});
