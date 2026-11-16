/**
 * JWTs with jose (HS256, secret AUTH_SECRET). Edge-safe: imported by
 * middleware.ts, so no Node-only modules (and no winston logger) here.
 */
import { jwtVerify, SignJWT } from "jose";
import type { TokenClaims, TokenIssuer } from "@/core/ports/security";

export type JwtPayload = TokenClaims & { [key: string]: string };

export async function signJWT(
  payload: JwtPayload,
  secret: string | undefined = process.env.AUTH_SECRET,
  expTime: string = ""
) {
  const secretKey = new TextEncoder().encode(secret);

  if (!payload || Object(payload).length <= 0) {
    throw new Error("Err. JWT payload");
  }

  // 20 minutes for users, a year for admins.
  const expirationTime = payload.role.includes("ADMIN") ? "1 year" : expTime || "20 minutes";

  return await new SignJWT(payload)
    .setExpirationTime(expirationTime)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secretKey);
}

export async function verifyJWT(token: string, secret = process.env.AUTH_SECRET) {
  const secretKey = new TextEncoder().encode(secret);

  try {
    return await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
  } catch (error) {
    // Edge runtime: plain console instead of the winston logger.
    console.error("verifyJWT failed:", error);
    return null;
  }
}

/** The core's TokenIssuer port: signs the claims with the policy above. */
export class JoseTokenIssuer implements TokenIssuer {
  issue(claims: TokenClaims): Promise<string> {
    return signJWT({ id: claims.id, email: claims.email, role: claims.role });
  }
}
