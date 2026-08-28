import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { obtenerNotificaciones } from './api';

const INFO_TIPO = {
  info: { icono: 'ℹ️', etiqueta: 'Información', color: '#38bdf8' },
  alerta: { icono: '⚠️', etiqueta: 'Alerta', color: '#facc15' },
  urgente: { icono: '🚨', etiqueta: 'Urgente', color: '#ef4444' },
  recordatorio: { icono: '⏰', etiqueta: 'Recordatorio', color: '#a78bfa' },
};

const MS_AUTO_REFRESCO = 15000;

function formatearFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PantallaNotificaciones({ sesion, alExpirarSesion, onVolver }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [refrescando, setRefrescando] = useState(false);
  const enCursoRef = useRef(false);

  const obtener = useCallback(async () => {
    const r = await obtenerNotificaciones(sesion);
    setNotificaciones(r.notificaciones || []);
    setEstado('lista');
  }, [sesion]);

  const manejarError = useCallback(
    (e) => {
      if (e.sesionExpirada) {
        alExpirarSesion();
        return true;
      }
      setError(e.message || 'No se pudieron cargar las notificaciones.');
      setEstado('error');
      return false;
    },
    [alExpirarSesion]
  );

  const cargar = useCallback(async () => {
    if (enCursoRef.current) return;
    enCursoRef.current = true;
    setEstado('cargando');
    setError('');
    try {
      await obtener();
    } catch (e) {
      manejarError(e);
    } finally {
      enCursoRef.current = false;
    }
  }, [obtener, manejarError]);

  const refrescar = useCallback(
    async (silencioso = false) => {
      if (enCursoRef.current) return;
      enCursoRef.current = true;
      if (!silencioso) setRefrescando(true);
      setError('');
      try {
        await obtener();
      } catch (e) {
        manejarError(e);
      } finally {
        enCursoRef.current = false;
        if (!silencioso) setRefrescando(false);
      }
    },
    [obtener, manejarError]
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const id = setInterval(() => {
      refrescar(true);
    }, MS_AUTO_REFRESCO);
    return () => clearInterval(id);
  }, [refrescar]);

  const sinConexion = error.startsWith('Sin conexión');

  return (
    <View style={styles.flex}>
      <View style={styles.barra}>
        <Pressable style={styles.botonBarra} onPress={onVolver}>
          <Text style={styles.botonBarraTexto}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.barraTitulo}>Notificaciones</Text>
        <Pressable
          style={[styles.botonBarra, refrescando && styles.botonBarraDeshabilitado]}
          onPress={refrescar}
          disabled={refrescando}
        >
          <Text style={styles.botonBarraTexto}>↻</Text>
        </Pressable>
      </View>

      {estado === 'cargando' ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.cargandoTexto}>Cargando notificaciones…</Text>
        </View>
      ) : estado === 'error' ? (
        <View style={styles.centro}>
          <Text style={styles.errorIcono}>{sinConexion ? '📡' : '⚠️'}</Text>
          <Text style={styles.errorTitulo}>
            {sinConexion ? 'Sin conexión' : 'No se pudieron cargar'}
          </Text>
          <Text style={styles.errorDescripcion}>{error}</Text>
          <Pressable style={styles.botonReintentar} onPress={cargar}>
            <Text style={styles.botonReintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : notificaciones.length === 0 ? (
        <ScrollView contentContainerStyle={styles.contenedorVacio}>
          <View style={styles.vacio}>
            <Text style={styles.icono}>🔔</Text>
            <Text style={styles.vacioTitulo}>Sin notificaciones</Text>
            <Text style={styles.vacioDescripcion}>
              Aquí verás los avisos y novedades del encuentro.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor="#38bdf8" />
          }
        >
          {notificaciones.map((n) => {
            const tipo = INFO_TIPO[String(n.tipo)] || INFO_TIPO.info;
            return (
              <View key={n.id} style={[styles.tarjeta, { borderLeftColor: tipo.color }]}>
                <View style={styles.tarjetaEncabezado}>
                  <Text style={styles.tipoIcono}>{tipo.icono}</Text>
                  <Text style={[styles.tipoTexto, { color: tipo.color }]}>{tipo.etiqueta}</Text>
                  <Text style={styles.fecha}>{n.creado_en_texto || formatearFecha(n.creado_en)}</Text>
                </View>
                <Text style={styles.titulo}>{n.titulo}</Text>
                {n.mensaje ? <Text style={styles.mensaje}>{n.mensaje}</Text> : null}
              </View>
            );
          })}
          <Text style={styles.footer}>Se actualiza automáticamente cada 15 s</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 46,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15,23,42,0.95)',
  },
  barraTitulo: { color: '#f8fafc', fontSize: 17, fontWeight: 'bold' },
  botonBarra: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 60,
    alignItems: 'center',
  },
  botonBarraDeshabilitado: { opacity: 0.5 },
  botonBarraTexto: { color: '#fff', fontSize: 15 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  cargandoTexto: { color: '#94a3b8', fontSize: 14, marginTop: 12 },
  errorIcono: { fontSize: 52 },
  errorTitulo: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  errorDescripcion: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  botonReintentar: {
    marginTop: 18,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  botonReintentarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  contenedorVacio: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  vacio: { alignItems: 'center' },
  icono: { fontSize: 56 },
  vacioTitulo: { color: '#e2e8f0', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  vacioDescripcion: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  lista: { padding: 16, paddingBottom: 32 },
  footer: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  tarjeta: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 14,
  },
  tarjetaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipoIcono: { fontSize: 18, marginRight: 6 },
  tipoTexto: { fontSize: 13, fontWeight: 'bold', flex: 1 },
  fecha: { color: '#64748b', fontSize: 12 },
  titulo: { color: '#f8fafc', fontSize: 17, fontWeight: 'bold' },
  mensaje: { color: '#cbd5e1', fontSize: 14, marginTop: 6, lineHeight: 20 },
});