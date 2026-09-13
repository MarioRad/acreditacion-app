import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PantallaSplash from './src/PantallaSplash';
import PantallaMenu from './src/PantallaMenu';
import PantallaLogin from './src/PantallaLogin';
import PantallaEscanner from './src/PantallaEscanner';
import PantallaEntregaMenu from './src/PantallaEntregaMenu';
import PantallaNotificaciones from './src/PantallaNotificaciones';
import PantallaAsistenciaTaller from './src/PantallaAsistenciaTaller';
import PantallaDashboardAdmin from './src/PantallaDashboardAdmin';
import PantallaResumenDia from './src/PantallaResumenDia';
import PantallaAsignaciones from './src/PantallaAsignaciones';
import { prepararAudio } from './src/sonidos';

const CLAVE_SESION = 'acreditacion.sesion';

const PANTALLAS_SESION = {
  acreditaciones: 'escaner',
  entregaMenu: 'entregaMenu',
  notificaciones: 'notificaciones',
  asistenciaTaller: 'asistenciaTaller',
  dashboard: 'dashboard',
  resumenDia: 'resumenDia',
  asignaciones: 'asignaciones',
};

const ROLES_HERENCIA = {
  admin: ['admin','superior','menu','operador'],
  superior: ['superior','menu','operador'],
  menu: ['menu'],
  operador: ['operador'],
};
const PERMISOS_PANTALLA = {
  escaner: ['admin','superior','operador'],
  entregaMenu: ['admin','superior','menu'],
  asistenciaTaller: ['admin','superior','operador'],
  notificaciones: ['admin','superior','menu','operador'],
  dashboard: ['admin','superior'],
  resumenDia: ['admin','superior'],
  asignaciones: ['admin','superior'],
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
        if (!sesion) {
          setPantalla('login');
          return;
        }
        const destino = PANTALLAS_SESION[clave];
        const rol = sesion.rol || 'operador';
        const permitidos = PERMISOS_PANTALLA[destino] || [];
        const herencia = ROLES_HERENCIA[rol] || [rol];
        const ok = permitidos.some((r) => herencia.includes(r));
        if (!ok) {
          // sin permiso: permanecer en menú
          return;
        }
        setPantalla(destino);
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
  } else if (pantalla === 'asistenciaTaller') {
    contenido = <PantallaAsistenciaTaller sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla('menu')} />;
  } else if (pantalla === 'dashboard') {
    contenido = <PantallaDashboardAdmin sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla('menu')} />;
  } else if (pantalla === 'resumenDia') {
    contenido = <PantallaResumenDia sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla('menu')} />;
  } else if (pantalla === 'asignaciones') {
    contenido = <PantallaAsignaciones sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla('menu')} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar barStyle="light-content" />
      {contenido}
    </View>
  );
}
