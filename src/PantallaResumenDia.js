import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerResumenDia } from './api';

export default function PantallaResumenDia({ sesion, alExpirarSesion, onVolver }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const r = await obtenerResumenDia(sesion, fecha);
      setData(r);
    } catch (e) {
      if (e.sesionExpirada) alExpirarSesion();
      else setError(e.message || 'Error al cargar');
    } finally { setCargando(false); }
  }, [sesion, fecha, alExpirarSesion]);
  useEffect(()=>{ cargar(); }, [cargar]);

  return (
    <View style={styles.flex}>
      <View style={styles.barra}>
        <Pressable style={styles.boton} onPress={onVolver}><Text style={styles.botonTxt}>‹ Volver</Text></Pressable>
        <Text style={styles.titulo}>Resumen del día</Text>
        <Pressable style={styles.boton} onPress={cargar}><Text style={styles.botonTxt}>↻</Text></Pressable>
      </View>
      <View style={styles.fechaBox}>
        <Text style={styles.fechaLabel}>Fecha: {fecha}</Text>
        <View style={{ flexDirection:'row', gap:8 }}>
          <Pressable style={styles.fechaBtn} onPress={()=>{ const d=new Date(fecha); d.setDate(d.getDate()-1); setFecha(d.toISOString().slice(0,10)); }}><Text style={styles.fechaBtnTxt}>‹ Ayer</Text></Pressable>
          <Pressable style={styles.fechaBtn} onPress={()=>setFecha(new Date().toISOString().slice(0,10))}><Text style={styles.fechaBtnTxt}>Hoy</Text></Pressable>
          <Pressable style={styles.fechaBtn} onPress={()=>{ const d=new Date(fecha); d.setDate(d.getDate()+1); setFecha(d.toISOString().slice(0,10)); }}><Text style={styles.fechaBtnTxt}>Mañana ›</Text></Pressable>
        </View>
      </View>
      {cargando ? <View style={styles.centro}><ActivityIndicator color="#38bdf8" size="large"/><Text style={styles.cargandoTxt}>Cargando…</Text></View> : error ? <View style={styles.centro}><Text style={styles.error}>{error}</Text></View> : !data ? <View style={styles.centro}><Text style={styles.vacio}>Sin datos para {fecha}. El backend debe exponer GET /api/mobile/resumen/dia</Text></View> : (
        <ScrollView contentContainerStyle={styles.lista}>
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Totales {data.fecha || fecha}</Text>
            <View style={styles.kpis}>
              <View style={styles.kpi}><Text style={styles.kpiValor}>{data.totalAcreditados ?? data.total ?? 0}</Text><Text style={styles.kpiLabel}>Acreditados</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiValor}>{data.totalMenus ?? data.totalComidas ?? 0}</Text><Text style={styles.kpiLabel}>Menús entregados</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiValor}>{data.capacidadLocacion ?? '—'}</Text><Text style={styles.kpiLabel}>Capacidad</Text></View>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Asistencia por taller</Text>
            {(data.porTaller || data.talleres || []).map((t,i)=> (
              <View key={i} style={styles.fila}>
                <Text style={styles.filaTitulo}>{t.taller || t.nombre}</Text>
                <Text style={styles.filaSub}>{t.acreditados ?? t.presentes ?? 0}/{t.inscriptos ?? t.cupo ?? 0} · {t.porcentaje ?? (t.cupo? Math.round(((t.acreditados||0)/t.cupo)*100):0)}%</Text>
              </View>
            ))}
            {(!data.porTaller && !data.talleres) ? <Text style={styles.vacio}>Sin desglose por taller</Text> : null}
          </View>
          {data.servicios ? (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Comidas del día</Text>
              {data.servicios.map((s)=> <View key={s.id} style={styles.fila}><Text style={styles.filaTitulo}>{s.titulo}</Text><Text style={styles.filaSub}>{s.asistentes} entregados</Text></View>)}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  flex:{ flex:1, backgroundColor:'#0f172a' },
  barra:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingTop:46, paddingBottom:12, paddingHorizontal:16, backgroundColor:'#0f172a' },
  titulo:{ color:'#f8fafc', fontSize:17, fontWeight:'bold' },
  boton:{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, backgroundColor:'rgba(255,255,255,0.12)', minWidth:60, alignItems:'center' },
  botonTxt:{ color:'#fff' },
  fechaBox:{ paddingHorizontal:16, paddingVertical:10, backgroundColor:'#1e293b', flexDirection:'row', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 },
  fechaLabel:{ color:'#e2e8f0', fontSize:14, fontWeight:'600' },
  fechaBtn:{ backgroundColor:'#334155', paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  fechaBtnTxt:{ color:'#e2e8f0', fontSize:13 },
  centro:{ flex:1, alignItems:'center', justifyContent:'center', padding:30 },
  cargandoTxt:{ color:'#94a3b8', marginTop:12 },
  error:{ color:'#fca5a5' },
  vacio:{ color:'#94a3b8', textAlign:'center' },
  lista:{ padding:16, gap:14 },
  card:{ backgroundColor:'#1e293b', borderRadius:14, padding:16 },
  cardTitulo:{ color:'#f8fafc', fontSize:16, fontWeight:'bold', marginBottom:10 },
  kpis:{ flexDirection:'row', justifyContent:'space-around' },
  kpi:{ alignItems:'center' },
  kpiValor:{ color:'#38bdf8', fontSize:24, fontWeight:'bold' },
  kpiLabel:{ color:'#94a3b8', fontSize:12, marginTop:4 },
  fila:{ paddingVertical:10, borderTopWidth:1, borderTopColor:'#334155' },
  filaTitulo:{ color:'#e2e8f0', fontWeight:'600' },
  filaSub:{ color:'#94a3b8', fontSize:13, marginTop:2 },
});
