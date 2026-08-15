// Google OAuth login for /admin (authorization-code flow, openid email
// scope only). The whitelist lives in the ADMIN_EMAILS var; anyone else
// gets a polite refusal even with a valid Google account.
import { Env, json, makeSessionCookie, sessionEmail } from "./lib";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo";

const redirectUri = (url: URL) => `${url.origin}/api/auth/google/callback`;

export async function handleAuth(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/admin/me") {
    const email = await sessionEmail(env, request);
    if (!email) return json({ authed: false, oauthReady: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) }, { status: 401 });
    return json({ authed: true, email });
  }

  if (url.pathname === "/api/auth/logout") {
    return new Response(null, {
      status: 302,
      headers: { location: "/admin/", "set-cookie": "oma_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" },
    });
  }

  if (url.pathname === "/api/auth/google/start") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return json({ error: "oauth_not_configured", hint: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set" }, { status: 503 });
    }
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri(url),
      response_type: "code",
      scope: "openid email",
      state,
      prompt: "select_account",
    });
    return new Response(null, {
      status: 302,
      headers: {
        location: `${GOOGLE_AUTH}?${params}`,
        "set-cookie": `oma_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      },
    });
  }

  if (url.pathname === "/api/auth/google/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieState = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)oma_oauth_state=([^;]+)/)?.[1];
    if (!code || !state || state !== cookieState) return json({ error: "bad_oauth_state" }, { status: 400 });
    const tokenRes = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(url),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return json({ error: "token_exchange_failed" }, { status: 502 });
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return json({ error: "no_id_token" }, { status: 502 });
    // Server-side validation of the ID token (audience + signature checked
    // by Google's tokeninfo endpoint).
    const infoRes = await fetch(`${GOOGLE_TOKENINFO}?id_token=${encodeURIComponent(id_token)}`);
    if (!infoRes.ok) return json({ error: "token_invalid" }, { status: 401 });
    const info = (await infoRes.json()) as { aud?: string; email?: string; email_verified?: string };
    if (info.aud !== env.GOOGLE_CLIENT_ID || !info.email || info.email_verified !== "true") {
      return json({ error: "token_rejected" }, { status: 401 });
    }
    const allowed = (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(info.email.toLowerCase())) {
      return new Response("此 Google 帳號沒有後台權限。", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    return new Response(null, {
      status: 302,
      headers: { location: "/admin/", "set-cookie": await makeSessionCookie(env, info.email) },
    });
  }

  return null;
}
