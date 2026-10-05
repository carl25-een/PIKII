// Sends queued customer SMS from public.sms_outbox through Beem Africa.
// Run it every minute (Supabase cron) or call it after a run is sent.
// Secrets: BEEM_API_KEY, BEEM_SECRET_KEY, BEEM_SENDER_ID (an approved sender name, e.g. PIKII).
// Without the Beem secrets it runs in dry-run mode: messages are logged and left queued.
import { createClient } from "npm:@supabase/supabase-js@2";

const BEEM_URL = "https://apisms.beem.africa/v1/send";
const MAX_ATTEMPTS = 5;

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("BEEM_API_KEY");
  const secret = Deno.env.get("BEEM_SECRET_KEY");
  const sender = Deno.env.get("BEEM_SENDER_ID") ?? "PIKII";

  const { data: queued, error } = await db
    .from("sms_outbox")
    .select("id, phone, body, attempts")
    .eq("status", "queued")
    .order("created_at")
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (!apiKey || !secret) {
    for (const m of queued ?? []) console.log(`[dry run] to ${m.phone}: ${m.body}`);
    return Response.json({ dryRun: true, queued: queued?.length ?? 0 });
  }

  let sent = 0;
  let failed = 0;
  for (const m of queued ?? []) {
    try {
      const res = await fetch(BEEM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${apiKey}:${secret}`),
        },
        body: JSON.stringify({
          source_addr: sender,
          encoding: 0,
          message: m.body,
          recipients: [{ recipient_id: m.id, dest_addr: m.phone }],
        }),
      });
      if (!res.ok) throw new Error(`Beem ${res.status}: ${await res.text()}`);
      await db.from("sms_outbox").update({ status: "sent", sent_at: new Date().toISOString(), attempts: m.attempts + 1 }).eq("id", m.id);
      sent++;
    } catch (e) {
      const attempts = m.attempts + 1;
      await db
        .from("sms_outbox")
        .update({ attempts, last_error: String(e), status: attempts >= MAX_ATTEMPTS ? "failed" : "queued" })
        .eq("id", m.id);
      failed++;
    }
  }
  return Response.json({ sent, failed });
});
