import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from './api';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'superior', label: 'Superior' },
  { value: 'menu', label: 'Menú' },
  { value: 'operador', label: 'Operador' },
];

function RolDropdown({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const label = ROLES.find(r=>r.value===value)?.label || value;
  return (
    <View>
      <Text style={styles.label}>Rol</Text>
      <Pressable style={styles.dropdownTrigger} onPress={()=>setOpen(true)}>
        <Text style={styles.dropdownText}>{label}</Text><Text style={styles.dropdownArrow}>▼</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={()=>setOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Seleccionar rol</Text>
          {ROLES.map(r=>(
            <Pressable key={r.value} onPress={()=>{onSelect(r.value); setOpen(false);}} style={[styles.modalItem, value===r.value && styles.modalItemActivo]}>
              <Text style={[styles.modalItemTxt, value===r.value && styles.modalItemTxtActivo]}>{r.label} ({r.value})</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

export default function PantallaUsuarios({ sesion, onVolver, alExpirarSesion }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [username, setUsername] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('operador');
  const [activo, setActivo] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const esAdmin = sesion?.rol === 'admin';

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const data = await obtenerUsuarios(sesion);
      const lista = Array.isArray(data) ? data : data.usuarios || [];
      setUsuarios(lista);
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      else if (e.status === 403) setError('Solo admin puede gestionar usuarios.');
      else setError(e.message || 'No se pudo cargar usuarios');
    } finally { setCargando(false); }
  }, [sesion, alExpirarSesion]);

  useEffect(()=>{ if(esAdmin) cargar(); else setCargando(false); }, [cargar, esAdmin]);

  const abrirCrear = () => { setEditando(null); setUsername(''); setNombre(''); setPassword(''); setRol('operador'); setActivo(true); setError(''); setMsg(''); setModalVisible(true); };
  const abrirEditar = (u) => { setEditando(u); setUsername(u.username); setNombre(u.nombre||''); setPassword(''); setRol(u.rol||'operador'); setActivo(Boolean(u.activo)); setError(''); setMsg(''); setModalVisible(true); };
  const cerrar = () => setModalVisible(false);

  const guardar = async () => {
    const u = String(username||'').trim().toLowerCase();
    const n = String(nombre||'').trim();
    const p = String(password||'');
    if (!editando && !/^[a-z0-9._-]{3,50}$/.test(u)) { setError('Usuario inválido (3-50: letras, números, . _ -)'); return; }
    if (!editando && p.length < 4) { setError('Contraseña mínimo 4 caracteres'); return; }
    if (editando && p && p.length < 4) { setError('Contraseña mínimo 4 caracteres'); return; }
    if (!ROLES.find(r=>r.value===rol)) { setError('Rol inválido'); return; }
    setEnviando(true); setError('');
    try {
      if (editando) {
        await actualizarUsuario(sesion, editando.id, { nombre: n, rol, activo, password: p || undefined });
        setMsg('Usuario actualizado');
      } else {
        await crearUsuario(sesion, { username: u, password: p, nombre: n, rol, activo });
        setMsg('Usuario creado');
      }
      cerrar();
      cargar();
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      setError(e.message || 'No se pudo guardar');
    } finally { setEnviando(false); }
  };

  const borrar = async (u) => {
    if (u.username === sesion?.usuario) { setError('No podés eliminar tu propio usuario'); return; }
    setError(''); setMsg('');
    try {
      await eliminarUsuario(sesion, u.id);
      setMsg(`Usuario ${u.username} eliminado`);
      cargar();
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion?.();
      setError(e.message || 'No se pudo eliminar');
    }
  };

  if (!esAdmin) return <View style={styles.centro}><Text style={styles.error}>Solo admin</Text><Pressable style={styles.boton} onPress={onVolver}><Text style={styles.botonTxt}>Volver</Text></Pressable></View>;
  if (cargando) return <View style={styles.centro}><ActivityIndicator color="#0ea5e9" size="large"/><Text style={styles.cargandoTxt}>Cargando usuarios…</Text></View>;

  return (
    <View style={styles.flex}>
      <View style={styles.barra}>
        <Pressable style={styles.boton} onPress={onVolver}><Text style={styles.botonTxt}>‹ Volver</Text></Pressable>
        <Text style={styles.titulo}>Usuarios</Text>
        <Pressable style={[styles.boton, styles.botonPrimario]} onPress={abrirCrear}><Text style={styles.botonTxt}>+ Nuevo</Text></Pressable>
      </View>
      {error ? <View style={styles.errorBox}><Text style={styles.errorTxt}>{error}</Text></View> : null}
      {msg ? <View style={styles.okBox}><Text style={styles.okTxt}>{msg}</Text></View> : null}
      <ScrollView contentContainerStyle={styles.lista}>
        <Text style={styles.ayuda}>{usuarios.length} usuarios · solo admin</Text>
        {usuarios.length===0 ? <Text style={styles.vacio}>Sin usuarios</Text> : usuarios.map(u=>(
          <View key={String(u.id)} style={styles.card}>
            <View style={{flex:1}}>
              <Text style={styles.cardTitulo}>{u.username} <Text style={styles.cardSub}>· {u.nombre||'—'}</Text></Text>
              <Text style={styles.sub}>{ROLES.find(r=>r.value===u.rol)?.label || u.rol} · {u.activo ? 'Activo' : 'Inactivo'} · {u.creado_en ? String(u.creado_en).slice(0,10) : ''}</Text>
            </View>
            <View style={{flexDirection:'row', gap:8}}>
              <Pressable style={styles.btnEdit} onPress={()=>abrirEditar(u)}><Text style={styles.btnEditTxt}>Editar</Text></Pressable>
              {u.username !== sesion?.usuario ? <Pressable style={styles.btnDel} onPress={()=>borrar(u)}><Text style={styles.btnDelTxt}>Eliminar</Text></Pressable> : null}
            </View>
          </View>
        ))}
        <Text style={styles.footer}>Crear/editar requiere rol admin. No podés quitarte admin ni desactivarte.</Text>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={cerrar}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={cerrar} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitulo}>{editando ? 'Editar usuario' : 'Nuevo usuario'}</Text>
            {!editando ? (
              <>
                <Text style={styles.label}>Username</Text>
                <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="ej: operador1" placeholderTextColor="#64748b" />
              </>
            ) : (
              <Text style={styles.ayuda}>Username: {username} (no editable)</Text>
            )}
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Nombre completo" placeholderTextColor="#64748b" />
            <Text style={styles.label}>{editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="mín 4 caracteres" placeholderTextColor="#64748b" />
            <RolDropdown value={rol} onSelect={setRol} />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Activo</Text>
              <Switch value={activo} onValueChange={setActivo} trackColor={{false:'#334155', true:'#16a34a'}} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{flexDirection:'row', gap:10, marginTop:14}}>
              <Pressable style={[styles.botonSheet, { flex:1, backgroundColor:'#334155' }]} onPress={cerrar}><Text style={styles.botonTxt}>Cancelar</Text></Pressable>
              <Pressable style={[styles.botonSheet, { flex:1, backgroundColor:'#16a34a', opacity: enviando ? 0.6 : 1 }]} onPress={guardar} disabled={enviando}>{enviando ? <ActivityIndicator color="#fff"/> : <Text style={[styles.botonTxt,{color:'#fff'}]}>{editando ? 'Guardar' : 'Crear'}</Text>}</Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  flex:{ flex:1, backgroundColor:'#0f172a' },
  centro:{ flex:1, backgroundColor:'#0f172a', alignItems:'center', justifyContent:'center', padding:20, gap:12 },
  cargandoTxt:{ color:'#94a3b8', marginTop:12 },
  barra:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingTop:46, paddingBottom:12, paddingHorizontal:16, backgroundColor:'#0f172a' },
  titulo:{ color:'#f8fafc', fontSize:17, fontWeight:'bold' },
  boton:{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, backgroundColor:'rgba(255,255,255,0.12)', minWidth:60, alignItems:'center' },
  botonPrimario:{ backgroundColor:'#16a34a' },
  botonTxt:{ color:'#fff', fontWeight:'600' },
  errorBox:{ backgroundColor:'#7f1d1d', padding:10, marginHorizontal:16, borderRadius:8, marginTop:8 },
  errorTxt:{ color:'#fecaca', textAlign:'center' },
  okBox:{ backgroundColor:'#14532d', padding:10, marginHorizontal:16, borderRadius:8, marginTop:8 },
  okTxt:{ color:'#bbf7d0', textAlign:'center' },
  error:{ color:'#fca5a5', textAlign:'center', marginTop:8 },
  lista:{ padding:16, gap:12, paddingBottom:32 },
  ayuda:{ color:'#94a3b8', fontSize:12, marginBottom:6 },
  card:{ backgroundColor:'#1e293b', borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', gap:10 },
  cardTitulo:{ color:'#f8fafc', fontSize:15, fontWeight:'bold' },
  cardSub:{ color:'#94a3b8', fontWeight:'normal', fontSize:13 },
  sub:{ color:'#94a3b8', fontSize:12, marginTop:4 },
  btnEdit:{ backgroundColor:'#334155', paddingHorizontal:12, paddingVertical:6, borderRadius:8 },
  btnEditTxt:{ color:'#e2e8f0', fontWeight:'600', fontSize:13 },
  btnDel:{ backgroundColor:'rgba(239,68,68,0.15)', paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:'rgba(239,68,68,0.3)' },
  btnDelTxt:{ color:'#f87171', fontWeight:'600', fontSize:13 },
  footer:{ color:'#475569', fontSize:12, textAlign:'center', marginTop:10 },
  vacio:{ color:'#64748b', textAlign:'center', marginTop:20 },
  modalRoot:{ flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.5)' },
  backdrop:{ flex:1 },
  sheet:{ backgroundColor:'#1e293b', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16, paddingBottom:24, borderTopWidth:1, borderColor:'#334155' },
  sheetTitulo:{ color:'#f8fafc', fontSize:16, fontWeight:'bold', marginBottom:12 },
  label:{ color:'#cbd5e1', fontSize:13, marginTop:10, marginBottom:6, fontWeight:'600' },
  input:{ backgroundColor:'#0f172a', borderRadius:10, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:'#334155', color:'#f8fafc' },
  dropdownTrigger:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#0f172a', borderRadius:10, paddingHorizontal:14, paddingVertical:12, borderWidth:1, borderColor:'#334155' },
  dropdownText:{ color:'#f8fafc', fontSize:14 },
  dropdownArrow:{ color:'#94a3b8' },
  modalBackdrop:{ flex:1 },
  modalSheet:{ position:'absolute', bottom:0, left:0, right:0, maxHeight:'50%', backgroundColor:'#1e293b', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16 },
  modalTitle:{ color:'#f8fafc', fontWeight:'bold', marginBottom:10 },
  modalItem:{ paddingVertical:12, paddingHorizontal:12, borderRadius:8, backgroundColor:'#0f172a', marginTop:6, borderWidth:1, borderColor:'#334155' },
  modalItemActivo:{ backgroundColor:'#16a34a', borderColor:'#16a34a' },
  modalItemTxt:{ color:'#e2e8f0' },
  modalItemTxtActivo:{ color:'#fff', fontWeight:'bold' },
  switchRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:12 },
  botonSheet:{ paddingVertical:12, borderRadius:10, alignItems:'center' },
});
