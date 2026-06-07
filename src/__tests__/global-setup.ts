export async function setup() {
  // CI 环境（无 TEST_BASE_URL）跳过 API 种子数据初始化
  if (!process.env.TEST_BASE_URL) {
    console.log('[global-setup] 跳过种子数据初始化（CI 环境）')
    return { projectId: 'test-regression-project' }
  }

  const BASE_URL = process.env.TEST_BASE_URL
  try {
    const res = await fetch(`${BASE_URL}/api/test-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup', projectId: 'test-regression-project' }),
    })
    if (!res.ok) throw new Error(`Test data setup failed: ${res.status}`)
  } catch (err) {
    console.warn('[global-setup] 种子数据初始化失败（服务未就绪）:', err)
  }
  return { projectId: 'test-regression-project' }
}

export async function teardown() {
  if (!process.env.TEST_BASE_URL) {
    console.log('[global-setup] 跳过种子数据清理（CI 环境）')
    return
  }

  const BASE_URL = process.env.TEST_BASE_URL
  try {
    await fetch(`${BASE_URL}/api/test-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cleanup', projectId: 'test-regression-project' }),
    })
  } catch {
    // 清理失败不影响结果
  }
}
