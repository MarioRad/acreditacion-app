import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerMenuResumen, obtenerResumenDia } from './api';

export default function PantallaDashboardAdmin({ sesion, alExpirarSesion, onVolver }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [resumenDia, setResumenDia] = useState(null);
  const [resumenMenu, setResumenMenu] = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [rd, rm] = await Promise.all([
        obtenerResumenDia(sesion),
        obtenerMenuResumen(sesion),
      ]);
      setResumenDia(rd);
      setResumenMenu(rm?.servicios ? rm : rm?.resumen || rm);
    } catch (e) {
      if (e.sesionExpirada) { alExpirarSesion(); return; }
      setError(e.message || 'No se pudo cargar');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [sesion, alExpirarSesion]);

  useEffect(() => { cargar(); const id=setInterval(cargar, 15000); return ()=>clearInterval(id); }, [cargar]);

  if (cargando) return <View style={styles.centro}><ActivityIndicator color="#0ea5e9" size="large"/><Text style={styles.cargandoTxt}>Cargando dashboard…</Text></View>;

  return (
    <View style={styles.flex}>
      <View style={styles.barra}>
        <Pressable style={styles.botonBarra} onPress={onVolver}><Text style={styles.botonBarraTxt}>‹ Volver</Text></Pressable>
        <Text style={styles.barraTitulo}>Dashboard Admin</Text>
        <Pressable style={styles.botonBarra} onPress={()=>{ setRefrescando(true); cargar(); }}><Text style={styles.botonBarraTxt}>↻</Text></Pressable>
      </View>
      {error ? <View style={styles.errorBox}><Text style={styles.errorTxt}>{error}</Text></View> : null}
      <ScrollView contentContainerStyle={styles.lista} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={cargar} tintColor="#0ea5e9"/>}>
        {resumenMenu?.servicios ? (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Menús hoy (tiempo real)</Text>
            {resumenMenu.servicios.map((s)=> (
              <View key={s.id} style={styles.fila}><Text style={styles.filaTitulo}>{s.titulo}</Text><Text style={styles.filaValor}>{s.asistentes} entregados</Text></View>
            ))}
            {resumenMenu.totalInscriptos !== undefined ? <Text style={styles.sub}>Total inscriptos: {resumenMenu.totalInscriptos}</Text> : null}
          </View>
        ) : <View style={styles.card}><Text style={styles.cardTitulo}>Menús</Text><Text style={styles.vacio}>Sin datos de comidas (backend sin resumenComidas o sin bloques break)</Text></View>}

        {resumenDia ? (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Talleres — {resumenDia.fecha || 'hoy'}</Text>
            <Text style={styles.sub}>Acreditados: {resumenDia.totalAcreditados ?? resumenDia.total ?? '—'} · Menús: {resumenDia.totalMenus ?? '—'}</Text>
            {(resumenDia.porTaller || resumenDia.talleres || []).map((t, i)=> (
              <View key={i} style={styles.fila}>
                <View style={{ flex:1 }}>
                  <Text style={styles.filaTitulo}>{t.taller || t.nombre}</Text>
                  <Text style={styles.sub}>{t.fecha} {t.hora} · cupo {t.cupo} · inscriptos {t.inscriptos}</Text>
                </View>
                <Text style={styles.porcentaje}>{t.porcentaje ?? (t.cupo? Math.round((t.acreditados||0)/t.cupo*100):0)}%</Text>
              </View>
            ))}
            {(!resumenDia.porTaller && !resumenDia.talleres) ? <Text style={styles.vacio}>Sin detalle por taller</Text> : null}
          </View>
        ) : (
          <View style={styles.card}><Text style={styles.cardTitulo}>Resumen del día</Text><Text style={styles.vacio}>Sin datos (backend aún sin GET /api/mobile/resumen/dia). Mostrando fallback.</Text></View>
        )}
        <Text style={styles.footer}>Actualización automática cada 15 s · Capacidad locación disponible en admin web</Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  flex:{ flex:1, backgroundColor:'#0f172a' },
  centro:{ flex:1, backgroundColor:'#0f172a', alignItems:'center', justifyContent:'center', padding:30 },
  cargandoTxt:{ color:'#94a3b8', marginTop:12 },
  barra:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingTop:46, paddingBottom:12, paddingHorizontal:16, backgroundColor:'#0f172a' },
  barraTitulo:{ color:'#f8fafc', fontSize:17, fontWeight:'bold' },
  botonBarra:{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, backgroundColor:'rgba(255,255,255,0.12)', minWidth:60, alignItems:'center' },
  botonBarraTxt:{ color:'#fff', fontSize:14 },
  errorBox:{ backgroundColor:'#7f1d1d', padding:10, marginHorizontal:16, borderRadius:8, marginTop:6 },
  errorTxt:{ color:'#fecaca', textAlign:'center' },
  lista:{ padding:16, gap:14, paddingBottom:32 },
  card:{ backgroundColor:'#1e293b', borderRadius:14, padding:16 },
  cardTitulo:{ color:'#f8fafc', fontSize:16, fontWeight:'bold', marginBottom:10 },
  fila:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderTopWidth:1, borderTopColor:'#334155', gap:10 },
  filaTitulo:{ color:'#e2e8f0', fontSize:14, fontWeight:'600' },
  filaValor:{ color:'#38bdf8', fontSize:14, fontWeight:'bold' },
  sub:{ color:'#94a3b8', fontSize:12, marginTop:2 },
  porcentaje:{ color:'#4ade80', fontWeight:'bold', fontSize:16 },
  vacio:{ color:'#64748b', fontSize:13 },
  footer:{ color:'#475569', fontSize:12, textAlign:'center', marginTop:8 },
});
