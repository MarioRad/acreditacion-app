function normalizarUrl(url) {
  let u = String(url || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u.replace(/\/+$/, '');
}

async function pedir(url, opciones = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 10000);
  try {
    const res = await fetch(url, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        ...(opciones.headers || {}),
      },
      signal: controlador.signal,
    });
    let cuerpo = null;
    try {
      cuerpo = await res.json();
    } catch (_) {
      cuerpo = null;
    }
    if (!res.ok) {
      const err = new Error((cuerpo && cuerpo.error) || `Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return cuerpo;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('El servidor no respondió.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function iniciarSesion(servidor, usuario, password) {
  const base = normalizarUrl(servidor);
  if (!base) {
    const err = new Error('Ingresá la dirección del servidor.');
    err.validacion = true;
    throw err;
  }
  const datos = await pedir(`${base}/api/mobile/login`, {
    method: 'POST',
    body: JSON.stringify({ username: String(usuario || '').trim(), password: String(password || '') }),
  });
  return {
    servidorUrl: base,
    token: datos.token,
    nombre: datos.nombre || usuario,
    rol: datos.rol || 'operador',
  };
}

export async function crearNotificacion(sesion, { titulo, mensaje, tipo }) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/notificaciones`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify({ titulo, mensaje, tipo }),
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e.status === 403) {
      const err = new Error(e.message || 'No tenés permisos para enviar notificaciones (solo admin).');
      err.permisoDenegado = true;
      throw err;
    }
    if (e.status === 404) {
      const err = new Error(
        'El servidor no tiene habilitado POST /api/mobile/notificaciones (404). Actualizá el backend: en 192.168.100.20 hacé `cd /var/dramatiza && git pull origin main && pm2 restart inscripciones` (o reiniciá el servicio del backend).'
      );
      err.status = 404;
      throw err;
    }
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function obtenerNotificaciones(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/notificaciones`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e.status === 404) {
      const err = new Error('Endpoint de notificaciones no encontrado (404). Verificá que el backend esté actualizado.');
      err.status = 404;
      throw err;
    }
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function verificarCodigo(sesion, codigo) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/acreditar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify({ codigo }),
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function entregarMenu(sesion, codigo) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/menu/entregar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify({ codigo }),
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function obtenerMenuResumen(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/menu/resumen`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e.status === 404) return { resumen: null, fallback: true };
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function obtenerTalleresAsignados(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/talleres/asignados`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e.status === 404) return { talleres: [] };
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function registrarAsistenciaTaller(sesion, { codigo, dni, tallerId, tipo }) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/taller/asistencia`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify({ codigo, dni, tallerId, tipo }),
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function obtenerEstadoTaller(sesion, tallerId) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/talleres/${tallerId}/estado`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e.status === 404) return null;
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function obtenerResumenDia(sesion, fecha) {
  const base = normalizarUrl(sesion.servidorUrl);
  const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
  try {
    return await pedir(`${base}/api/mobile/resumen/dia${qs}`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) {
      const err = new Error('La sesión expiró. Iniciá sesión nuevamente.');
      err.sesionExpirada = true;
      throw err;
    }
    if (e.status === 404) return null;
    if (e instanceof TypeError || !e.status) {
      const err = new Error('Sin conexión con el servidor.');
      err.sinConexion = true;
      throw err;
    }
    throw e;
  }
}

export async function obtenerAsignaciones(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/asignaciones`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 404) return { asignaciones: [] };
    throw e;
  }
}

export async function crearAsignacion(sesion, { operador, tallerId, dia, bloqueId }) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/asignaciones`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sesion.token}` },
    body: JSON.stringify({ operador, tallerId, dia, bloqueId }),
  });
}
export async function actualizarAsignacion(sesion, id, { operador, tallerId, dia, bloqueId }) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/asignaciones/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sesion.token}` },
    body: JSON.stringify({ operador, tallerId, dia, bloqueId }),
  });
}
export async function eliminarAsignacion(sesion, id) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/asignaciones/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sesion.token}` },
  });
}

export async function marcarNotificacionLeida(sesion, id) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/notificaciones/${id}/leer`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) { const err=new Error('Sesión expirada'); err.sesionExpirada=true; throw err; }
    throw e;
  }
}

export async function marcarTodasLeidas(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/notificaciones/leer-todas`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) { const err=new Error('Sesión expirada'); err.sesionExpirada=true; throw err; }
    throw e;
  }
}

export async function obtenerDashboard(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/resumen/dia`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function obtenerOperadores(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    return await pedir(`${base}/api/mobile/operadores`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
  } catch (e) {
    if (e.status === 401) { const err=new Error('Sesión expirada'); err.sesionExpirada=true; throw err; }
    if (e.status === 404) return { operadores: [] };
    throw e;
  }
}

export async function obtenerTalleres(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  try {
    // primero intentar endpoint autenticado mobile
    const r = await pedir(`${base}/api/mobile/talleres`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
    return r.talleres || r || [];
  } catch (e) {
    if (e.status === 401) { const err=new Error('Sesión expirada'); err.sesionExpirada=true; throw err; }
    // fallback público /api/talleres sin auth
    try {
      const res = await fetch(`${base}/api/talleres`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.talleres || [];
    } catch (_) { return []; }
  }
}

export async function obtenerUsuarios(sesion) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/usuarios`, { headers: { Authorization: `Bearer ${sesion.token}` } });
}
export async function crearUsuario(sesion, { username, password, nombre, rol, activo }) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/usuarios`, { method: 'POST', headers: { Authorization: `Bearer ${sesion.token}` }, body: JSON.stringify({ username, password, nombre, rol, activo }) });
}
export async function actualizarUsuario(sesion, id, { nombre, rol, activo, password }) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/usuarios/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${sesion.token}` }, body: JSON.stringify({ nombre, rol, activo, password }) });
}
export async function eliminarUsuario(sesion, id) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/usuarios/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${sesion.token}` } });
}

async function pedirDashboard(sesion, path) {
  const base = normalizarUrl(sesion.servidorUrl);
  return pedir(`${base}/api/mobile/dashboard/${path}`, { headers: { Authorization: `Bearer ${sesion.token}` } });
}
export async function obtenerDashboardCompleto(sesion) {
  try {
    const [talleres, inscripciones, asistentes, encuentro, pagos] = await Promise.all([
      pedirDashboard(sesion, 'talleres').catch(e=>{ if(e.status===404) return null; throw e; }),
      pedirDashboard(sesion, 'inscripciones').catch(e=>{ if(e.status===404) return null; throw e; }),
      pedirDashboard(sesion, 'asistentes').catch(e=>{ if(e.status===404) return null; throw e; }),
      pedirDashboard(sesion, 'encuentro').catch(e=>{ if(e.status===404) return null; throw e; }),
      pedirDashboard(sesion, 'pagos').catch(e=>{ if(e.status===404) return null; throw e; }),
    ]);
    if (!talleres || !inscripciones || !asistentes || !encuentro || !pagos) return null;
    return { talleres, inscripciones, asistentes, encuentro, pagos };
  } catch (e) {
    if (e.status===401){ const err=new Error('Sesión expirada'); err.sesionExpirada=true; throw err; }
    return null;
  }
}
