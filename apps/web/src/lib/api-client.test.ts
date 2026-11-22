import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest } from './api-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('makes a GET request and returns JSON data', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', mockFetch)

    const result = await apiRequest<{ status: string }>('/health/live')

    expect(result).toEqual({ status: 'ok' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health/live'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('sends POST data as JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', mockFetch)

    await apiRequest('/example', {
      method: 'POST',
      body: { name: 'OpsHub' },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ name: 'OpsHub' }),
        credentials: 'include',
      }),
    )

    const requestOptions = mockFetch.mock.calls[0][1] as RequestInit
    const headers = new Headers(requestOptions.headers)

    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('throws ApiError when the server returns an error', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))

    vi.stubGlobal('fetch', mockFetch)

    await expect(apiRequest('/example')).rejects.toBeInstanceOf(ApiError)
  })

  it('returns undefined for a 204 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

    vi.stubGlobal('fetch', mockFetch)

    const result = await apiRequest<void>('/example')

    expect(result).toBeUndefined()
  })
})
