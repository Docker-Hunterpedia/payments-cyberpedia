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
}

export interface RefreshTokenPayload {
  sub: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
