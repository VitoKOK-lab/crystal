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
      // Name the rejected account and offer a retry: "no permission" with
      // no other detail is a dead end — the usual cause is simply being
      // signed into a different Google account in this browser.
      const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
      return new Response(
        `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>沒有後台權限</title>
<style>body{font-family:"Noto Sans TC",Arial,sans-serif;background:#f4f2ee;color:#222;display:grid;place-content:center;min-height:100vh;gap:14px;text-align:center;padding:24px;line-height:1.8}
b{color:#b04a4a}code{background:#e8e4da;padding:2px 7px;border-radius:4px;font-size:14px}
.dim{color:#999;font-size:12px}
a{display:inline-block;margin-top:8px;padding:12px 24px;background:#141414;color:#fff;text-decoration:none;border-radius:6px}</style>
</head><body>
<p><b>這個 Google 帳號沒有後台權限</b></p>
<p>你剛才登入的是 <code>${esc(info.email)}</code></p>
<p class="dim">目前設定了 ${allowed.length} 個管理員帳號</p>
<p>請改用有權限的帳號登入。</p>
<a href="/api/auth/google/start">換一個 Google 帳號登入</a>
</body></html>`,
        { status: 403, headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
    return new Response(null, {
      status: 302,
      headers: { location: "/admin/", "set-cookie": await makeSessionCookie(env, info.email) },
    });
  }

  return null;
}
