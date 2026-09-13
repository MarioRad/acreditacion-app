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
  const visibles = OPCIONES.filter((op) => !op.roles || op.roles.includes(rol));
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.contenedor}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      {sesion ? (
        <View style={styles.sesion}>
          <Text style={styles.sesionNombre}>{sesion.nombre} · {rol}</Text>
          <Pressable onPress={cerrarSesion}>
            <Text style={styles.cerrar}>Cerrar sesión</Text>
          </Pressable>
        </View>
      ) : null}

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
      {sesion && visibles.length===0 ? <Text style={styles.titulo}>Sin opciones habilitadas para tu rol</Text> : null}
      {!sesion ? <Text style={styles.pista}>Iniciá sesión para ver opciones</Text> : null}
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
});
