import type { Role } from '@cyberpedia/shared';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  // device session id — absent only on tokens issued before sessions existed
  sid?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sid?: string;
  // random unique id so no two refresh tokens are ever identical
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  sessionId?: string;
}
