import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerDashboardCompleto, obtenerMenuResumen, obtenerResumenDia } from './api';

function formatearMoneda(n){ return `$${Number(n||0).toLocaleString('es-AR')}` }

export default function PantallaDashboardAdmin({ sesion, alExpirarSesion, onVolver }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [resumenDia, setResumenDia] = useState(null);
  const [resumenMenu, setResumenMenu] = useState(null);
  const [dashboardWeb, setDashboardWeb] = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      // Intentar dashboard idéntico a web (5 fuentes) — mismo cálculo que public/js/admin.js cargarDashboard
      const dash = await obtenerDashboardCompleto(sesion).catch(()=>null);
      if (dash) {
        setDashboardWeb(dash);
        setResumenDia(null);
        // para Menús hoy usamos resumen separado si disponible, sino no
        const rm = await obtenerMenuResumen(sesion).catch(()=>null);
        const rmData = rm && rm.ok===true ? rm : rm;
        const rmNorm = rmData?.servicios ? rmData : rmData?.resumen || rmData;
        setResumenMenu(rmNorm || null);
        return;
      }
      // Fallback: endpoint agregado viejo /api/mobile/resumen/dia (192.168.100.20 sin dashboard nuevo)
      setDashboardWeb(null);
      const [rd, rm] = await Promise.all([
        obtenerResumenDia(sesion).catch(()=>null),
        obtenerMenuResumen(sesion).catch(()=>null),
      ]);
      const rdData = rd && rd.ok === true ? rd : rd;
      const rmData = rm && rm.ok === true ? rm : rm;
      if (rdData && !rdData.porTaller && rdData.talleres) rdData.porTaller = rdData.talleres;
      setResumenDia(rdData || null);
      const rmNorm = rmData?.servicios ? rmData : rmData?.resumen || rmData;
      setResumenMenu(rmNorm || null);
      if (!rdData && !rmNorm) setError('Sin datos del backend. Verificá que 192.168.100.20 tenga el deploy nuevo (git pull + pm2 restart).');
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

  // Si hay dashboardWeb (5 fuentes) usar cálculo idéntico a public/js/admin.js cargarDashboard
  let porTaller, ranking, rankingMax, ultimos5, inscriptosEvento, inscriptosTalleres, encuentroConTaller, encuentroSin, inscriptosTalleresDisplay, totalCapacidad, recaudado, cuotasPagadas;
  if (dashboardWeb) {
    const tRes = dashboardWeb.talleres || [];
    const iRes = dashboardWeb.inscripciones || [];
    const aRes = dashboardWeb.asistentes || [];
    const eRes = dashboardWeb.encuentro || { total: 0, personas: [] };
    const pRes = dashboardWeb.pagos || [];
    const personas = Array.isArray(eRes.personas) ? eRes.personas : [];
    const totalE = typeof eRes.total === 'number' ? eRes.total : personas.length;
    // totalGeneral = encuentro total (web prioridad)
    let totalGeneral = totalE;
    if (!totalGeneral && Array.isArray(aRes)) totalGeneral = aRes.length;
    if (!totalGeneral && Array.isArray(iRes)) totalGeneral = new Set(iRes.map(x=>String(x.dni))).size;
    inscriptosEvento = totalGeneral || null;
    inscriptosTalleres = Array.isArray(aRes) ? aRes.length : new Set(iRes.map(x=>String(x.dni))).size;
    // ranking: agrupar por pareja_id MAX inscriptos (admin.js:3104)
    const mapa = new Map();
    for (const t of tRes) {
      const key = t.pareja_id ? Number(t.pareja_id) : Number(t.id);
      const base = String(t.nombre||'').replace(/\s*\(\d+°\s*parte\)\s*/gi,'').trim() || t.nombre;
      if (!mapa.has(key)) mapa.set(key, { id:key, nombre: base, cupo:Number(t.cupo)||0, inscriptos:Number(t.inscriptos)||0 });
      else { const cur=mapa.get(key); cur.inscriptos=Math.max(cur.inscriptos, Number(t.inscriptos)||0); }
    }
    porTaller = [...mapa.values()];
    totalCapacidad = porTaller.reduce((s,t)=>s+Number(t.cupo||0),0);
    inscriptosTalleresDisplay = inscriptosTalleres;
    encuentroConTaller = personas.filter(p=>p.tiene_talleres).length;
    encuentroSin = Math.max(0, Number(totalGeneral||0) - encuentroConTaller);
    if (!personas.length) { encuentroConTaller = inscriptosTalleres; encuentroSin = Math.max(0, Number(totalGeneral||0)-inscriptosTalleres); }
    // ranking
    const ordenado=[...porTaller].sort((a,b)=>Number(a.inscriptos)-Number(b.inscriptos));
    ranking=ordenado.slice(0,5);
    rankingMax=Math.max(...ranking.map(t=>Number(t.inscriptos||0)),1);
    // ultimos5 DNI único más recientes (admin.js:3254)
    const ordenadas=[...iRes].sort((a,b)=> new Date(b.creado_en||0)-new Date(a.creado_en||0));
    const porDni=new Map();
    for(const r of ordenadas){ const dni=String(r.dni||'').trim(); if(!dni||porDni.has(dni)) continue; porDni.set(dni,r); if(porDni.size>=5) break; }
    ultimos5=[...porDni.values()].map(r=>{ const filas=iRes.filter(x=>String(x.dni)===String(r.dni)); const talleres=[...new Set(filas.map(x=>x.taller).filter(Boolean))].join(', '); return { dni:String(r.dni), nombre:r.nombre||'', apellido:r.apellido||'', taller:talleres||r.taller||'', estado_pago:r.estado_pago||'no_pagado', creado_en:r.creado_en||'' }; });
    // recaudado (admin.js:3164)
    recaudado=0; cuotasPagadas=0;
    for(const ap of pRes){ const cuotas=Array.isArray(ap.cuotas)?ap.cuotas:[]; for(const c of cuotas){ recaudado+=Number(c.monto)||0; cuotasPagadas++; } }
  } else {
    porTaller = resumenDia?.porTaller || resumenDia?.talleres || [];
    const rankingOrdenado = [...porTaller].sort((a,b)=> (Number(a.inscriptos||0))-(Number(b.inscriptos||0)));
    ranking = rankingOrdenado.slice(0,5);
    rankingMax = Math.max(...ranking.map(t=> Number(t.inscriptos||0)), 1);
    ultimos5 = resumenDia?.ultimos5 || [];
    inscriptosEvento = resumenDia?.inscriptosEvento ?? resumenDia?.inscriptos_evento ?? null;
    inscriptosTalleres = resumenDia?.inscriptosTalleres ?? resumenDia?.inscriptos_talleres ?? resumenMenu?.totalInscriptos ?? null;
    encuentroConTaller = resumenDia?.encuentroConTaller ?? resumenDia?.encuentro_con_taller ?? null;
    encuentroSin = resumenDia?.encuentroSin ?? resumenDia?.encuentro_sin ?? null;
    inscriptosTalleresDisplay = inscriptosTalleres != null ? inscriptosTalleres : porTaller.reduce((s,t)=>s+Number(t.inscriptos||0),0);
    totalCapacidad = porTaller.reduce((s,t)=>s+Number(t.cupo||0),0);
    recaudado = resumenDia?.recaudado ?? 0;
    cuotasPagadas = resumenDia?.cuotasPagadas ?? resumenDia?.cuotas_pagadas ?? 0;
  }
  const kpi2Valor = (encuentroConTaller != null && encuentroSin != null) ? `${encuentroConTaller} / ${encuentroSin}` : `${inscriptosTalleresDisplay} / ${totalCapacidad}`;
  const kpi2Sub = (encuentroConTaller != null && encuentroSin != null)
    ? `${encuentroSin} sin taller · ${inscriptosEvento ? Math.round(encuentroConTaller/inscriptosEvento*100) : 0}% con taller` + (inscriptosTalleres != null && inscriptosTalleres !== encuentroConTaller ? ` · ${inscriptosTalleres} DNI único con taller (+${inscriptosTalleres - encuentroConTaller} fuera de encuentro)` : '')
    : `${Math.round(inscriptosTalleresDisplay/totalCapacidad*100)||0}% ocupación · ${inscriptosTalleres != null ? 'DNI único' : 'sin datos encuentro'}`;
  const pctOcupacion = totalCapacidad ? Math.round(inscriptosTalleresDisplay/totalCapacidad*100) : 0;
  const pctConTaller = inscriptosEvento ? Math.round((encuentroConTaller!=null?encuentroConTaller:inscriptosTalleresDisplay)/inscriptosEvento*100) : pctOcupacion;

  return (
    <View style={styles.flex}>
      <View style={styles.cabecera}>
        <Text style={styles.cabeceraTitulo}>Dashboard</Text>
        <Pressable style={styles.botonActualizar} onPress={()=>{ setRefrescando(true); cargar(); }}><Text style={styles.botonActualizarTxt}>Actualizar</Text></Pressable>
      </View>
      {error ? <View style={styles.errorBox}><Text style={styles.errorTxt}>{error}</Text></View> : null}
      <ScrollView contentContainerStyle={styles.lista} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={cargar} tintColor="#0ea5e9"/>}>
        <Text style={styles.resumenAyuda}>Vista general — idéntica al Panel Admin web</Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderTopColor:'#38bdf8' }]}>
            <Text style={styles.kpiLabel}>Inscriptos en general</Text>
            <Text style={styles.kpiValue}>{inscriptosEvento != null ? inscriptosEvento : '—'}</Text>
            <Text style={styles.kpiSub}>{inscriptosEvento != null ? `${inscriptosEvento} en encuentro` + (inscriptosTalleres != null ? ` · ${inscriptosTalleres} DNI único en talleres` : '') : 'encuentro_inscripciones · requiere backend actualizado'}</Text>
            <Text style={styles.kpiIcon}>👥</Text>
          </View>
          <View style={[styles.kpiCard, { borderTopColor:'#16a34a' }]}>
            <Text style={styles.kpiLabel}>Inscriptos a talleres / Faltantes</Text>
            <Text style={styles.kpiValue}>{kpi2Valor}</Text>
            <Text style={styles.kpiSub}>{kpi2Sub}</Text>
            <View style={styles.kpiProgress}><View style={[styles.kpiProgressBar, { width: `${Math.min(100, pctConTaller || pctOcupacion)}%` }]} /></View>
            <Text style={styles.kpiIcon}>🎓</Text>
          </View>
          <View style={[styles.kpiCard, { borderTopColor:'#f59e0b' }]}>
            <Text style={styles.kpiLabel}>Monto recaudado</Text>
            <Text style={styles.kpiValue}>{formatearMoneda(recaudado)}</Text>
            <Text style={styles.kpiSub}>{cuotasPagadas} cuotas registradas · actualizado</Text>
            <Text style={styles.kpiIcon}>💰</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitulo}>Menús hoy (tiempo real)</Text>
          {(() => {
            const servicios = resumenMenu?.serviciosHoy || resumenMenu?.servicios || [];
            if (!servicios.length) return <Text style={styles.vacio}>Sin datos de comidas</Text>;
            return servicios.map((s)=> (
              <View key={s.id || s.bloque_id} style={styles.fila}><Text style={styles.filaTitulo}>{s.titulo} · {s.dia}</Text><Text style={styles.filaValor}>{s.asistentes} entregados</Text></View>
            ));
          })()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitulo}>Ranking — Talleres con menos inscriptos</Text>
          <Text style={styles.ayuda}>Top 5 de menor a mayor ocupación · {porTaller.length} talleres</Text>
          {ranking.length===0 ? <Text style={styles.vacio}>No hay talleres cargados.</Text> : ranking.map((t,i)=> {
            const ins = Number(t.inscriptos||0);
            const cupo = Number(t.cupo||0);
            const pctCupo = cupo ? Math.round(ins/cupo*100) : 0;
            const pctMax = rankingMax ? Math.round(ins/rankingMax*100) : 0;
            return (
              <View key={i} style={styles.rankingRow}>
                <View style={{ flex:1 }}>
                  <Text style={styles.rankingLabel}>{t.taller || t.nombre}</Text>
                  <Text style={styles.rankingMeta}>{cupo ? `${ins}/${cupo} · ${pctCupo}%` : `${ins} inscriptos`}</Text>
                  <View style={styles.rankingBarWrap}><View style={[styles.rankingBar, { width: `${Math.min(100,pctMax)}%`, backgroundColor: pctCupo>=90 ? '#ef4444' : pctCupo>=70 ? '#f59e0b' : '#16a34a' }]} /></View>
                </View>
                <Text style={styles.rankingValor}>{ins}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitulo}>Últimos 5 inscriptos</Text>
            <Text style={styles.ayuda}>DNI único · más recientes</Text>
          </View>
          {ultimos5.length===0 ? <Text style={styles.vacio}>Sin datos — actualizá el backend en 192.168.100.20 (git pull + pm2 restart).</Text> : ultimos5.map((u, idx)=> (
            <View key={idx} style={styles.filaDetalle}>
              <View style={{ flex:1 }}>
                <Text style={styles.filaTitulo}>{u.apellido} {u.nombre} · {u.dni}</Text>
                <Text style={styles.sub} numberOfLines={1}>{u.taller || '—'} · {u.estado_pago}</Text>
              </View>
              <Text style={styles.sub}>{u.creado_en ? String(u.creado_en).slice(0,10) : ''}</Text>
            </View>
          ))}
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
