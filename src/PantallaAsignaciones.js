import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { obtenerAsignaciones, crearAsignacion } from './api';

export default function PantallaAsignaciones({ sesion, onVolver, alExpirarSesion }) {
  const [asignaciones, setAsignaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [operador, setOperador] = useState('');
  const [tallerId, setTallerId] = useState('');
  const [dia, setDia] = useState(new Date().toISOString().slice(0,10));
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = await obtenerAsignaciones(sesion);
      setAsignaciones(r.asignaciones || r.talleres || []);
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      else setError(e.message || 'No se pudo cargar');
    } finally { setCargando(false); }
  }, [sesion, alExpirarSesion]);
  useEffect(()=>{ cargar(); }, [cargar]);

  const asignar = async () => {
    const op = operador.trim();
    const tid = Number(tallerId);
    if (!op || !tid || !dia) { setError('Completá operador, taller y día'); return; }
    setEnviando(true); setError(''); setMsg('');
    try {
      await crearAsignacion(sesion, { operador: op, tallerId: tid, dia });
      setMsg('Asignación creada');
      setOperador(''); setTallerId('');
      cargar();
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      setError(e.message || 'Error al asignar');
    } finally { setEnviando(false); }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.barra}>
        <Pressable style={styles.boton} onPress={onVolver}><Text style={styles.botonTxt}>‹ Volver</Text></Pressable>
        <Text style={styles.titulo}>Asignaciones</Text>
        <View style={{ width:60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.lista}>
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Nueva asignación (Superior)</Text>
          <Text style={styles.label}>Operador (username)</Text>
          <TextInput style={styles.input} placeholder="ej: operador1" placeholderTextColor="#64748b" value={operador} onChangeText={setOperador} autoCapitalize="none"/>
          <Text style={styles.label}>Taller ID</Text>
          <TextInput style={styles.input} placeholder="ej: 5" placeholderTextColor="#64748b" value={tallerId} onChangeText={setTallerId} keyboardType="numeric"/>
          <Text style={styles.label}>Día (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} placeholder="2026-09-12" placeholderTextColor="#64748b" value={dia} onChangeText={setDia}/>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {msg ? <Text style={styles.ok}>{msg}</Text> : null}
          <Pressable style={[styles.botonCrear, enviando && { opacity:0.6 }]} onPress={asignar} disabled={enviando}>
            {enviando ? <ActivityIndicator color="#fff"/> : <Text style={styles.botonCrearTxt}>Asignar</Text>}
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Asignaciones vigentes</Text>
          {cargando ? <ActivityIndicator color="#f59e0b"/> : asignaciones.length===0 ? <Text style={styles.vacio}>Sin asignaciones (backend aún sin GET /api/mobile/asignaciones)</Text> : asignaciones.map((a,i)=> (
            <View key={i} style={styles.fila}>
              <Text style={styles.filaTitulo}>{a.operador_username || a.operador || a.usuario} → {a.taller || `Taller ${a.taller_id||a.tallerId}`}</Text>
              <Text style={styles.filaSub}>{a.dia} {a.bloque_id?`· bloque ${a.bloque_id}`:''}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  flex:{ flex:1, backgroundColor:'#0f172a' },
  barra:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingTop:46, paddingBottom:12, paddingHorizontal:16, backgroundColor:'#0f172a' },
  titulo:{ color:'#f8fafc', fontSize:17, fontWeight:'bold' },
  boton:{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, backgroundColor:'rgba(255,255,255,0.12)', minWidth:60, alignItems:'center' },
  botonTxt:{ color:'#fff' },
  lista:{ padding:16, gap:14 },
  card:{ backgroundColor:'#1e293b', borderRadius:14, padding:16 },
  cardTitulo:{ color:'#f8fafc', fontSize:16, fontWeight:'bold', marginBottom:10 },
  label:{ color:'#cbd5e1', fontSize:13, marginTop:10, marginBottom:6, fontWeight:'600' },
  input:{ backgroundColor:'#0f172a', borderRadius:10, paddingHorizontal:14, paddingVertical:10, color:'#f8fafc', borderWidth:1, borderColor:'#334155' },
  error:{ color:'#fca5a5', marginTop:8, textAlign:'center' },
  ok:{ color:'#4ade80', marginTop:8, textAlign:'center', fontWeight:'600' },
  botonCrear:{ backgroundColor:'#f59e0b', borderRadius:10, paddingVertical:12, alignItems:'center', marginTop:14 },
  botonCrearTxt:{ color:'#0f172a', fontWeight:'bold', fontSize:16 },
  fila:{ paddingVertical:10, borderTopWidth:1, borderTopColor:'#334155' },
  filaTitulo:{ color:'#e2e8f0', fontWeight:'600' },
  filaSub:{ color:'#94a3b8', fontSize:13, marginTop:2 },
  vacio:{ color:'#64748b', fontSize:13 },
});
