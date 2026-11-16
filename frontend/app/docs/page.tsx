"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// swagger-ui-react touches `window` at module scope, so it can't be
// server-rendered — load it client-only.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  // Swagger UI only has a light theme; keep it readable when the OS is in dark mode.
  return (
    <div className="min-h-screen bg-white text-black">
      <SwaggerUI url="/openapi.json" />
    </div>
  );
}
