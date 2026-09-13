import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const OPCIONES = [
  {
    clave: 'acreditaciones',
    icono: '✓',
    titulo: 'Acreditaciones',
    descripcion: 'Escaneo de QR para acreditar asistentes',
    color: '#16a34a',
    roles: ['admin','superior','operador'],
  },
  {
    clave: 'entregaMenu',
    icono: '🍽️',
    titulo: 'Entrega de Menú',
    descripcion: 'Escaneo de QR y confirmación de entrega',
    color: '#ea580c',
    roles: ['admin','superior','menu'],
  },
  {
    clave: 'asistenciaTaller',
    icono: '📋',
    titulo: 'Asistencia Taller',
    descripcion: 'Ingreso/egreso por taller asignado',
    color: '#7c3aed',
    roles: ['admin','superior','operador'],
  },
  {
    clave: 'notificaciones',
    icono: '🔔',
    titulo: 'Notificaciones',
    descripcion: 'Avisos y novedades del encuentro',
    color: '#0284c7',
    roles: ['admin','superior','menu','operador'],
  },
  {
    clave: 'dashboard',
    icono: '📊',
    titulo: 'Dashboard Admin',
    descripcion: 'Estado por taller y menús en tiempo real',
    color: '#0ea5e9',
    roles: ['admin','superior'],
  },
  {
    clave: 'resumenDia',
    icono: '📅',
    titulo: 'Resumen del Día',
    descripcion: 'Cierre de jornada',
    color: '#475569',
    roles: ['admin','superior'],
  },
  {
    clave: 'asignaciones',
    icono: '👥',
    titulo: 'Asignaciones',
    descripcion: 'Operador → Taller (Superior)',
    color: '#f59e0b',
    roles: ['admin','superior'],
  },
];

export default function PantallaMenu({ sesion, alElegir, cerrarSesion }) {
  const rol = sesion?.rol || 'operador';
  if (!sesion) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.contenedorPreLogin}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.preLoginCard}>
          <Text style={styles.preLoginIcono}>🔔</Text>
          <Text style={styles.preLoginTitulo}>Bienvenido</Text>
          <Text style={styles.preLoginSub}>Iniciá sesión para ver notificaciones nuevas o sin leer</Text>
          <Pressable style={styles.botonLogin} onPress={()=>alElegir('notificaciones')}>
            <Text style={styles.botonLoginTexto}>Iniciar sesión</Text>
          </Pressable>
          <Text style={styles.pista}>Las notificaciones nuevas aparecen aquí después del login</Text>
        </View>
        <View style={styles.notifPreview}>
          <Text style={styles.notifPreviewIcono}>🔒</Text>
          <Text style={styles.notifPreviewTexto}>Notificaciones sin leer disponibles tras iniciar sesión</Text>
        </View>
      </ScrollView>
    );
  }
  const visibles = OPCIONES.filter((op) => !op.roles || op.roles.includes(rol));
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.contenedor}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.sesion}>
        <Text style={styles.sesionNombre}>{sesion.nombre} · {rol}</Text>
        <Pressable onPress={cerrarSesion}>
          <Text style={styles.cerrar}>Cerrar sesión</Text>
        </Pressable>
      </View>

      <Text style={styles.titulo}>¿Qué necesitás hacer?</Text>

      {visibles.map((op) => (
        <Pressable key={op.clave} style={styles.opcion} onPress={() => alElegir(op.clave)}>
          <View style={[styles.icono, { backgroundColor: op.color }]}>
            <Text style={styles.iconoTexto}>{op.icono}</Text>
          </View>
          <View style={styles.opcionTexto}>
            <Text style={styles.opcionTitulo}>{op.titulo}</Text>
            <Text style={styles.opcionDescripcion}>{op.descripcion}</Text>
          </View>
          <Text style={styles.flecha}>›</Text>
        </Pressable>
      ))}
      {visibles.length===0 ? <Text style={styles.titulo}>Sin opciones habilitadas para tu rol</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  contenedor: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    width: '80%',
    maxWidth: 300,
    height: 110,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sesion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sesionNombre: { color: '#e2e8f0', fontSize: 14 },
  cerrar: { color: '#f87171', fontSize: 14, fontWeight: '600' },
  titulo: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoTexto: { color: '#fff', fontSize: 26 },
  opcionTexto: { flex: 1, marginLeft: 14 },
  opcionTitulo: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  opcionDescripcion: { color: '#94a3b8', fontSize: 13, marginTop: 3 },
  flecha: { color: '#64748b', fontSize: 28, marginLeft: 8 },
  pista: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 12 },
  contenedorPreLogin: { flexGrow:1, padding:24, justifyContent:'center', alignItems:'center' },
  preLoginCard: { backgroundColor:'#1e293b', borderRadius:16, padding:24, alignItems:'center', width:'100%', maxWidth:360, marginTop:16 },
  preLoginIcono: { fontSize:48 },
  preLoginTitulo: { color:'#f8fafc', fontSize:20, fontWeight:'bold', marginTop:12 },
  preLoginSub: { color:'#94a3b8', fontSize:14, textAlign:'center', marginTop:8 },
  botonLogin: { backgroundColor:'#16a34a', borderRadius:12, paddingVertical:12, paddingHorizontal:32, marginTop:18, width:'100%', alignItems:'center' },
  botonLoginTexto: { color:'#fff', fontSize:16, fontWeight:'bold' },
  notifPreview: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'rgba(56,189,248,0.12)', borderRadius:12, padding:14, marginTop:16, borderWidth:1, borderColor:'rgba(56,189,248,0.2)', maxWidth:360, width:'100%' },
  notifPreviewIcono: { fontSize:22 },
  notifPreviewTexto: { color:'#7dd3fc', fontSize:13, flex:1 },
});
