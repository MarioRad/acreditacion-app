import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerMenuResumen, obtenerResumenDia } from './api';

function formatearMoneda(n){ return `$${Number(n||0).toLocaleString('es-AR')}` }

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
        obtenerResumenDia(sesion).catch(()=>null),
        obtenerMenuResumen(sesion).catch(()=>null),
      ]);
      let rdFinal = rd;
      // fallback si backend 192.168.100.20 aún no tiene /resumen/dia (404->null): intentar /api/talleres público
      if (!rdFinal || (!rdFinal.porTaller && !rdFinal.talleres)) {
        try {
          const base = String(sesion.servidorUrl||'').replace(/\/+$/,'');
          const res = await fetch(`${base}/api/talleres`, { headers: { 'Content-Type':'application/json' } });
          if (res.ok) {
            const talleres = await res.json();
            const mockPorTaller = (Array.isArray(talleres)? talleres : []).map(t=> ({
              taller: t.nombre, nombre: t.nombre, fecha: t.fecha||'', hora: t.hora||'', cupo: Number(t.cupo||0), inscriptos: Number(t.inscriptos||0), acreditados: 0, porcentaje: 0,
            }));
            rdFinal = rdFinal || { porTaller: mockPorTaller, totalAcreditados: 0, totalInscriptos: mockPorTaller.reduce((s,x)=>s+x.inscriptos,0) };
            if (rdFinal && !rdFinal.porTaller) rdFinal.porTaller = mockPorTaller;
          }
        } catch (_) {}
      }
      setResumenDia(rdFinal);
      setResumenMenu(rm?.servicios ? rm : rm?.resumen || rm);
      if (!rdFinal && !rm) setError('Sin datos del backend. Verificá que 192.168.100.20 tenga el deploy nuevo (git pull + pm2 restart).');
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

  const porTaller = resumenDia?.porTaller || resumenDia?.talleres || [];
  const ranking = [...porTaller].sort((a,b)=> (a.inscriptos||0)-(b.inscriptos||0)).slice(0,5);
  // Usuario aclara: inscriptos = totales en evento (encuentro_inscripciones), inscriptos a talleres = DNI único en inscripciones, acreditados = DNI único en acreditaciones
  const inscriptosEvento = resumenDia?.inscriptosEvento ?? resumenDia?.inscriptos_evento ?? null;
  const inscriptosTalleres = resumenDia?.inscriptosTalleres ?? resumenDia?.inscriptos_talleres ?? resumenMenu?.totalInscriptos ?? null;
  // fallback si backend viejo: calcular distinct tallers sum no es correcto, usar inscriptosTalleres si existe si no porTaller sum (no distinct) solo como fallback
  const inscriptosTalleresDisplay = inscriptosTalleres != null ? inscriptosTalleres : porTaller.reduce((s,t)=>s+Number(t.inscriptos||0),0);
  const totalCapacidad = porTaller.reduce((s,t)=>s+Number(t.cupo||0),0);
  const totalAcreditados = resumenDia?.totalAcreditados ?? resumenDia?.total ?? 0;
  const totalMenus = resumenDia?.totalMenus ?? 0;
  const pctOcupacion = totalCapacidad ? Math.round(inscriptosTalleresDisplay/totalCapacidad*100) : 0;

  return (
    <View style={styles.flex}>
      <View style={styles.cabecera}>
        <Text style={styles.cabeceraTitulo}>Dashboard</Text>
        <Pressable style={styles.botonActualizar} onPress={()=>{ setRefrescando(true); cargar(); }}><Text style={styles.botonActualizarTxt}>Actualizar</Text></Pressable>
      </View>
      {error ? <View style={styles.errorBox}><Text style={styles.errorTxt}>{error}</Text></View> : null}
      <ScrollView contentContainerStyle={styles.lista} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={cargar} tintColor="#0ea5e9"/>}>
        <Text style={styles.resumenAyuda}>Vista general — similar al Panel Admin web (DNI único)</Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderTopColor:'#38bdf8' }]}>
            <Text style={styles.kpiLabel}>Inscriptos totales en el evento</Text>
            <Text style={styles.kpiValue}>{inscriptosEvento != null ? inscriptosEvento : '—'}</Text>
            <Text style={styles.kpiSub}>{inscriptosEvento != null ? `${inscriptosEvento} en encuentro` : 'encuentro_inscripciones'}</Text>
            <Text style={styles.kpiIcon}>👥</Text>
          </View>
          <View style={[styles.kpiCard, { borderTopColor:'#16a34a' }]}>
            <Text style={styles.kpiLabel}>Inscriptos a talleres (DNI único)</Text>
            <Text style={styles.kpiValue}>{inscriptosTalleresDisplay} / {totalCapacidad}</Text>
            <Text style={styles.kpiSub}>{pctOcupacion}% ocupación · {inscriptosTalleres != null ? 'DNI único' : 'fallback suma'}</Text>
            <View style={styles.kpiProgress}><View style={[styles.kpiProgressBar, { width: `${Math.min(100,pctOcupacion)}%` }]} /></View>
            <Text style={styles.kpiIcon}>🎓</Text>
          </View>
          <View style={[styles.kpiCard, { borderTopColor:'#f59e0b' }]}>
            <Text style={styles.kpiLabel}>Acreditados (DNI único)</Text>
            <Text style={styles.kpiValue}>{totalAcreditados} {totalMenus ? `· ${totalMenus} menús` : ''}</Text>
            <Text style={styles.kpiSub}>DNI único · menús entregados hoy</Text>
            <Text style={styles.kpiIcon}>✅</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitulo}>Menús hoy (tiempo real)</Text>
          {resumenMenu?.servicios ? (
            resumenMenu.servicios.map((s)=> (
              <View key={s.id} style={styles.fila}><Text style={styles.filaTitulo}>{s.titulo} · {s.dia}</Text><Text style={styles.filaValor}>{s.asistentes} entregados</Text></View>
            ))
          ) : <Text style={styles.vacio}>Sin datos de comidas</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitulo}>Ranking — Talleres con menos inscriptos</Text>
          <Text style={styles.ayuda}>Top 5 de menor a mayor ocupación</Text>
          {ranking.length===0 ? <Text style={styles.vacio}>No hay talleres cargados.</Text> : ranking.map((t,i)=> {
            const pct = t.cupo ? Math.round((t.inscriptos||0)/t.cupo*100) : 0;
            return (
              <View key={i} style={styles.rankingRow}>
                <View style={{ flex:1 }}>
                  <Text style={styles.rankingLabel}>{t.taller || t.nombre}</Text>
                  <Text style={styles.rankingMeta}>{t.inscriptos||0} inscriptos · cupo {t.cupo} · {pct}%</Text>
                  <View style={styles.rankingBarWrap}><View style={[styles.rankingBar, { width: `${Math.min(100,pct)}%`, backgroundColor: pct>85 ? '#ef4444' : pct>60 ? '#f59e0b' : '#16a34a' }]} /></View>
                </View>
                <Text style={styles.rankingValor}>{t.inscriptos}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitulo}>Talleres — detalle</Text>
            <Text style={styles.ayuda}>{porTaller.length} talleres</Text>
          </View>
          {porTaller.map((t,i)=> (
            <View key={i} style={styles.filaDetalle}>
              <View style={{ flex:1 }}>
                <Text style={styles.filaTitulo}>{t.taller || t.nombre}</Text>
                <Text style={styles.sub}>{t.fecha} {t.hora} · cupo {t.cupo} · inscriptos {t.inscriptos} · acreditados {t.acreditados ?? 0}</Text>
                <Text style={styles.sub}>Libres: {Math.max(0, (t.cupo||0)-(t.inscriptos||0))} · Pendientes: {Math.max(0,(t.inscriptos||0)-(t.acreditados||0))}</Text>
              </View>
              <Text style={styles.porcentaje}>{t.porcentaje ?? (t.cupo? Math.round(((t.acreditados||0)/t.cupo)*100):0)}%</Text>
            </View>
          ))}
          {porTaller.length===0 ? <Text style={styles.vacio}>Sin detalle por taller — verificar GET /api/mobile/resumen/dia en 192.168.100.20</Text> : null}
        </View>

        <Text style={styles.footer}>Actualización automática cada 15 s · Capacidad locación en Configuración web</Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  flex:{ flex:1, backgroundColor:'#0f172a' },
  centro:{ flex:1, backgroundColor:'#0f172a', alignItems:'center', justifyContent:'center', padding:30 },
  cargandoTxt:{ color:'#94a3b8', marginTop:12 },
  cabecera:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#1e293b' },
  cabeceraTitulo:{ color:'#f8fafc', fontSize:18, fontWeight:'bold' },
  botonActualizar:{ backgroundColor:'#1e293b', paddingHorizontal:14, paddingVertical:8, borderRadius:8, borderWidth:1, borderColor:'#334155' },
  botonActualizarTxt:{ color:'#e2e8f0', fontWeight:'600' },
  errorBox:{ backgroundColor:'#7f1d1d', padding:10, marginHorizontal:16, borderRadius:8, marginTop:6 },
  errorTxt:{ color:'#fecaca', textAlign:'center' },
  lista:{ padding:16, gap:14, paddingBottom:32 },
  resumenAyuda:{ color:'#64748b', fontSize:12, textAlign:'center' },
  kpiGrid:{ flexDirection:'column', gap:12 },
  kpiCard:{ backgroundColor:'#1e293b', borderRadius:14, padding:16, borderTopWidth:3, position:'relative', overflow:'hidden' },
  kpiLabel:{ color:'#94a3b8', fontSize:12, fontWeight:'600', textTransform:'uppercase', letterSpacing:0.5 },
  kpiValue:{ color:'#f8fafc', fontSize:22, fontWeight:'bold', marginTop:6 },
  kpiSub:{ color:'#64748b', fontSize:12, marginTop:4 },
  kpiIcon:{ position:'absolute', right:14, top:14, fontSize:22, opacity:0.8 },
  kpiProgress:{ height:6, backgroundColor:'#0f172a', borderRadius:3, marginTop:10, overflow:'hidden' },
  kpiProgressBar:{ height:'100%', backgroundColor:'#16a34a' },
  section:{ backgroundColor:'#1e293b', borderRadius:14, padding:16 },
  sectionTitulo:{ color:'#f8fafc', fontSize:15, fontWeight:'bold' },
  sectionHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  ayuda:{ color:'#64748b', fontSize:12, marginTop:4 },
  fila:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8, borderTopWidth:1, borderTopColor:'#334155', gap:10 },
  filaTitulo:{ color:'#e2e8f0', fontSize:14, fontWeight:'600' },
  filaValor:{ color:'#38bdf8', fontSize:14, fontWeight:'bold' },
  filaDetalle:{ flexDirection:'row', alignItems:'center', paddingVertical:10, borderTopWidth:1, borderTopColor:'#334155', gap:10 },
  sub:{ color:'#94a3b8', fontSize:12, marginTop:2 },
  porcentaje:{ color:'#4ade80', fontWeight:'bold', fontSize:16 },
  vacio:{ color:'#64748b', fontSize:13, marginTop:8 },
  rankingRow:{ flexDirection:'row', alignItems:'center', paddingVertical:10, borderTopWidth:1, borderTopColor:'#334155', gap:12 },
  rankingLabel:{ color:'#e2e8f0', fontWeight:'600', fontSize:14 },
  rankingMeta:{ color:'#64748b', fontSize:12, marginTop:2 },
  rankingBarWrap:{ height:6, backgroundColor:'#0f172a', borderRadius:3, marginTop:6, overflow:'hidden' },
  rankingBar:{ height:'100%' },
  rankingValor:{ color:'#f8fafc', fontWeight:'bold', fontSize:16, minWidth:24, textAlign:'right' },
  footer:{ color:'#475569', fontSize:12, textAlign:'center', marginTop:8 },
});
