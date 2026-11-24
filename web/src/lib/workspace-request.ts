import { supabase } from "./supabase";

export async function workspaceRequest<T>(path: string, input?: unknown, signal?: AbortSignal): Promise<T> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) throw new Error("Sign in to continue.");
  const response = await fetch(path, {
    method: input === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, ...(input === undefined ? {} : { "Content-Type": "application/json" }) },
    body: input === undefined ? undefined : JSON.stringify(input),
    cache: "no-store",
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not complete this request.");
  return result;
}
