import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, Vibration, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { obtenerTalleresAsignados, registrarAsistenciaTaller, obtenerEstadoTaller } from './api';
import { prepararAudio, sonarBipError, sonarBipOk } from './sonidos';

export default function PantallaAsistenciaTaller({ sesion, alExpirarSesion, onVolver }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [talleres, setTalleres] = useState([]);
  const [tallerSel, setTallerSel] = useState(null);
  const [tipo, setTipo] = useState('ingreso');
  const [dniManual, setDniManual] = useState('');
  const [estadoTaller, setEstadoTaller] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const bloqueadoRef = useRef(false);

  useEffect(() => { prepararAudio(); }, []);

  const cargarTalleres = useCallback(async () => {
    try {
      const r = await obtenerTalleresAsignados(sesion);
      const lista = r.talleres || r || [];
      setTalleres(lista);
      if (lista.length > 0 && !tallerSel) setTallerSel(lista[0]);
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion();
    }
  }, [sesion, tallerSel, alExpirarSesion]);

  const cargarEstado = useCallback(async () => {
    if (!tallerSel) return;
    try {
      const id = tallerSel.id || tallerSel.taller_id;
      const est = await obtenerEstadoTaller(sesion, id);
      if (est) setEstadoTaller(est);
    } catch (_) {}
  }, [sesion, tallerSel]);

  useEffect(() => { cargarTalleres(); }, [cargarTalleres]);
  useEffect(() => { cargarEstado(); const id = setInterval(cargarEstado, 15000); return () => clearInterval(id); }, [cargarEstado]);

  const registrar = useCallback(async (codigo) => {
    if (bloqueadoRef.current) return;
    if (!tallerSel) { setError('Seleccioná un taller'); return; }
    bloqueadoRef.current = true;
    setProcesando(true);
    setError('');
    try {
      const tallerId = tallerSel.id || tallerSel.taller_id;
      const r = await registrarAsistenciaTaller(sesion, { codigo, dni: dniManual.replace(/\D/g,''), tallerId, tipo });
      sonarBipOk();
      Vibration.vibrate(120);
      setResultado({ ok: true, datos: r });
      cargarEstado();
    } catch (e) {
      sonarBipError();
      Vibration.vibrate([0,90,70,90]);
      if (e.sesionExpirada) { alExpirarSesion(); return; }
      setError(e.message || 'Error al registrar asistencia');
      setResultado({ ok: false, mensaje: e.message });
    } finally {
      setProcesando(false);
      setTimeout(() => { bloqueadoRef.current = false; }, 1200);
    }
  }, [sesion, tallerSel, tipo, dniManual, alExpirarSesion, cargarEstado]);

  const manejarQR = useCallback(async ({ data }) => { await registrar(data); }, [registrar]);

  const manejarDni = async () => {
    const dni = dniManual.replace(/\D/g,'');
    if (!/^\d{7,8}$/.test(dni)) { setError('DNI debe tener 7 u 8 dígitos'); return; }
    await registrar(dni);
  };

  if (!permiso) return <View style={styles.centro} />;
  if (!permiso.granted) {
    return (
      <View style={[styles.centro, styles.fondoPermiso]}>
        <Text style={styles.permisoTexto}>Se necesita cámara para escanear QR.</Text>
        <Pressable style={styles.botonPermiso} onPress={pedirPermiso}><Text style={styles.botonPermisoTexto}>Conceder permiso</Text></Pressable>
      </View>
    );
  }

  const faltantes = estadoTaller ? (estadoTaller.faltantes ?? (estadoTaller.cupo - estadoTaller.presentes)) : null;
  const porcentaje = estadoTaller && estadoTaller.cupo ? Math.round((estadoTaller.presentes / estadoTaller.cupo)*100) : null;

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={procesando ? undefined : manejarQR}
      />
      <View style={styles.barra}>
        <Pressable style={styles.botonBarra} onPress={onVolver}><Text style={styles.botonBarraTexto}>‹ Volver</Text></Pressable>
        <Text style={styles.barraTitulo}>Asistencia Taller</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.panelTop}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {talleres.length === 0 ? <Text style={styles.sinTalleres}>Sin talleres asignados</Text> : talleres.map((t) => {
            const id = t.id || t.taller_id;
            const sel = tallerSel && (tallerSel.id||tallerSel.taller_id)===id;
            return (
              <Pressable key={id} onPress={()=>setTallerSel(t)} style={[styles.chipTaller, sel && styles.chipTallerActivo]}>
                <Text style={[styles.chipTexto, sel && styles.chipTextoActivo]}>{t.nombre || t.taller || `Taller ${id}`}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {estadoTaller ? (
          <View style={styles.estadoBox}>
            <Text style={styles.estadoTexto}>Cupo: {estadoTaller.cupo} · Presentes: {estadoTaller.presentes} · Inscriptos: {estadoTaller.inscriptos ?? '—'}</Text>
            {faltantes !== null ? <Text style={[styles.faltantes, faltantes>0 && styles.faltantesAlerta]}>{faltantes>0 ? `⚠ Faltan ${faltantes} (${porcentaje}% ocupación)` : '✓ Cupo completo'}</Text> : null}
          </View>
        ) : null}
        <View style={styles.tipoFila}>
          {['ingreso','egreso'].map((k) => (
            <Pressable key={k} onPress={()=>setTipo(k)} style={[styles.tipoBtn, tipo===k && styles.tipoBtnActivo]}>
              <Text style={[styles.tipoBtnTexto, tipo===k && styles.tipoBtnTextoActivo]}>{k==='ingreso'?'→ Ingreso':'← Egreso'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.dniFila}>
          <TextInput style={styles.inputDni} placeholder="DNI 7-8 dígitos" placeholderTextColor="#64748b" keyboardType="numeric" maxLength={8} value={dniManual} onChangeText={setDniManual} />
          <Pressable style={styles.botonDni} onPress={manejarDni}><Text style={styles.botonDniTexto}>Registrar</Text></Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {resultado?.ok ? <Text style={styles.ok}>✓ Registrado ({tipo})</Text> : null}
      </View>

      {procesando ? <View style={styles.cargando}><ActivityIndicator color="#fff" size="large"/><Text style={styles.cargandoTexto}>Registrando…</Text></View> : null}
      {!procesando ? <View style={styles.marco} pointerEvents="none"><View style={styles.visor}/><Text style={styles.ayuda}>Escaneá QR o ingresá DNI</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex:1, backgroundColor:'#000' },
  centro: { flex:1, alignItems:'center', justifyContent:'center' },
  fondoPermiso:{ backgroundColor:'#0f172a', padding:30 },
  permisoTexto:{ color:'#e2e8f0', fontSize:16, textAlign:'center' },
  botonPermiso:{ marginTop:20, backgroundColor:'#16a34a', borderRadius:10, paddingVertical:12, paddingHorizontal:28 },
  botonPermisoTexto:{ color:'#fff', fontWeight:'bold' },
  barra:{ position:'absolute', top:0, left:0, right:0, flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingTop:46, paddingBottom:12, paddingHorizontal:16, backgroundColor:'rgba(15,23,42,0.85)' },
  barraTitulo:{ color:'#f8fafc', fontSize:16, fontWeight:'bold' },
  botonBarra:{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, backgroundColor:'rgba(255,255,255,0.15)', minWidth:60, alignItems:'center' },
  botonBarraTexto:{ color:'#fff', fontSize:14 },
  panelTop:{ position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#0f172a', borderTopLeftRadius:18, borderTopRightRadius:18, padding:14, paddingBottom:24 },
  chipTaller:{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:'#1e293b', borderWidth:1, borderColor:'#334155' },
  chipTallerActivo:{ backgroundColor:'#16a34a', borderColor:'#16a34a' },
  chipTexto:{ color:'#cbd5e1', fontSize:13, fontWeight:'600' },
  chipTextoActivo:{ color:'#fff' },
  sinTalleres:{ color:'#94a3b8', fontSize:13 },
  estadoBox:{ marginTop:10, backgroundColor:'#1e293b', borderRadius:10, padding:10 },
  estadoTexto:{ color:'#e2e8f0', fontSize:12 },
  faltantes:{ color:'#4ade80', fontSize:13, fontWeight:'bold', marginTop:4 },
  faltantesAlerta:{ color:'#facc15' },
  tipoFila:{ flexDirection:'row', gap:8, marginTop:10 },
  tipoBtn:{ flex:1, paddingVertical:10, borderRadius:10, backgroundColor:'#1e293b', alignItems:'center', borderWidth:1, borderColor:'#334155' },
  tipoBtnActivo:{ backgroundColor:'#0284c7', borderColor:'#0284c7' },
  tipoBtnTexto:{ color:'#94a3b8', fontWeight:'600' },
  tipoBtnTextoActivo:{ color:'#fff' },
  dniFila:{ flexDirection:'row', gap:8, marginTop:10 },
  inputDni:{ flex:1, backgroundColor:'#1e293b', borderRadius:10, paddingHorizontal:14, paddingVertical:10, color:'#f8fafc', borderWidth:1, borderColor:'#334155' },
  botonDni:{ backgroundColor:'#16a34a', borderRadius:10, paddingHorizontal:18, justifyContent:'center' },
  botonDniTexto:{ color:'#fff', fontWeight:'bold' },
  error:{ color:'#fca5a5', fontSize:13, marginTop:8, textAlign:'center' },
  ok:{ color:'#4ade80', fontSize:13, marginTop:8, textAlign:'center', fontWeight:'600' },
  marco:{ ...StyleSheet.absoluteFillObject, justifyContent:'center', alignItems:'center', bottom:220 },
  visor:{ width:220, height:220, borderWidth:3, borderColor:'rgba(255,255,255,0.9)', borderRadius:16 },
  ayuda:{ marginTop:12, color:'#fff', backgroundColor:'rgba(0,0,0,0.55)', paddingHorizontal:12, paddingVertical:6, borderRadius:8, overflow:'hidden', fontSize:13 },
  cargando:{ ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.45)' },
  cargandoTexto:{ color:'#fff', marginTop:10 },
});
