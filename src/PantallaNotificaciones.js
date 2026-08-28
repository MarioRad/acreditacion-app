import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PantallaNotificaciones({ onVolver }) {
  return (
    <View style={styles.flex}>
      <View style={styles.barra}>
        <Pressable style={styles.botonBarra} onPress={onVolver}>
          <Text style={styles.botonBarraTexto}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.barraTitulo}>Notificaciones</Text>
        <View style={styles.botonBarraVacio} />
      </View>

      <ScrollView contentContainerStyle={styles.contenedor}>
        <View style={styles.vacio}>
          <Text style={styles.icono}>🔔</Text>
          <Text style={styles.vacioTitulo}>Sin notificaciones</Text>
          <Text style={styles.vacioDescripcion}>
            Aquí verás los avisos y novedades del encuentro.
          </Text>
        </View>
      </ScrollView>
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
  botonBarraVacio: { minWidth: 60 },
  botonBarraTexto: { color: '#fff', fontSize: 15 },
  contenedor: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  vacio: { alignItems: 'center' },
  icono: { fontSize: 56 },
  vacioTitulo: { color: '#e2e8f0', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  vacioDescripcion: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
