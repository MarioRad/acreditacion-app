import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, View, Pressable, Text, StyleSheet } from 'react-native';
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
import SideBar from './src/SideBar';
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
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
    const esAdmin = nueva?.rol === 'admin' || nueva?.rol === 'superior';
    setPantalla(esAdmin ? 'dashboard' : 'menu');
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

  // sidebar necesita mapear vista activa
  const vistaParaSideBar = (() => {
    if (pantalla === 'escaner') return 'acreditaciones';
    if (pantalla === 'entregaMenu') return 'entregaMenu';
    if (pantalla === 'asistenciaTaller') return 'asistenciaTaller';
    return pantalla;
  })();
  const esAdminLayout = sesion && (sesion.rol === 'admin' || sesion.rol === 'superior');
  const mostrarTopBar = sesion && !cargando && !mostrarSplash && pantalla !== 'login';

  const onSelectSidebar = (clave) => {
    if (['pagos','usuarios'].includes(clave)) {
      // aún no implementado en móvil, mostrar dashboard como fallback con aviso
      setPantalla('dashboard');
      return;
    }
    alElegirMenu(clave);
  };

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
        onVolver={() => setPantalla(esAdminLayout ? 'dashboard' : 'menu')}
      />
    );
  } else if (pantalla === 'entregaMenu') {
    contenido = (
      <PantallaEntregaMenu
        sesion={sesion}
        alExpirarSesion={expirarSesion}
        onVolver={() => setPantalla(esAdminLayout ? 'dashboard' : 'menu')}
      />
    );
  } else if (pantalla === 'notificaciones') {
    contenido = (
      <PantallaNotificaciones
        sesion={sesion}
        alExpirarSesion={expirarSesion}
        onVolver={() => setPantalla(esAdminLayout ? 'dashboard' : 'menu')}
      />
    );
  } else if (pantalla === 'asistenciaTaller') {
    contenido = <PantallaAsistenciaTaller sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla(esAdminLayout ? 'dashboard' : 'menu')} />;
  } else if (pantalla === 'dashboard') {
    contenido = <PantallaDashboardAdmin sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla('menu')} />;
  } else if (pantalla === 'resumenDia') {
    contenido = <PantallaResumenDia sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla('dashboard')} />;
  } else if (pantalla === 'asignaciones') {
    contenido = <PantallaAsignaciones sesion={sesion} alExpirarSesion={expirarSesion} onVolver={() => setPantalla('dashboard')} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar barStyle="light-content" />
      {mostrarTopBar ? (
        <View style={styles.topBar}>
          <Pressable onPress={()=>setSidebarVisible(true)} style={styles.hamburger}><Text style={styles.hamburgerTxt}>☰</Text></Pressable>
          <Text style={styles.topBarTitle}>{pantalla==='dashboard' ? 'Dashboard' : pantalla==='menu' ? 'Menú' : pantalla}</Text>
          <View style={styles.topBarActions}>
            <Text style={styles.usuarioTop} numberOfLines={1}>{sesion?.nombre || ''}</Text>
            <Pressable onPress={cerrarSesion} style={styles.botonSalir}><Text style={styles.botonSalirTxt}>Salir</Text></Pressable>
          </View>
        </View>
      ) : null}
      <View style={{ flex:1 }}>
        {contenido}
      </View>
      <SideBar visible={sidebarVisible} onClose={()=>setSidebarVisible(false)} onSelect={onSelectSidebar} sesion={sesion} vistaActiva={vistaParaSideBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection:'row', alignItems:'center', paddingTop:44, paddingBottom:10, paddingHorizontal:12, backgroundColor:'#0f172a', borderBottomWidth:1, borderBottomColor:'#1e293b', gap:10 },
  hamburger: { width:40, height:40, borderRadius:8, backgroundColor:'#1e293b', alignItems:'center', justifyContent:'center' },
  hamburgerTxt: { color:'#f8fafc', fontSize:18, fontWeight:'bold' },
  topBarTitle: { flex:1, color:'#f8fafc', fontSize:16, fontWeight:'bold' },
  topBarActions: { flexDirection:'row', alignItems:'center', gap:8, maxWidth:160 },
  usuarioTop: { color:'#94a3b8', fontSize:12, maxWidth:90 },
  botonSalir: { backgroundColor:'rgba(239,68,68,0.15)', paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  botonSalirTxt: { color:'#f87171', fontSize:12, fontWeight:'bold' },
});
