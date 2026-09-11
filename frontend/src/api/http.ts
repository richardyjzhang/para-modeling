const API_PREFIX = "/api";

/** 统一走 /api 前缀，解析 JSON；非 2xx 抛错，由调用方展示。 */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`);
  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}
