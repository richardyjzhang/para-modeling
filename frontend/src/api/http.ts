const API_PREFIX = "/api";

/** 统一走 /api 前缀；非 2xx 抛错（优先用后端 error 字段）。 */
async function requestJson<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `请求失败：${response.status} ${response.statusText}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // 非 JSON 错误体，沿用状态码信息
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function getJson<T>(path: string): Promise<T> {
  return requestJson<T>("GET", path);
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>("POST", path, body);
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>("PUT", path, body);
}

export function deleteJson(path: string): Promise<void> {
  return requestJson<void>("DELETE", path);
}
