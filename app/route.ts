/**
 * The API's home page: interactive docs (Scalar) for /openapi.json.
 * A route handler rather than a page, so the API needs no React layout.
 */

// One exact version, served by two CDNs; if the first fails (it does
// happen), the page loads the second. Subresource Integrity makes the
// browser refuse the script unless it's byte-for-byte the file below,
// whichever CDN served it. To upgrade, change the version and the hash:
// curl -sL --fail <url> | openssl dgst -sha384 -binary | openssl base64 -A
const SCALAR_VERSION = "1.76.4";
const SCALAR_PATH = `@scalar/api-reference@${SCALAR_VERSION}/dist/browser/standalone.js`;
const SCALAR_SOURCES = [`https://cdn.jsdelivr.net/npm/${SCALAR_PATH}`, `https://unpkg.com/${SCALAR_PATH}`];
const SCALAR_SRI = "sha384-hwB9WroDTpZaI38gr+u9CXA6ksz5gUYgD2GxXazKl/agT1L2GWUiRFWGJYNiFu4Q";

const SCALAR_CONFIG = {
  url: "/openapi.json",
  metaData: { title: "Next.js Multivendor Marketplace API docs" },
  // Pre-select the user-token scheme in "Try it", and keep a pasted token
  // across reloads (in this browser only).
  authentication: { preferredSecurityScheme: "bearer" },
  persistAuth: true,
  // No Scalar product upsells (Deploy API, Generate SDK, Ask AI), no telemetry.
  showDeveloperTools: "never",
  agent: { disabled: true },
  telemetry: false,
};

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Next.js Multivendor Marketplace API docs</title>
    <meta name="description" content="Interactive reference for the Next.js Multivendor Marketplace REST API." />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#6a46f5" />
    <style>
      body { margin: 0; }
      .fallback { font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <noscript>
      <p class="fallback">The interactive docs need JavaScript. The API description is at <a href="/openapi.json">/openapi.json</a>.</p>
    </noscript>
    <script>
      (function load(sources) {
        var script = document.createElement("script");
        script.src = sources[0];
        script.integrity = ${JSON.stringify(SCALAR_SRI)};
        script.crossOrigin = "anonymous";
        script.onload = function () {
          Scalar.createApiReference("#app", ${JSON.stringify(SCALAR_CONFIG)});
        };
        script.onerror = function () {
          if (sources.length > 1) return load(sources.slice(1));
          document.getElementById("app").innerHTML =
            '<p class="fallback">The interactive docs could not be loaded. The API description is at <a href="/openapi.json">/openapi.json</a>.</p>';
        };
        document.head.appendChild(script);
      })(${JSON.stringify(SCALAR_SOURCES)});
    </script>
  </body>
</html>`;

export const dynamic = "force-static";

export function GET() {
  return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
}
