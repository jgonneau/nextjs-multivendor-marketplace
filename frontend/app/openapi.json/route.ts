// The API describes itself (generated from its code, served at
// <API_URL>/openapi.json); /docs renders that same document, so there's a
// single spec and it can't drift from the API.
export const dynamic = "force-dynamic";

export async function GET() {
  const apiUrl = process.env.API_URL ?? "http://localhost:3001";
  try {
    const upstream = await fetch(new URL("/openapi.json", apiUrl), { cache: "no-store" });
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
    return Response.json(await upstream.json());
  } catch (error) {
    console.error(`API docs: fetching ${apiUrl}/openapi.json failed`, error);
    return Response.json({ error: "The API is unreachable. Please try again shortly." }, { status: 502 });
  }
}
