App Dramatiza Movil

uso de base de datos 192.168.100.129, no usar supabase

- Admin
Menu side,con las opciones existentes más:

seccion para gestion y control de pagos, y usuarios autorizados
seccion para gestion y control de asistentes
seccion para gestion y control de talleres
Puede realizar las tareas de Operador y Menu
Pantalla principal, seccion de informacion (
 - cantidad de asistentes por taller en tiempo real
 - 
)
resumen del día al cierre de la jornada

(
Cantidad de Menu entregados
% de asistencia por taller


)


- Superior

    Asigna a operador taller a tomar asistencia
    Recibe avisos del sistema 10 minutos antes de finalizar cada actividad del programa para cumplimentar los tiempos propuestos
    tambien puede realizar las tareas de Menu, Operador
    

- Menu
 
  Seguimiento de entrega de menu en tiempo real
  Aviso en pantalla de restriccion alimentaria al leer el QR confirmando al entregar el menu al asistentes
  Aviso en pantalla 30 minutos antes de iniciar el periodo de (desayuno/almuerzo/merienda) para preparativos


 - Operador
   
    Avisar en pantalla si faltan asistentes en algun taller para controlar los cupos
    Lectura de Qr o ingreso de documento (segun taller asignado por superior) para marcar asistencia de ingreso y egreso de asistentes a taller según programa

## Propuesta - Plan Desarrollo App Dramatiza Móvil (2026-09-12)

> Backend target exclusivo: `dramatiza-local` (192.168.100.20 `/var/dramatiza`, `https://apl.radich.duckdns.org`). Expo v57 (`https://docs.expo.dev/versions/v57.0.0/`).

### 0) Estado Actual Validado
- Roles vigentes `dramatiza-local/src/server.js:42` `ROLES_VALIDOS=['admin','operador']` + 4 permisos `perm_inscripciones/perm_talleres/perm_encuentro/perm_acreditacion` (`supabase/migrations/001:146`). `Superior/Menu` no existen (`public/admin.html:871` solo `foto_pos`).
- Móviles actuales: `POST /api/mobile/login:1196`, `POST /api/mobile/acreditar:1222` (con auto-comida 20min `db.js:979`), `GET/POST /api/mobile/notificaciones:2027/2041` (admin, `esAdmin=rol==='admin'` `PantallaNotificaciones.js:43`), polling 15s. Sesión `AsyncStorage:acreditacion.sesion` `App.js:12` + `SecureStore:acreditacion.credenciales` `PantallaLogin.js:19`.
- Programa: `programa_bloques (dia YYYY-MM-DD, hora_inicio/fin, tipo)` `db.js:700`, `talleres (fecha/hora/duracion_hs/pareja_id)` `db.js:98` con `bloquesHorario:106`. Comidas = `programa_bloques tipo='break'` + `comidas_asistencias` `db.js:973`. Sin `almuerzo` diferenciado (`server.js:1319` solo desayuno/merienda/otro).
- Gaps: sin `taller_asistencias` ingreso/egreso, sin `operador_taller_asignaciones`, sin job 10/30min, `PantallaEntregaMenu.js:71` mock sin `POST`, sin dashboard/resumen día, sin RBAC en `PantallaMenu.js:28`/`App.js:63`.

### 1) Decisiones de Arquitectura
- Extender `ROLES_VALIDOS` a `['admin','superior','menu','operador']` con herencia `admin>*`, `superior: menu+operador+asignar`, manteniendo compatibilidad `operador` legacy.
- No romper `perm_*` actuales: `superior` bypass parcial, `menu` requiere `perm_acreditacion`, `operador` mantiene 4 checks `requirePermiso:104`.
- Añadir `expo-notifications` `app.json:23` (`android.permissions NOTIFICATIONS`) para avisos 10/30min; fallback polling si no hay `eas build`.
- Parámetro `margenMs` inyectado: `POST /acreditar` mantiene 20min, `POST /menu/entregar` usa 30min (no tocar default `db.js:979`).

### 2) Fase 0 - Cimientos
- Migración `006_roles_superior_menu.sql`: `operador_taller_asignaciones(id, operador_username FK usuarios, taller_id FK talleres, dia DATE, bloque_id FK programa_bloques, creado_por, creado_en)`, `taller_asistencias(id, dni, taller_id, bloque_id, tipo CHECK('ingreso','egreso'), usuario, registrado_en, UNIQUE(dni,taller_id,bloque_id,tipo))`.
- Expo config `app.json` plugin notifications.

### 3) Fase 1 - Menu Tiempo Real (quick win)
- Backend: `POST /api/mobile/menu/entregar` (valida `perm_acreditacion`, `obtenerServicioComidaActivo(30*60*1000)`, `registrarAsistenciaComida`) + `GET /api/mobile/menu/resumen` (`resumenComidas` filtrado hoy) + fix `clasificarServicioComida` para `almuerzo`.
- App: `src/api.js` `entregarMenu`/`obtenerMenuResumen`, `PantallaEntregaMenu.js:71` de mock a `await entregarMenu` + polling conteo, `app.json` permisos.

### 4) Fase 2 - Operador Ingreso/Egreso por Taller
- Backend: `GET /api/mobile/talleres/asignados`, `POST /api/mobile/taller/asistencia {codigo|dni, tallerId, tipo}`, `GET /api/mobile/talleres/:id/estado {cupo,inscriptos,presentes,faltantes,porcentaje}` (usa `bloquesHorario:106` vs `ahora`).
- App: `PantallaAsistenciaTaller.js` (selector taller asignado, CameraView + DNI TextInput 7-8, botones Ingreso/Egreso, banner faltantes), `PantallaMenu.js:4` `OPCIONES` con `roles:[]`, `App.js:63` RBAC.

### 5) Fase 3 - Superior y Avisos 10/30min
- Backend job `setInterval 60s` en `src/server.js` escanea `programa_bloques`, `fin-10min` → `crearNotificacion` `recordatorio` para `superior`, `inicio-30min` → `info` para `menu`, flag `notif_enviada` para no repetir.
- App: `expo-notifications` schedule + `PantallaAsignaciones.js` (Superior asigna Operador→Taller/día).

### 6) Fase 4 - Admin Dashboard y Resumen Día
- Backend: `GET /api/mobile/resumen/dia?fecha=YYYY-MM-DD` (agrega `resumenComidas` día + `contarAcreditados` día + `porTaller` `%`) .
- App: `PantallaDashboardAdmin.js` (menús hoy, % taller, faltantes, `capacidad_locacion` `server.js:1863`), `PantallaResumenDia.js` cierre.

### 7) Fase 5 - Testing y Deploy
- `scripts/prueba-api-movil.js` extender, Expo Go `npx expo start --tunnel` vs `192.168.100.20:3000`, deploy `cd /var/dramatiza && git pull origin main && pm2 restart inscripciones` (verificado `GET /api/version` 1.1.0).

### 8) Riesgos
- Roles nuevos sin migrar `usuarios.rol` rompe `ROLES_VALIDOS` check `server.js:802`. Mitiga migración default `operador`.
- Cambiar default 20min a 30min rompe acreditación; usar param inyectado.
- Notificaciones background requieren `eas build`; alternativa Fase 3a solo in-app.

### 9) Preguntas Pendientes
- ¿Confirmás `ROLES_VALIDOS` 4 + herencia?
- ¿Prioridad Fase1 vs Fase2?
- ¿“Faltantes” = `cupo-presentes` o `inscriptos-presentes`?
- ¿Solo `dramatiza-local` se toca?
   
