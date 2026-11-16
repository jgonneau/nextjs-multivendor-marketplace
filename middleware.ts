import { NextResponse, NextRequest } from "next/server";
import { verifyJWT } from "@/adapters/security/jwt";
import { getBearerToken, getRequestRole } from "@/adapters/http/request";
import authorizationService, { PUBLIC_PATHS } from "@/adapters/http/accessRules";

export async function middleware(request: NextRequest) {
  try {
    // check if auth route
    if (!PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
      // else,
      // check if bearer token
      const bearerToken: string | null =
        request.headers?.get("authorization") || "";
      if (!bearerToken) {
        // no token
        return NextResponse.json(
          { error: "Unauthorized. (bearer token needed)" },
          { status: 401 }
        );
      }
      // bearer token found: verify it
      if (!(await verifyJWT(getBearerToken(request)))) {
        return NextResponse.json(
          { error: "Token invalid or expired." },
          { status: 401 }
        );
      }
      // authorization: centralized in AuthorizationService
      const userRole = await getRequestRole(request);
      if (
        !authorizationService.canAccess(
          userRole,
          request.nextUrl.pathname,
          request.method
        )
      ) {
        return NextResponse.json(
          { error: "Access Forbidden." },
          { status: 403 }
        );
      }
    }
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    return NextResponse.json(
      { error: `${code || error}` },
      { status: 500 }
    );
  }
}

// limit to `/api/`
export const config = {
  matcher: "/api/:function*",
};
