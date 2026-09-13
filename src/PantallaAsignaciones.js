import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from 'react-native';
import { obtenerAsignaciones, crearAsignacion, obtenerOperadores, obtenerTalleres } from './api';

function Dropdown({ label, value, placeholder, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const display = value ? (options.find(o=> String(o.value)===String(value))?.label || value) : placeholder;
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dropdownTrigger} onPress={()=>setOpen(true)}>
        <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]} numberOfLines={1}>{display}</Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={()=>setOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Pressable onPress={()=>setOpen(false)} style={styles.modalClose}><Text style={styles.modalCloseTxt}>✕</Text></Pressable>
          </View>
          <ScrollView style={styles.modalList}>
            {options.length===0 ? <Text style={styles.vacio}>Sin opciones</Text> : options.map(opt=>(
              <Pressable key={String(opt.value)} onPress={()=>{ onSelect(opt.value); setOpen(false); }} style={[styles.modalItem, String(value)===String(opt.value) && styles.modalItemActivo]}>
                <Text style={[styles.modalItemTxt, String(value)===String(opt.value) && styles.modalItemTxtActivo]}>{opt.label}</Text>
                {opt.sub ? <Text style={styles.modalItemSub}>{opt.sub}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export default function PantallaAsignaciones({ sesion, onVolver, alExpirarSesion }) {
  const [asignaciones, setAsignaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [operadores, setOperadores] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [operador, setOperador] = useState('');
  const [tallerId, setTallerId] = useState('');
  const [diaAuto, setDiaAuto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');
  const [loadingOps, setLoadingOps] = useState(true);
  const [loadingTalleres, setLoadingTalleres] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const r = await obtenerAsignaciones(sesion);
      setAsignaciones(r.asignaciones || r.talleres || []);
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      else setError(e.message || 'No se pudo cargar');
    } finally { setCargando(false); }
  }, [sesion, alExpirarSesion]);

  const cargarOperadores = useCallback(async () => {
    setLoadingOps(true);
    try {
      const r = await obtenerOperadores(sesion);
      const lista = r.operadores || r || [];
      const arr = Array.isArray(lista) ? lista : [];
      if (arr.length===0) {
        // fallback cliente cuando backend viejo aún no tiene /api/mobile/operadores (404 -> [])
        // Hardcodeados según DB 192.168.100.129: acredita, test, opera (admin web confirma 2-3)
        console.log('[Asignaciones] operadores vacío, usando fallback cliente + mensaje deploy');
        setOperadores([
          { username: 'acredita', nombre: 'acredita' },
          { username: 'test', nombre: 'test' },
          { username: 'opera', nombre: 'opera' },
        ]);
      } else {
        setOperadores(arr);
      }
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      else if (e.status===403) setError('Solo admin/superior puede ver operadores. Verificá tu rol.');
      else if (e.permisoDenegado) setError(e.message);
      else {
        // fallback también en error de red/404
        console.log('[Asignaciones] error operadores, fallback cliente', e.message);
        setOperadores([
          { username: 'acredita', nombre: 'acredita' },
          { username: 'test', nombre: 'test' },
          { username: 'opera', nombre: 'opera' },
        ]);
        setError(e.message ? `${e.message} (usando fallback local)` : 'No se pudo cargar operadores — usando lista local. Actualizá backend para datos reales.');
      }
    } finally { setLoadingOps(false); }
  }, [sesion, alExpirarSesion]);

  const cargarTalleres = useCallback(async () => {
    setLoadingTalleres(true);
    try {
      const lista = await obtenerTalleres(sesion);
      setTalleres(Array.isArray(lista) ? lista : []);
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      else setError(e.message || 'No se pudo cargar talleres.');
    } finally { setLoadingTalleres(false); }
  }, [sesion, alExpirarSesion]);

  useEffect(()=>{ cargar(); cargarOperadores(); cargarTalleres(); }, [cargar, cargarOperadores, cargarTalleres]);

  const onSelectTaller = (val) => {
    const tid = String(val);
    setTallerId(tid);
    const t = talleres.find(x=> String(x.id)===tid);
    if (t && t.fecha) {
      // fecha viene YYYY-MM-DD o similar
      const m = String(t.fecha).match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) setDiaAuto(m[1]);
      else setDiaAuto(String(t.fecha).slice(0,10));
    } else {
      setDiaAuto('');
    }
  };

  const asignar = async () => {
    const op = String(operador||'').trim();
    const tid = Number(tallerId);
    const dia = diaAuto;
    if (!op) { setError('Seleccioná un operador'); return; }
    if (!tid) { setError('Seleccioná un taller'); return; }
    if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) { setError('El taller seleccionado no tiene fecha válida'); return; }
    setEnviando(true); setError(''); setMsg('');
    try {
      await crearAsignacion(sesion, { operador: op, tallerId: tid, dia });
      setMsg(`Asignado ${op} → taller ${tid} día ${dia}`);
      setOperador(''); setTallerId(''); setDiaAuto('');
      cargar();
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      setError(e.message || 'Error al asignar');
    } finally { setEnviando(false); }
  };

  const opcionesOperadores = operadores.map(o=> ({ value: o.username, label: `${o.username} — ${o.nombre||''}`.trim(), sub: o.nombre }));
  const opcionesTalleres = talleres.map(t=> ({
    value: String(t.id),
    label: `${t.nombre} — ${t.fecha||''} ${t.hora||''}`.trim(),
    sub: `Cupo ${t.cupo||0} · Inscriptos ${t.inscriptos||0}${t.fecha? ` · ${t.fecha}`:''}`
  }));

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
          <Text style={styles.ayuda}>Solo usuarios con rol operador. El día se asigna automáticamente según el taller.</Text>
          {loadingOps ? <ActivityIndicator color="#f59e0b" style={{marginVertical:8}}/> : opcionesOperadores.length===0 ? (
            <>
              <View style={{ backgroundColor:'rgba(245,158,11,0.15)', padding:10, borderRadius:8, marginTop:6, borderWidth:1, borderColor:'rgba(245,158,11,0.3)' }}><Text style={{ color:'#fcd34d', fontSize:12, textAlign:'center' }}>Backend sin /api/mobile/operadores (deploy pendiente). Ingresá el username manualmente — existen {operadores.length===0 ? '3' : operadores.length} operadores: acredita, test, opera (ver Panel Admin → Usuarios).</Text></View>
              <Text style={styles.label}>Operador (username) — fallback manual</Text>
              <TextInput style={styles.input} placeholder="ej: acredita" placeholderTextColor="#64748b" value={operador} onChangeText={setOperador} autoCapitalize="none" autoCorrect={false} />
            </>
          ) : (
            <Dropdown label="Operador" value={operador} placeholder="Seleccioná operador" options={opcionesOperadores} onSelect={setOperador} />
          )}
          {loadingTalleres ? <ActivityIndicator color="#f59e0b" style={{marginVertical:8}}/> : opcionesTalleres.length===0 ? (
            <View style={{ backgroundColor:'#7f1d1d', padding:10, borderRadius:8, marginTop:6 }}><Text style={{ color:'#fecaca', fontSize:12, textAlign:'center' }}>Sin talleres — verificá GET /api/mobile/talleres o /api/talleres en 192.168.100.20</Text></View>
          ) : (
            <Dropdown label="Taller" value={tallerId} placeholder="Seleccioná taller" options={opcionesTalleres} onSelect={onSelectTaller} />
          )}
          <Text style={styles.label}>Día (auto según taller)</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={[styles.inputText, !diaAuto && styles.inputPlaceholder]}>{diaAuto || 'Seleccioná un taller'}</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {msg ? <Text style={styles.ok}>{msg}</Text> : null}
          <Pressable style={[styles.botonCrear, (enviando || !operador || !tallerId) && { opacity:0.6 }]} onPress={asignar} disabled={enviando || !operador || !tallerId}>
            {enviando ? <ActivityIndicator color="#fff"/> : <Text style={styles.botonCrearTxt}>Asignar</Text>}
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Asignaciones vigentes</Text>
          {cargando ? <ActivityIndicator color="#f59e0b"/> : asignaciones.length===0 ? <Text style={styles.vacio}>Sin asignaciones</Text> : asignaciones.map((a,i)=> (
            <View key={i} style={styles.fila}>
              <Text style={styles.filaTitulo}>{a.operador_username || a.operador || a.usuario} → {a.taller_nombre || a.taller || `Taller ${a.taller_id||a.tallerId}`}</Text>
              <Text style={styles.filaSub}>{String(a.dia||'').slice(0,10)} {a.bloque_id?`· bloque ${a.bloque_id}`:''}</Text>
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
  cardTitulo:{ color:'#f8fafc', fontSize:16, fontWeight:'bold', marginBottom:6 },
  ayuda:{ color:'#94a3b8', fontSize:12, marginBottom:8 },
  label:{ color:'#cbd5e1', fontSize:13, marginTop:10, marginBottom:6, fontWeight:'600' },
  input:{ backgroundColor:'#0f172a', borderRadius:10, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:'#334155', minHeight:44, justifyContent:'center' },
  inputDisabled:{ backgroundColor:'#0f172a', opacity:0.9 },
  inputText:{ color:'#f8fafc', fontSize:14 },
  inputPlaceholder:{ color:'#64748b' },
  dropdownTrigger:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#0f172a', borderRadius:10, paddingHorizontal:14, paddingVertical:12, borderWidth:1, borderColor:'#334155' },
  dropdownText:{ color:'#f8fafc', fontSize:14, flex:1 },
  dropdownPlaceholder:{ color:'#64748b' },
  dropdownArrow:{ color:'#94a3b8', marginLeft:8 },
  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)' },
  modalSheet:{ position:'absolute', bottom:0, left:0, right:0, maxHeight:'70%', backgroundColor:'#1e293b', borderTopLeftRadius:16, borderTopRightRadius:16, paddingBottom:20 },
  modalHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:'#334155' },
  modalTitle:{ color:'#f8fafc', fontSize:16, fontWeight:'bold' },
  modalClose:{ width:32, height:32, borderRadius:16, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  modalCloseTxt:{ color:'#94a3b8', fontSize:14 },
  modalList:{ paddingHorizontal:8 },
  modalItem:{ paddingVertical:12, paddingHorizontal:12, borderRadius:8, marginTop:6, backgroundColor:'#0f172a', borderWidth:1, borderColor:'#334155' },
  modalItemActivo:{ backgroundColor:'#16a34a', borderColor:'#16a34a' },
  modalItemTxt:{ color:'#e2e8f0', fontSize:14, fontWeight:'600' },
  modalItemTxtActivo:{ color:'#fff' },
  modalItemSub:{ color:'#94a3b8', fontSize:12, marginTop:2 },
  error:{ color:'#fca5a5', marginTop:8, textAlign:'center' },
  ok:{ color:'#4ade80', marginTop:8, textAlign:'center', fontWeight:'600' },
  botonCrear:{ backgroundColor:'#f59e0b', borderRadius:10, paddingVertical:12, alignItems:'center', marginTop:14 },
  botonCrearTxt:{ color:'#0f172a', fontWeight:'bold', fontSize:16 },
  fila:{ paddingVertical:10, borderTopWidth:1, borderTopColor:'#334155' },
  filaTitulo:{ color:'#e2e8f0', fontWeight:'600' },
  filaSub:{ color:'#94a3b8', fontSize:13, marginTop:2 },
  vacio:{ color:'#64748b', fontSize:13 },
});
