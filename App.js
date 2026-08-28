import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PantallaSplash from './src/PantallaSplash';
import PantallaMenu from './src/PantallaMenu';
import PantallaLogin from './src/PantallaLogin';
import PantallaEscanner from './src/PantallaEscanner';
import PantallaEntregaMenu from './src/PantallaEntregaMenu';
import PantallaNotificaciones from './src/PantallaNotificaciones';
import { prepararAudio } from './src/sonidos';

const CLAVE_SESION = 'acreditacion.sesion';

const PANTALLAS_SESION = {
  acreditaciones: 'escaner',
  entregaMenu: 'entregaMenu',
  notificaciones: 'notificaciones',
};

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarSplash, setMostrarSplash] = useState(true);
  const [pantalla, setPantalla] = useState('menu');

  useEffect(() => {
    (async () => {
      try {
        const guardada = await AsyncStorage.getItem(CLAVE_SESION);
        if (guardada) {
          const s = JSON.parse(guardada);
          if (s && s.servidorUrl && s.token) setSesion(s);
        }
      } catch (_) {
        /* sesión guardada corrupta: se ignora */
      } finally {
        setCargando(false);
      }
    })();
    prepararAudio();
  }, []);

  const guardarSesion = useCallback(async (nueva) => {
    setSesion(nueva);
    setPantalla('menu');
    try {
      await AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(nueva));
    } catch (_) {
      /* noop */
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    setSesion(null);
    setPantalla('menu');
    try {
      await AsyncStorage.removeItem(CLAVE_SESION);
    } catch (_) {
      /* noop */
    }
  }, []);

  const alElegirMenu = useCallback(
    (clave) => {
      if (PANTALLAS_SESION[clave]) {
        if (sesion) {
          setPantalla(PANTALLAS_SESION[clave]);
        } else {
          setPantalla('login');
        }
      }
    },
    [sesion]
  );

  const expirarSesion = useCallback(() => {
    cerrarSesion();
  }, [cerrarSesion]);

  let contenido;
  if (cargando || mostrarSplash) {
    contenido = <PantallaSplash onTerminar={() => setMostrarSplash(false)} />;
  } else if (pantalla === 'menu') {
    contenido = <PantallaMenu sesion={sesion} alElegir={alElegirMenu} cerrarSesion={cerrarSesion} />;
  } else if (pantalla === 'login') {
    contenido = (
      <PantallaLogin alIniciarSesion={guardarSesion} onVolver={() => setPantalla('menu')} />
    );
  } else if (pantalla === 'escaner') {
    contenido = (
      <PantallaEscanner
        sesion={sesion}
        alExpirarSesion={expirarSesion}
        onVolver={() => setPantalla('menu')}
      />
    );
  } else if (pantalla === 'entregaMenu') {
    contenido = (
      <PantallaEntregaMenu
        sesion={sesion}
        alExpirarSesion={expirarSesion}
        onVolver={() => setPantalla('menu')}
      />
    );
  } else if (pantalla === 'notificaciones') {
    contenido = (
      <PantallaNotificaciones
        sesion={sesion}
        alExpirarSesion={expirarSesion}
        onVolver={() => setPantalla('menu')}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar barStyle="light-content" />
      {contenido}
    </View>
  );
}
