export async function setup() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
  const res = await fetch(`${BASE_URL}/api/test-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'setup', projectId: 'test-regression-project' }),
  })
  if (!res.ok) throw new Error('Test data setup failed')
  return { projectId: 'test-regression-project' }
}

export async function teardown() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
  await fetch(`${BASE_URL}/api/test-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cleanup', projectId: 'test-regression-project' }),
  })
}
