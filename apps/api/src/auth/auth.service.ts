import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { LoginInput } from '@cyberpedia/shared';
import type { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AccessTokenPayload,
  AuthUser,
  RefreshTokenPayload,
} from './auth.types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const TTL_UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function ttlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 7 * 86_400_000;
  return Number(match[1]) * TTL_UNITS[match[2]];
}

// Each login creates its own Session row, and refresh tokens rotate within
// that session — so a login on a second device never signs the first one out.
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  // Verified against when the email is unknown, so login timing can't
  // reveal whether an account exists.
  private readonly dummyHash: Promise<string> = argon2.hash(randomUUID());

  private refreshTtlMs(): number {
    return ttlToMs(this.configService.get('JWT_REFRESH_TTL', { infer: true }));
  }

  async login(input: LoginInput, ip?: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    const passwordHash = user?.passwordHash ?? (await this.dummyHash);
    const passwordMatches = await argon2.verify(passwordHash, input.password);
    if (!user || !user.isActive || !passwordMatches) {
      this.audit.record({
        userEmail: input.email,
        action: 'auth.login_failed',
        method: 'POST',
        path: '/auth/login',
        status: 401,
        ip,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.audit.record({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.login',
      method: 'POST',
      path: '/auth/login',
      status: 200,
      ip,
    });

    // opportunistic cleanup of this user's expired sessions
    await this.prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: '',
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
      },
    });
    return this.issueTokens(user, session.id);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (!payload.sid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
    });
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (session.expiresAt < new Date()) {
      await this.dropSession(session.id);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      await this.dropSession(session.id);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const tokenMatches = await argon2.verify(
      session.refreshTokenHash,
      refreshToken,
    );
    if (!tokenMatches) {
      // an old rotated (possibly stolen) token was replayed — kill the session
      await this.dropSession(session.id);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.issueTokens(user, session.id);
  }

  async logout(
    sessionId: string | undefined,
    user?: { id: string; email: string },
    ip?: string,
  ): Promise<void> {
    if (!sessionId) return;
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
    if (user) {
      this.audit.record({
        userId: user.id,
        userEmail: user.email,
        action: 'auth.logout',
        method: 'POST',
        path: '/auth/logout',
        status: 204,
        ip,
      });
    }
  }

  private async dropSession(sessionId: string): Promise<void> {
    await this.prisma.session
      .delete({ where: { id: sessionId } })
      .catch(() => undefined);
  }

  private async issueTokens(
    user: User,
    sessionId: string,
  ): Promise<AuthTokens> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };
    // jti makes every refresh token unique even within the same second,
    // so a rotated-out token can never be byte-identical to the new one
    // and replay detection always has something to catch.
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      jti: randomUUID(),
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_TTL', { infer: true }),
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_REFRESH_TTL', { infer: true }),
    });

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: await argon2.hash(refreshToken),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
