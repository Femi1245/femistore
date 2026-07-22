import { nativeOAuthDeepLinkUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Instant OAuth handoff (no React hydration).
 * Supabase redirects here after Google/X/GitHub; we bounce into the APK via
 * Android intent / zumelia:// so the WebView can finish the session.
 */
export async function GET(request: Request) {
  const { search } = new URL(request.url);
  const deepLink = nativeOAuthDeepLinkUrl(search, "");
  const intentPath = deepLink.replace(/^zumelia:\/\//, "");
  const intentLink = `intent://${intentPath}#Intent;scheme=zumelia;package=com.zumelia.app;end`;

  const deepAttr = escapeHtmlAttr(deepLink);
  const intentAttr = escapeHtmlAttr(intentLink);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${intentAttr}" />
  <title>Returning to Zumelia</title>
  <style>
    body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:2rem;
      background:#FAF8F5;color:#1a1a1a;font-family:system-ui,sans-serif;text-align:center}
    a{margin-top:1.25rem;display:inline-block;padding:.75rem 1.25rem;border-radius:999px;
      background:#b85c38;color:#fffaf5;text-decoration:none;font-weight:600}
  </style>
  <script>
    (function () {
      var intent = ${JSON.stringify(intentLink)};
      var deep = ${JSON.stringify(deepLink)};
      function go(url) {
        try { window.location.replace(url); } catch (e) {
          try { window.location.href = url; } catch (e2) {}
        }
      }
      go(intent);
      setTimeout(function () { go(deep); }, 250);
      setTimeout(function () {
        var el = document.getElementById("msg");
        if (el) el.textContent = "Tap Open Zumelia if the app did not open.";
      }, 900);
    })();
  </script>
</head>
<body>
  <div>
    <p id="msg">Opening Zumelia…</p>
    <a id="open" href="${intentAttr}">Open Zumelia</a>
    <p style="margin-top:1rem;font-size:.9rem">
      <a href="${deepAttr}" style="background:transparent;color:#b85c38;padding:0;border-radius:0;font-weight:500">
        Use deep link
      </a>
    </p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
