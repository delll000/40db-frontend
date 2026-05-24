import { describe, expect, it } from 'vitest'
import {
  ApiHttpError,
  NetworkError,
  isApiError,
  isApiHttpError,
  isAuthError,
  isForbiddenError,
} from '@/services/errors'

describe('ApiHttpError', () => {
  it('expone status, code, correlationId y details', () => {
    const err = new ApiHttpError(404, {
      code: 'reporte_not_found',
      message: 'El reporte no existe.',
      correlation_id: '01HF8K000',
      details: { hint: 'check id' },
    })

    expect(err.status).toBe(404)
    expect(err.code).toBe('reporte_not_found')
    expect(err.correlationId).toBe('01HF8K000')
    expect(err.details).toEqual({ hint: 'check id' })
    expect(err.message).toBe('El reporte no existe.')
    expect(err.name).toBe('ApiHttpError')
  })

  it('details cae a null cuando viene undefined', () => {
    const err = new ApiHttpError(500, {
      code: 'internal_error',
      message: 'boom',
      correlation_id: 'cid',
    })
    expect(err.details).toBeNull()
  })
})

describe('guards', () => {
  const apiErr = new ApiHttpError(403, {
    code: 'comuna_mismatch',
    message: 'Otra comuna.',
    correlation_id: 'cid',
  })
  const netErr = new NetworkError()
  const plain = new Error('algo')

  it('isApiHttpError distingue ApiHttpError de otros Error', () => {
    expect(isApiHttpError(apiErr)).toBe(true)
    expect(isApiHttpError(netErr)).toBe(false)
    expect(isApiHttpError(plain)).toBe(false)
    expect(isApiHttpError(null)).toBe(false)
  })

  it('isApiError matchea por código exacto', () => {
    expect(isApiError(apiErr, 'comuna_mismatch')).toBe(true)
    expect(isApiError(apiErr, 'forbidden')).toBe(false)
    expect(isApiError(plain, 'comuna_mismatch')).toBe(false)
  })

  it('isAuthError matchea solo 401', () => {
    const auth = new ApiHttpError(401, {
      code: 'invalid_token',
      message: '',
      correlation_id: '',
    })
    expect(isAuthError(auth)).toBe(true)
    expect(isAuthError(apiErr)).toBe(false) // 403
    expect(isAuthError(netErr)).toBe(false)
  })

  it('isForbiddenError matchea solo 403', () => {
    expect(isForbiddenError(apiErr)).toBe(true) // 403
    const four04 = new ApiHttpError(404, { code: 'x', message: '', correlation_id: '' })
    expect(isForbiddenError(four04)).toBe(false)
  })
})
