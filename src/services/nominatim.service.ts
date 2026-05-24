/**
 * Reverse-geocoder de OpenStreetMap (Nominatim) para resolver `comuna_id`
 * desde `(lat, lng)` antes del `POST /reportes`.
 *
 * Contrato: `40db-backend/docs/api.md §4.5.1`. El backend no carga polígonos
 * comunales — delega al cliente el match contra el catálogo `/api/v1/comunas`.
 *
 * Política de fallo silencioso: si Nominatim falla, retorna `null` y el flujo
 * sigue sin `comuna_id`. El backend hace fallback a `usuario.comuna_id`.
 *
 * Notas operacionales:
 * - Nominatim recomienda User-Agent identificable, pero los navegadores prohíben
 *   setearlo desde fetch. Mandamos `Accept-Language: es` y el Referer del sitio
 *   alcanza para no ser bloqueados a este volumen (1 req por reporte).
 * - Rate limit público: 1 req/s. No es problema para reportes individuales.
 *   Si en el futuro hay flujos batch, hostear Nominatim propio o migrar a Mapbox.
 */

import type { Comuna } from '@/types/api'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

interface NominatimAddress {
  county?: string
  city_district?: string
  suburb?: string
  town?: string
  [key: string]: string | undefined
}

interface NominatimResponse {
  address?: NominatimAddress
}

/** Lowercase + sin tildes. `Maipú` → `maipu`, `Las Condes` → `las condes`. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Resultado de la resolución de comuna.
 *
 * - `id`: el `comuna_id` del catálogo del back, si Nominatim devolvió un nombre
 *   que matchea contra `getComunas()`. Es lo que el caller manda al POST.
 * - `nombreSugerido`: el nombre que Nominatim devolvió, **independientemente**
 *   de si está catalogado. Sirve para diferenciar "Nominatim falló" (todo null)
 *   de "Nominatim funcionó pero la comuna no está habilitada en el back"
 *   (`id=null` con `nombreSugerido='Maipú'`). El caller usa este último caso
 *   para avisarle al usuario por qué su reporte cayó al fallback.
 */
export interface ResolveComunaResult {
  id: number | null
  nombreSugerido: string | null
}

/**
 * Resuelve `comuna_id` desde `(lat, lng)` matchando contra el catálogo del
 * backend.
 *
 * Para entender el flujo de fallback ver `api.md §4.5.1`: si esta función no
 * devuelve `id`, el caller debe omitir `comuna_id` del body y dejar que el back
 * use `usuario.comuna_id`. Si Nominatim devolvió un nombre razonable pero ese
 * nombre no está en el catálogo, el caller debería avisarle al usuario que su
 * reporte va a quedar asociado a su comuna del perfil, no a donde marcó.
 */
export async function resolveComunaId(
  lat: number,
  lng: number,
  catalogo: Comuna[],
): Promise<ResolveComunaResult> {
  const fail: ResolveComunaResult = { id: null, nombreSugerido: null }
  try {
    const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=es`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'es' },
    })
    if (!res.ok) return fail

    const data = (await res.json()) as NominatimResponse
    const addr = data.address ?? {}
    // En Chile, Nominatim devuelve la comuna principalmente en `suburb`. El
    // `county` suele ser "Provincia de ..." (un nivel administrativo más alto).
    // El orden refleja prioridad observada empíricamente con OSM.
    const candidates = [addr.suburb, addr.city_district, addr.town, addr.county].filter(
      (s): s is string => Boolean(s),
    )

    let nombreSugerido: string | null = null
    for (const candidate of candidates) {
      const norm = normalize(candidate)
      const match = catalogo.find((c) => normalize(c.nombre) === norm)
      if (match) return { id: match.id, nombreSugerido: match.nombre }
      // Guardamos el primer candidato no-vacío como sugerencia, aunque no matchee.
      if (nombreSugerido === null) nombreSugerido = candidate
    }
    return { id: null, nombreSugerido }
  } catch {
    return fail
  }
}
