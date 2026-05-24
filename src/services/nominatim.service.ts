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
 * Resuelve `comuna_id` desde `(lat, lng)` matchando contra el catálogo del
 * backend. Retorna `null` si Nominatim falla o la comuna no está catalogada
 * (en ambos casos el caller debe omitir `comuna_id` y dejar el fallback al back).
 */
export async function resolveComunaId(
  lat: number,
  lng: number,
  catalogo: Comuna[],
): Promise<number | null> {
  try {
    const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=es`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'es' },
    })
    if (!res.ok) return null

    const data = (await res.json()) as NominatimResponse
    const addr = data.address ?? {}
    const candidates = [addr.county, addr.city_district, addr.suburb, addr.town].filter(
      (s): s is string => Boolean(s),
    )

    for (const candidate of candidates) {
      const norm = normalize(candidate)
      const match = catalogo.find((c) => normalize(c.nombre) === norm)
      if (match) return match.id
    }
    return null
  } catch {
    return null
  }
}
