import { createHmac, timingSafeEqual } from "crypto";

export enum Role { Admin = "admin", Analyst = "analyst", Viewer = "viewer", ApiClient = "api_client" }

const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
  [Role.Admin]: new Set(["read", "write", "delete", "admin", "export"]),
  [Role.Analyst]: new Set(["read", "write", "export"]),
  [Role.Viewer]: new Set(["read"]),
  [Role.ApiClient]: new Set(["read", "export"]),
};

export interface AuthContext { userId: string; role: Role; permissions: Set<string>; expiresAt?: number; }

export function hasPermission(ctx: AuthContext, permission: string): boolean {
  return ctx.permissions.has(permission);
}

export function requirePermission(ctx: AuthContext, permission: string): void {
  if (!hasPermission(ctx, permission)) throw new Error(`Permission denied: ${permission}`);
}

export function createAuthContext(userId: string, role: Role): AuthContext {
  return { userId, role, permissions: ROLE_PERMISSIONS[role] || new Set() };
}

export class APIKeyValidator {
  private secret: Buffer;
  constructor(secret: string) { this.secret = Buffer.from(secret); }

  generateKey(clientId: string): string {
    const sig = createHmac("sha256", this.secret).update(clientId).digest("hex").slice(0, 32);
    return `${clientId}.${sig}`;
  }

  validateKey(apiKey: string): string | null {
    const [clientId, sig] = apiKey.split(".", 2);
    if (!clientId || !sig) return null;
    const expected = createHmac("sha256", this.secret).update(clientId).digest("hex").slice(0, 32);
    try {
      if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return clientId;
    } catch { /* length mismatch */ }
    return null;
  }
}
