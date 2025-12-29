export async function queryWithTimeout<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 15000,
  queryName: string = 'query'
): Promise<{ data: T | null; error: any }> {
  const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
    setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
  )

  try {
    const result = await Promise.race([
      queryFn(),
      timeoutPromise
    ])

    return result
  } catch (error: any) {
    console.error(`[QueryTimeout] ${queryName} timed out or failed:`, error.message)
    return {
      data: null,
      error: {
        message: error.message || 'Query timeout',
        code: 'TIMEOUT',
        details: error
      }
    }
  }
}

export function createTimeoutWrapper(defaultTimeout: number = 10000) {
  return <T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    queryName?: string,
    customTimeout?: number
  ) => queryWithTimeout(queryFn, customTimeout || defaultTimeout, queryName)
}
