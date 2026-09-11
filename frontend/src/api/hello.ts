import { getJson } from "./http";

export interface HelloResponse {
  message: string;
  version: string;
  serverTime: string;
}

export function fetchHello(): Promise<HelloResponse> {
  return getJson<HelloResponse>("/hello");
}
