const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export class ApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
