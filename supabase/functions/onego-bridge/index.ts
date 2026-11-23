// 1Go <-> Smart Auditing bridge (owner, 23 Nov 2026: "1Go will be the home base app and Smart Auditing a branch app").
// Called by the 1Go Windows app with the person's 1Go sign-in (x-onego-token). The token is checked with 1Go's own
// Supabase (the user, and public.my_access(): added by the owner, switched on, access period not over, and Smart
// Auditing switched on for that user by the owner). Then:
//   action "login":   a one-time Smart Auditing sign-in link for the same email (the Smart Auditing tile opens it)
//   action "clients": 1Go's audit clients are added to / updated in that person's Smart Auditing workspace
// Nothing else is possible here: no password, no other email, no other workspace.
import { createClient } from "npm:@supabase/supabase-js@2";

const ONEGO = { url: "https://panlovvikswjxjkxzjcw.supabase.co", key: "sb_publishable_tiyIJVZwQsrdWHdFid8wqg_yRYjSBG-" };
const SITE = "https://ameen14102002.github.io/smart-auditing/";
const BIZ = new Set(["trading", "manufacturing", "services", "profession", "finance"]);
const ENT = new Set(["private", "opc", "public", "listed", "sec8", "llp", "firm", "prop", "trust"]);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const clean = (v: unknown, n = 120) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

async function onegoUser(token: string) {
  const u = await fetch(ONEGO.url + "/auth/v1/user", { headers: { apikey: ONEGO.key, Authorization: "Bearer " + token } });
  if (!u.ok) return null;
  const user = await u.json();
  const a = await fetch(ONEGO.url + "/rest/v1/rpc/my_access", { method: "POST", headers: { apikey: ONEGO.key, Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ client: "smart-auditing" }) });
  const acc = a.ok ? await a.json() : null;
  if (!acc || !acc.ok || !user?.email) return null;
  if (!(acc.role === "owner" || acc.audit === true)) return { denied: true } as any;   // the owner, or a user the owner allowed in 1Go's Users
  return { email: String(user.email).toLowerCase(), name: clean(acc.name || "", 80), role: String(acc.role || "") };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const token = clean(req.headers.get("x-onego-token"), 4000);
  if (!token) return json({ error: "Sign in to 1Go first." }, 401);
  const who = await onegoUser(token);
  if (!who) return json({ error: "Your 1Go sign-in is not valid or your access has ended." }, 403);
  if ((who as any).denied) return json({ error: "Smart Auditing is not switched on for you in 1Go. Ask the owner." }, 403);
  let body: any = {}; try { body = await req.json(); } catch (_) { body = {}; }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // the same person in Smart Auditing (created on first use, email already confirmed by 1Go's own code sign-in)
  let uid = "";
  { const { data, error } = await admin.auth.admin.createUser({ email: who.email, email_confirm: true, user_metadata: { name: who.name, from: "1Go" } });
    if (data?.user) uid = data.user.id;
    else if (error) { const { data: l } = await admin.rpc("onego_user_id", { em: who.email }); uid = String(l || ""); }
    if (!uid) return json({ error: "Could not find your Smart Auditing account." }, 500); }

  if (body.action === "login") {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: who.email, options: { redirectTo: SITE } });
    if (error || !data?.properties?.action_link) return json({ error: "Could not sign you in to Smart Auditing: " + (error?.message || "no link") }, 500);
    return json({ link: data.properties.action_link });
  }

  if (body.action === "clients") {
    // the person's workspace: the one they own, else the first they belong to, else a new one
    const { data: mem } = await admin.from("members").select("workspace_id, role").eq("user_id", uid);
    let ws = (mem || []).find((m: any) => m.role === "owner")?.workspace_id || (mem || [])[0]?.workspace_id || "";
    if (!ws) {
      const { data: w, error } = await admin.from("workspaces").insert({ name: clean((who.name || who.email) + " · 1Go clients", 120), owner: uid }).select("id").single();
      if (error || !w) return json({ error: "Could not make a workspace: " + (error?.message || "") }, 500);
      ws = w.id; await admin.from("members").insert({ workspace_id: ws, user_id: uid, role: "owner", email: who.email });
    }
    const list = Array.isArray(body.clients) ? body.clients.slice(0, 500) : [];
    const { data: recs } = await admin.from("records").select("id, data").eq("workspace_id", ws).eq("col", "clients");
    let added = 0, updated = 0;
    for (const c of list) {
      const name = clean(c.name, 120), gstin = clean(c.gstin, 15).toUpperCase(), key = clean(c.key, 120);
      if (!name) continue;
      const old = (recs || []).find((r: any) => (gstin && String(r.data?.gstin || "").toUpperCase() === gstin) || (key && r.data?.onego === key));
      const from1go = { name, gstin, pan: clean(c.pan, 10).toUpperCase(), tan: clean(c.tan, 10).toUpperCase(), industry: clean(c.industry, 120), address: clean(c.address, 300), onego: key || name, source: "1Go" };
      const data = old ? { ...old.data, ...Object.fromEntries(Object.entries(from1go).filter(([, v]) => v)) } : { id: "", ...from1go, type: ENT.has(c.type) ? c.type : "private", rel: "none", biz: BIZ.has(c.biz) ? c.biz : "trading", reg: "none", cost: "none", system: clean(c.system, 40) || "Tally", gst: !!gstin, createdAt: new Date().toISOString() };
      const id = old ? old.id : "g1-" + crypto.randomUUID().slice(0, 12);
      data.id = id;
      const { error } = await admin.from("records").upsert({ workspace_id: ws, col: "clients", id, data, updated_by: uid });
      if (!error) { old ? updated++ : added++; if (!old) (recs || []).push({ id, data }); }
    }
    return json({ workspace: ws, added, updated });
  }
  return json({ error: "Unknown action" }, 400);
});
