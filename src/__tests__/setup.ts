const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

export const TEST_PROJECT_ID = 'test-regression-project'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export async function api(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const url = `${BASE_URL}${path}`
  const options: RequestInit = { method }

  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)
  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  return { status: res.status, data }
}
