import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { crearNotificacion, obtenerNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from './api';

const INFO_TIPO = {
  info: { icono: 'ℹ️', etiqueta: 'Información', color: '#38bdf8' },
  alerta: { icono: '⚠️', etiqueta: 'Alerta', color: '#facc15' },
  urgente: { icono: '🚨', etiqueta: 'Urgente', color: '#ef4444' },
  recordatorio: { icono: '⏰', etiqueta: 'Recordatorio', color: '#a78bfa' },
};

const TIPOS_OPCIONES = ['info', 'alerta', 'urgente', 'recordatorio'];

const MS_AUTO_REFRESCO = 15000;

function formatearFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function tiempoRelativo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs} h`;
  const dias = Math.floor(hs / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return formatearFecha(iso);
}

export default function PantallaNotificaciones({ sesion, alExpirarSesion, onVolver }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [refrescando, setRefrescando] = useState(false);
  const enCursoRef = useRef(false);
  const [filtroTipo, setFiltroTipo] = useState('todas'); // todas | no_leidas | info | alerta | urgente | recordatorio

  // Admin: formulario envío
  const esAdmin = sesion?.rol === 'admin';
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoSel, setTipoSel] = useState('info');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [exitoEnvio, setExitoEnvio] = useState('');

  const obtener = useCallback(async () => {
    const r = await obtenerNotificaciones(sesion);
    const lista = r.notificaciones || [];
    // ordenar: no leídas primero, luego leídas al fondo
    lista.sort((a,b) => Number(a.leida) - Number(b.leida));
    setNotificaciones(lista);
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

  const enviarNotificacion = useCallback(async () => {
    const t = titulo.trim();
    const m = mensaje.trim();
    if (t.length < 2 || t.length > 200) {
      setErrorEnvio('El título debe tener entre 2 y 200 caracteres.');
      return;
    }
    if (!m || m.length > 2000) {
      setErrorEnvio('El mensaje es obligatorio (máximo 2000 caracteres).');
      return;
    }
    setEnviando(true);
    setErrorEnvio('');
    setExitoEnvio('');
    try {
      await crearNotificacion(sesion, { titulo: t, mensaje: m, tipo: tipoSel });
      setExitoEnvio('Notificación enviada');
      setTitulo('');
      setMensaje('');
      setTipoSel('info');
      await obtener();
      setTimeout(() => {
        setMostrarForm(false);
        setExitoEnvio('');
      }, 1200);
    } catch (e) {
      if (e.sesionExpirada) {
        alExpirarSesion();
        return;
      }
      setErrorEnvio(e.message || 'No se pudo enviar la notificación.');
    } finally {
      setEnviando(false);
    }
  }, [sesion, titulo, mensaje, tipoSel, obtener, alExpirarSesion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!mostrarForm) refrescar(true);
    }, MS_AUTO_REFRESCO);
    return () => clearInterval(id);
  }, [refrescar, mostrarForm]);

  const marcarLeida = useCallback(async (id) => {
    try { await marcarNotificacionLeida(sesion, id); } catch (_) {}
    setNotificaciones(prev => {
      const upd = prev.map(n => n.id===id ? { ...n, leida:true } : n);
      upd.sort((a,b)=> Number(a.leida)-Number(b.leida));
      return upd;
    });
  }, [sesion]);

  const marcarTodas = useCallback(async () => {
    try { await marcarTodasLeidas(sesion); } catch (_) {}
    setNotificaciones(prev => prev.map(n=> ({...n, leida:true})));
  }, [sesion]);

  const sinConexion = error.startsWith('Sin conexión');

  const noLeidas = notificaciones.filter(n=>!n.leida).length;
  const leidas = notificaciones.filter(n=>n.leida).length;
  const filtradas = notificaciones.filter(n=>{
    if (filtroTipo==='todas') return true;
    if (filtroTipo==='no_leidas') return !n.leida;
    return String(n.tipo)===filtroTipo;
  });
  const filtradasNoLeidas = filtradas.filter(n=>!n.leida);
  const filtradasLeidas = filtradas.filter(n=>n.leida);

  return (
    <View style={styles.flex}>
      <View style={styles.barra}>
        <Pressable style={styles.botonBarra} onPress={onVolver}>
          <Text style={styles.botonBarraTexto}>‹ Volver</Text>
        </Pressable>
        <View style={styles.barraCentro}>
          <Text style={styles.barraTitulo}>Notificaciones</Text>
          {esAdmin ? <Text style={styles.badgeAdmin}>ADMIN</Text> : null}
          {noLeidas>0 ? <Text style={styles.badgeNoLeidas}>{noLeidas} nuevas</Text> : null}
        </View>
        <View style={styles.barraAcciones}>
          {esAdmin ? (
            <Pressable
              style={[styles.botonBarra, styles.botonNuevo]}
              onPress={() => { setErrorEnvio(''); setExitoEnvio(''); setMostrarForm(true); }}
            >
              <Text style={styles.botonNuevoTexto}>＋ Nuevo</Text>
            </Pressable>
          ) : null}
          {noLeidas>0 ? (
            <Pressable style={[styles.botonBarra, styles.botonMarcar]} onPress={marcarTodas}>
              <Text style={styles.botonMarcarTexto}>✓ Leídas</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.botonBarra, refrescando && styles.botonBarraDeshabilitado]}
            onPress={() => refrescar(false)}
            disabled={refrescando}
          >
            <Text style={styles.botonBarraTexto}>↻</Text>
          </Pressable>
        </View>
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
        <ScrollView
          contentContainerStyle={styles.contenedorVacio}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => refrescar(false)} tintColor="#38bdf8" />}
        >
          <View style={styles.vacio}>
            <Text style={styles.icono}>🔔</Text>
            <Text style={styles.vacioTitulo}>Sin notificaciones</Text>
            <Text style={styles.vacioDescripcion}>
              Aquí verás los avisos y novedades del encuentro. Pull para actualizar.
            </Text>
            {esAdmin ? (
              <Pressable style={styles.botonReintentar} onPress={() => setMostrarForm(true)}>
                <Text style={styles.botonReintentarTexto}>＋ Crear notificación</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={() => refrescar(false)} tintColor="#38bdf8" />
          }
        >
          {/* KPIs compactos */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiMini, { borderTopColor: '#38bdf8' }]}><Text style={styles.kpiMiniLabel}>Total</Text><Text style={styles.kpiMiniValor}>{notificaciones.length}</Text></View>
            <View style={[styles.kpiMini, { borderTopColor: '#ef4444' }]}><Text style={styles.kpiMiniLabel}>Nuevas</Text><Text style={[styles.kpiMiniValor, { color: '#ef4444' }]}>{noLeidas}</Text></View>
            <View style={[styles.kpiMini, { borderTopColor: '#475569' }]}><Text style={styles.kpiMiniLabel}>Leídas</Text><Text style={styles.kpiMiniValor}>{leidas}</Text></View>
          </View>

          {/* Filtros */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosFila}>
            {[
              { id:'todas', label:`Todas (${notificaciones.length})` },
              { id:'no_leidas', label:`Nuevas (${noLeidas})` },
              ...TIPOS_OPCIONES.map(t=>({ id:t, label: `${INFO_TIPO[t].icono} ${INFO_TIPO[t].etiqueta}` })),
            ].map(f=> {
              const activo = filtroTipo===f.id;
              return (
                <Pressable key={f.id} onPress={()=>setFiltroTipo(f.id)} style={[styles.filtroChip, activo && styles.filtroChipActivo]}>
                  <Text style={[styles.filtroChipTexto, activo && styles.filtroChipTextoActivo]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {filtradas.length===0 ? (
            <View style={[styles.vacio, { marginTop: 24 }]}><Text style={styles.vacioDescripcion}>Sin resultados para este filtro.</Text></View>
          ) : (
            <>
              {filtradasNoLeidas.map((n) => {
                const tipo = INFO_TIPO[String(n.tipo)] || INFO_TIPO.info;
                return (
                  <Pressable key={`u-${n.id}`} onPress={()=>marcarLeida(n.id)} style={[styles.tarjeta, styles.tarjetaNueva, { borderLeftColor: tipo.color }]}>
                    <View style={styles.tarjetaEncabezado}>
                      <View style={[styles.tipoPill, { backgroundColor: `${tipo.color}20`, borderColor: `${tipo.color}40` }]}>
                        <Text style={styles.tipoIcono}>{tipo.icono}</Text>
                        <Text style={[styles.tipoTexto, { color: tipo.color }]}>{tipo.etiqueta}</Text>
                      </View>
                      <Text style={styles.fechaRelativa}>{tiempoRelativo(n.creado_en)}</Text>
                      <View style={styles.badgeNueva}><Text style={styles.badgeNuevaTexto}>NUEVA</Text></View>
                    </View>
                    <Text style={styles.titulo}>{n.titulo}</Text>
                    {n.mensaje ? <Text style={styles.mensaje} numberOfLines={4}>{n.mensaje}</Text> : null}
                    <View style={styles.tarjetaPie}>
                      <Text style={styles.fechaAbsoluta}>{n.creado_en_texto || formatearFecha(n.creado_en)}{n.creado_por ? ` · por ${n.creado_por}` : ''}</Text>
                      <Text style={styles.toqueHint}>Tocar para marcar leída →</Text>
                    </View>
                  </Pressable>
                );
              })}
              {filtradasNoLeidas.length>0 && filtradasLeidas.length>0 ? <View style={styles.separadorWrap}><View style={styles.separadorLinea} /><Text style={styles.separadorLeidas}>LEÍDAS</Text><View style={styles.separadorLinea} /></View> : null}
              {filtradasLeidas.map((n) => {
                const tipo = INFO_TIPO[String(n.tipo)] || INFO_TIPO.info;
                return (
                  <View key={`r-${n.id}`} style={[styles.tarjeta, styles.tarjetaLeida]}>
                    <View style={styles.tarjetaEncabezado}>
                      <View style={[styles.tipoPill, styles.tipoPillLeida]}>
                        <Text style={styles.tipoIcono}>{tipo.icono}</Text>
                        <Text style={[styles.tipoTexto, { color: '#94a3b8' }]}>{tipo.etiqueta}</Text>
                      </View>
                      <Text style={styles.fechaRelativa}>{tiempoRelativo(n.creado_en)}</Text>
                      <View style={styles.badgeLeida}><Text style={styles.badgeLeidaTexto}>leída</Text></View>
                    </View>
                    <Text style={[styles.titulo, styles.tituloLeida]}>{n.titulo}</Text>
                    {n.mensaje ? <Text style={[styles.mensaje, styles.mensajeLeida]} numberOfLines={3}>{n.mensaje}</Text> : null}
                    <Text style={styles.fechaAbsoluta}>{n.creado_en_texto || formatearFecha(n.creado_en)}{n.creado_por ? ` · por ${n.creado_por}` : ''}</Text>
                  </View>
                );
              })}
            </>
          )}
          <Text style={styles.footer}>Actualización automática cada 15 s · {filtradas.length} visibles · {noLeidas} sin leer</Text>
        </ScrollView>
      )}

      {esAdmin && !mostrarForm && estado === 'lista' && notificaciones.length > 0 ? (
        <Pressable style={styles.fab} onPress={() => { setErrorEnvio(''); setExitoEnvio(''); setMostrarForm(true); }}>
          <Text style={styles.fabTexto}>＋</Text>
        </Pressable>
      ) : null}

      {mostrarForm ? (
        <View style={styles.overlay}>
          <Pressable style={styles.overlayFondo} onPress={() => !enviando && setMostrarForm(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.formCard}
          >
            <View style={styles.formHeader}>
              <Text style={styles.formTitulo}>Nueva notificación</Text>
              <Pressable onPress={() => !enviando && setMostrarForm(false)} style={styles.formCerrar}>
                <Text style={styles.formCerrarTexto}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.etiqueta}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cambio de aula del taller X"
              placeholderTextColor="#64748b"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={200}
              editable={!enviando}
            />

            <Text style={styles.etiqueta}>Mensaje *</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Detalle del aviso..."
              placeholderTextColor="#64748b"
              value={mensaje}
              onChangeText={setMensaje}
              multiline
              numberOfLines={4}
              maxLength={2000}
              editable={!enviando}
              textAlignVertical="top"
            />

            <Text style={styles.etiqueta}>Tipo</Text>
            <View style={styles.tiposFila}>
              {TIPOS_OPCIONES.map((t) => {
                const info = INFO_TIPO[t];
                const activo = tipoSel === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => !enviando && setTipoSel(t)}
                    style={[styles.chipTipo, activo && { backgroundColor: info.color, borderColor: info.color }]}
                  >
                    <Text style={[styles.chipTipoTexto, activo && styles.chipTipoTextoActivo]}>
                      {info.icono} {info.etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {errorEnvio ? <Text style={styles.errorEnvio}>{errorEnvio}</Text> : null}
            {exitoEnvio ? <Text style={styles.exitoEnvio}>✓ {exitoEnvio}</Text> : null}

            <View style={styles.formAcciones}>
              <Pressable
                style={[styles.botonCancelar, enviando && styles.botonDeshabilitado]}
                onPress={() => !enviando && setMostrarForm(false)}
                disabled={enviando}
              >
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.botonEnviar, enviando && styles.botonDeshabilitado]}
                onPress={enviarNotificacion}
                disabled={enviando}
              >
                {enviando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.botonEnviarTexto}>Enviar</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : null}
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
    gap: 8,
  },
  barraCentro: { flex: 1, alignItems: 'center' },
  barraTitulo: { color: '#f8fafc', fontSize: 17, fontWeight: 'bold' },
  badgeAdmin: {
    color: '#facc15',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
    backgroundColor: 'rgba(250,204,21,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barraAcciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonBarra: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 44,
    alignItems: 'center',
  },
  botonNuevo: { backgroundColor: '#16a34a', minWidth: 70 },
  botonNuevoTexto: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  botonMarcar: { backgroundColor: '#475569', minWidth: 70 },
  botonMarcarTexto: { color: '#e2e8f0', fontSize: 12, fontWeight: 'bold' },
  badgeNoLeidas: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold', marginTop: 2, backgroundColor: 'rgba(56,189,248,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  badgeNueva: { color: '#f8fafc', fontSize: 10, fontWeight: 'bold', backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', marginLeft: 8 },
  badgeLeida: { color: '#64748b', fontSize: 10, fontWeight: 'bold', backgroundColor: 'rgba(100,116,139,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', marginLeft: 8 },
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
  lista: { padding: 16, paddingBottom: 90, gap: 0 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiMini: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, alignItems: 'center', borderTopWidth: 3 },
  kpiMiniLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiMiniValor: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  filtrosFila: { flexDirection: 'row', gap: 8, paddingBottom: 12, paddingRight: 16 },
  filtroChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filtroChipActivo: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  filtroChipTexto: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  filtroChipTextoActivo: { color: '#0f172a' },
  footer: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  tarjeta: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tarjetaNueva: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: 'rgba(56,189,248,0.15)' },
  tarjetaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  tipoPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 4 },
  tipoPillLeida: { backgroundColor: 'rgba(100,116,139,0.12)', borderColor: 'rgba(100,116,139,0.2)' },
  tipoIcono: { fontSize: 14 },
  tipoTexto: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  fechaRelativa: { color: '#38bdf8', fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
  fecha: { color: '#64748b', fontSize: 12 },
  fechaAbsoluta: { color: '#64748b', fontSize: 11, marginTop: 8 },
  tarjetaPie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  titulo: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', lineHeight: 22 },
  tituloLeida: { color: '#94a3b8', fontWeight: '600' },
  mensaje: { color: '#cbd5e1', fontSize: 14, marginTop: 6, lineHeight: 20 },
  mensajeLeida: { color: '#64748b' },
  tarjetaLeida: { backgroundColor: '#0f172a', opacity: 0.75, borderLeftWidth: 0, borderWidth: 1, borderColor: '#1e293b' },
  separadorWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  separadorLinea: { flex: 1, height: 1, backgroundColor: '#334155' },
  separadorLeidas: { color: '#475569', fontSize: 11, textAlign: 'center', letterSpacing: 1.2, fontWeight: '700' },
  toqueHint: { color: '#38bdf8', fontSize: 11, fontWeight: '600' },
  badgeNueva: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  badgeNuevaTexto: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  badgeLeida: { backgroundColor: 'rgba(100,116,139,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  badgeLeidaTexto: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabTexto: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: 'bold' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  overlayFondo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formTitulo: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  formCerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCerrarTexto: { color: '#94a3b8', fontSize: 16 },
  etiqueta: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputMultiline: { minHeight: 90, paddingTop: 12 },
  tiposFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chipTipo: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipTipoTexto: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  chipTipoTextoActivo: { color: '#0f172a' },
  errorEnvio: { color: '#fca5a5', fontSize: 13, marginTop: 12, textAlign: 'center' },
  exitoEnvio: { color: '#4ade80', fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: '600' },
  formAcciones: { flexDirection: 'row', gap: 12, marginTop: 20 },
  botonCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  botonCancelarTexto: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  botonEnviar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#16a34a',
  },
  botonEnviarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botonDeshabilitado: { opacity: 0.6 },
});
