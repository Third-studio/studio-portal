// supabase/functions/_shared/rateLimit.ts
// Compteur d'appels simple par (fonction, utilisateur) sur une fenêtre glissante,
// stocké dans public.edge_function_calls (accessible uniquement via service_role).
// Usage : await checkRateLimit(admin, "ai-generate", userId, 30, 60) → true si sous la limite.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function checkRateLimit(
  client: SupabaseClient,
  fn: string,
  userId: string,
  maxCalls: number,
  windowMinutes: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await client
    .from("edge_function_calls")
    .select("id", { count: "exact", head: true })
    .eq("fn", fn)
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count || 0) >= maxCalls) return false;
  await client.from("edge_function_calls").insert({ fn, user_id: userId });
  return true;
}
