import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const SECCIONES = [
  { titulo: 'Principal', items: [
    { clave: 'dashboard', icono: '📊', label: 'Dashboard', roles: ['admin','superior'] },
    { clave: 'acreditaciones', icono: '✓', label: 'Acreditaciones', roles: ['admin','superior','operador'] },
    { clave: 'entregaMenu', icono: '🍽️', label: 'Gestión de Menús', roles: ['admin','superior','menu'] },
    { clave: 'asistenciaTaller', icono: '📋', label: 'Asistencia Taller', roles: ['admin','superior','operador'] },
    { clave: 'notificaciones', icono: '🔔', label: 'Notificaciones', roles: ['admin','superior','menu','operador'] },
  ]},
  { titulo: 'Operativo', items: [
    { clave: 'asignaciones', icono: '👥', label: 'Asignaciones', roles: ['admin','superior'] },
    { clave: 'resumenDia', icono: '📅', label: 'Resumen Día', roles: ['admin','superior'] },
  ]},
  { titulo: 'Sistema', items: [
    { clave: 'pagos', icono: '💳', label: 'Pagos y cuotas', roles: ['admin'] },
    { clave: 'usuarios', icono: '👥', label: 'Usuarios', roles: ['admin'] },
  ]},
];

export default function SideBar({ visible, onClose, onSelect, sesion, vistaActiva }) {
  const [filtro, setFiltro] = useState('');
  const rol = sesion?.rol || 'operador';
  if (!visible) return null;
  const filtrar = (label) => !filtro || label.toLowerCase().includes(filtro.toLowerCase());
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sidebar}>
        <View style={styles.header}>
          <Text style={styles.logo}>🎭</Text>
          <View style={styles.brand}>
            <Text style={styles.brandStrong}>Dramatiza</Text>
            <Text style={styles.brandSub}>Panel Admin</Text>
          </View>
          <Pressable onPress={onClose} style={styles.cerrar}><Text style={styles.cerrarTxt}>✕</Text></Pressable>
        </View>
        <View style={styles.filterBox}>
          <TextInput style={styles.filterInput} placeholder="Filtrar menú..." placeholderTextColor="#64748b" value={filtro} onChangeText={setFiltro} />
        </View>
        <ScrollView style={styles.nav} contentContainerStyle={{ paddingBottom: 20 }}>
          {SECCIONES.map(sec => {
            const visibles = sec.items.filter(it => it.roles.includes(rol) && filtrar(it.label));
            if (visibles.length===0) return null;
            return (
              <View key={sec.titulo}>
                <Text style={styles.sectionTitle}>{sec.titulo}</Text>
                {visibles.map(it => (
                  <Pressable key={it.clave} onPress={()=>{ onSelect(it.clave); onClose(); }} style={[styles.link, vistaActiva===it.clave && styles.linkActivo]}>
                    <Text style={styles.linkIcon}>{it.icono}</Text>
                    <Text style={[styles.linkLabel, vistaActiva===it.clave && styles.linkLabelActivo]}>{it.label}</Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.userInfo} numberOfLines={1}>{sesion?.nombre || ''} · {rol}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection:'row', zIndex: 50 },
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.5)' },
  sidebar: { width: 280, backgroundColor:'#1e293b', borderRightWidth:1, borderRightColor:'#334155', paddingTop: 0 },
  header: { flexDirection:'row', alignItems:'center', gap:10, padding:16, paddingTop:46, borderBottomWidth:1, borderBottomColor:'#334155' },
  logo: { fontSize:28, width:36, height:36, textAlign:'center', backgroundColor:'#0f172a', borderRadius:8, overflow:'hidden', lineHeight:36 },
  brand: { flex:1 },
  brandStrong: { color:'#f8fafc', fontWeight:'bold', fontSize:15 },
  brandSub: { color:'#94a3b8', fontSize:11, textTransform:'uppercase', letterSpacing:1 },
  cerrar: { width:32, height:32, borderRadius:16, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  cerrarTxt: { color:'#94a3b8', fontSize:16 },
  filterBox: { padding:10, borderBottomWidth:1, borderBottomColor:'#334155' },
  filterInput: { backgroundColor:'#0f172a', borderRadius:8, paddingHorizontal:12, paddingVertical:8, color:'#f8fafc', borderWidth:1, borderColor:'#334155' },
  nav: { flex:1, paddingHorizontal:8, paddingTop:8 },
  sectionTitle: { color:'#64748b', fontSize:11, fontWeight:'bold', textTransform:'uppercase', letterSpacing:1, paddingHorizontal:8, paddingTop:14, paddingBottom:6 },
  link: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, paddingHorizontal:10, borderRadius:8 },
  linkActivo: { backgroundColor:'#16a34a' },
  linkIcon: { fontSize:16, width:22, textAlign:'center' },
  linkLabel: { color:'#cbd5e1', fontSize:14, fontWeight:'600' },
  linkLabelActivo: { color:'#fff' },
  footer: { padding:12, borderTopWidth:1, borderTopColor:'#334155' },
  userInfo: { color:'#94a3b8', fontSize:12 },
});
