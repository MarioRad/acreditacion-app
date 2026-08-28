import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { verificarCodigo } from './api';
import { tieneRestriccionAlimentaria } from './OverlayResultado';
import { prepararAudio, sonarBipError, sonarBipOk } from './sonidos';

const ETIQUETAS_ALIMENTACION = {
  vegano: 'VEGANO',
  sin_tacc: 'SIN TACC',
  sin_lactosa: 'SIN LACTOSA',
  otro: 'DIETA ESPECIAL',
};

export default function PantallaEntregaMenu({ sesion, alExpirarSesion, onVolver }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('escaneando');
  const [procesando, setProcesando] = useState(false);
  const [antorcha, setAntorcha] = useState(false);
  const [error, setError] = useState('');

  const bloqueadoRef = useRef(false);

  useEffect(() => {
    prepararAudio();
  }, []);

  const reanudar = useCallback(() => {
    bloqueadoRef.current = false;
    setDatos(null);
    setEstado('escaneando');
    setProcesando(false);
    setError('');
  }, []);

  const manejarLectura = useCallback(
    async ({ data }) => {
      if (bloqueadoRef.current) return;
      bloqueadoRef.current = true;
      setProcesando(true);
      try {
        const r = await verificarCodigo(sesion, data);
        if (r.encontrado) {
          sonarBipOk();
          Vibration.vibrate(120);
          setDatos(r);
          setEstado('confirmar');
        } else {
          sonarBipError();
          Vibration.vibrate([0, 90, 70, 90]);
          setError('No se encontró al asistente en la base de datos.');
          setEstado('no-encontrado');
        }
      } catch (e) {
        sonarBipError();
        Vibration.vibrate([0, 90, 70, 90]);
        if (e.sesionExpirada) {
          alExpirarSesion();
          return;
        }
        setError(e.message || 'Error al verificar.');
        setEstado('no-encontrado');
      } finally {
        setProcesando(false);
      }
    },
    [sesion, alExpirarSesion]
  );

  const confirmarEntrega = () => {
    setEstado('entregado');
    sonarBipOk();
    Vibration.vibrate(120);
  };

  if (!permiso) {
    return <View style={styles.centro} />;
  }

  if (!permiso.granted) {
    return (
      <View style={[styles.centro, styles.fondoPermiso]}>
        <Text style={styles.permisoTexto}>Se necesita acceso a la cámara para escanear los códigos QR.</Text>
        <Pressable style={styles.botonPermiso} onPress={pedirPermiso}>
          <Text style={styles.botonPermisoTexto}>Conceder permiso</Text>
        </Pressable>
      </View>
    );
  }

  const alimentacion = datos ? datos.alimentacion : '';
  const restriccion = tieneRestriccionAlimentaria(alimentacion);

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={antorcha}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={estado === 'escaneando' && !procesando ? manejarLectura : undefined}
      />

      {estado === 'escaneando' ? (
        <View style={styles.marco} pointerEvents="none">
          <View style={styles.visor} />
          <Text style={styles.ayuda}>Escaneá el QR del asistente</Text>
        </View>
      ) : null}

      <View style={styles.barra}>
        <Pressable style={styles.botonBarra} onPress={onVolver}>
          <Text style={styles.botonBarraTexto}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.barraTitulo}>Entrega de Menú</Text>
        <Pressable style={styles.botonBarra} onPress={() => setAntorcha((v) => !v)}>
          <Text style={styles.botonBarraTexto}>{antorcha ? '🔆' : '🔅'}</Text>
        </Pressable>
      </View>

      {procesando ? (
        <View style={styles.cargando} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.cargandoTexto}>Buscando…</Text>
        </View>
      ) : null}

      {estado === 'confirmar' && datos ? (
        <View style={styles.panelConfirmar}>
          <Text style={styles.glifoConfirmar}>🍽️</Text>
          <Text style={styles.tituloConfirmar}>¿Confirmar entrega?</Text>
          <ScrollView style={styles.detalle} contentContainerStyle={styles.detalleContenido} showsVerticalScrollIndicator={false}>
            <Text style={styles.nombre}>
              {[datos.apellido, datos.nombre].filter(Boolean).join(', ')}
            </Text>
            {datos.dni ? <Text style={styles.dato}>DNI {datos.dni}</Text> : null}
            {restriccion ? (
              <View style={styles.restriccionChip}>
                <Text style={styles.restriccionTexto}>
                  ⚠ {ETIQUETAS_ALIMENTACION[alimentacion] || String(alimentacion).toUpperCase()}
                </Text>
              </View>
            ) : null}
          </ScrollView>
          <Pressable style={styles.botonCheck} onPress={confirmarEntrega}>
            <Text style={styles.botonCheckTexto}>✓ Confirmar entrega</Text>
          </Pressable>
          <Pressable style={styles.botonCancelar} onPress={reanudar}>
            <Text style={styles.botonCancelarTexto}>Cancelar y volver a escanear</Text>
          </Pressable>
        </View>
      ) : null}

      {estado === 'entregado' ? (
        <Pressable style={styles.fondoEntregado} onPress={reanudar}>
          <Text style={styles.glifoEntregado}>✓</Text>
          <Text style={styles.leyendaEntregado}>Menú entregado</Text>
          <Text style={styles.pista}>Tocá la pantalla para continuar</Text>
        </Pressable>
      ) : null}

      {estado === 'no-encontrado' ? (
        <Pressable style={styles.fondoError} onPress={reanudar}>
          <Text style={styles.glifoError}>✕</Text>
          <Text style={styles.leyendaError}>{error}</Text>
          <Text style={styles.pista}>Tocá la pantalla para continuar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fondoPermiso: { backgroundColor: '#0f172a', padding: 30 },
  permisoTexto: { color: '#e2e8f0', fontSize: 16, textAlign: 'center' },
  botonPermiso: {
    marginTop: 20,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  botonPermisoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  marco: {
    ...StyleSheet.absoluteFillObject,
  },
  visor: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    marginTop: -130,
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
  },
  ayuda: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    marginTop: 150,
    color: '#fff',
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 46,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15,23,42,0.75)',
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
  botonBarraTexto: { color: '#fff', fontSize: 15 },
  cargando: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cargandoTexto: { color: '#fff', marginTop: 12, fontSize: 16 },
  panelConfirmar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  glifoConfirmar: { fontSize: 44, textAlign: 'center' },
  tituloConfirmar: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  detalle: { maxHeight: 140 },
  detalleContenido: { alignItems: 'center' },
  nombre: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  dato: { color: '#cbd5e1', fontSize: 14, marginTop: 4, textAlign: 'center' },
  restriccionChip: {
    backgroundColor: '#fde047',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#854d0e',
    alignSelf: 'center',
  },
  restriccionTexto: {
    color: '#713f12',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  botonCheck: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  botonCheckTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  botonCancelar: { alignItems: 'center', marginTop: 12 },
  botonCancelarTexto: { color: '#94a3b8', fontSize: 15 },
  fondoEntregado: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glifoEntregado: { color: '#4ade80', fontSize: 130, lineHeight: 150, fontWeight: 'bold' },
  leyendaEntregado: { color: '#fff', fontSize: 25, fontWeight: 'bold', textAlign: 'center' },
  fondoError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#b91c1c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glifoError: { color: '#fca5a5', fontSize: 130, lineHeight: 150, fontWeight: 'bold' },
  leyendaError: { color: '#fff', fontSize: 23, fontWeight: 'bold', textAlign: 'center' },
  pista: {
    position: 'absolute',
    bottom: 34,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
});
