import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = request.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Authentication required." }, 401);

  const body = await request.json().catch(() => ({})) as { operation?: string; journeyType?: string };
  const db = createClient(url, serviceKey);
  const { data, error } = await db.from("crypto_provider_capabilities").select("*").order("journey_type");
  if (error) return json({ error: "Capability registry is unavailable." }, 503);

  if ((body.operation ?? "capabilities") === "capabilities") {
    return json({ capabilities: data ?? [], checkedAt: new Date().toISOString() });
  }

  if (body.operation === "request_quote") {
    const capability = (data ?? []).find((item) =>
      item.journey_type === body.journeyType && item.configured && item.status === "AVAILABLE"
      && item.custody_model === "NON_CUSTODIAL"
    );
    if (!capability) {
      return json({
        error: "No verified regulated provider is configured for this journey.",
        code: "PROVIDER_CAPABILITY_UNAVAILABLE",
        provenance: "UNAVAILABLE",
      }, 409);
    }
    return json({ error: "Provider adapter is not deployed for this capability.", code: "PROVIDER_ADAPTER_UNAVAILABLE", provenance: "UNAVAILABLE" }, 501);
  }

  return json({ error: "Unsupported operation." }, 400);
});
