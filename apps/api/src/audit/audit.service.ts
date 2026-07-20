import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  userEmail: string;
  action: string;
  method: string;
  path: string;
  entityId?: string | null;
  status: number;
  ip?: string | null;
  meta?: Prisma.InputJsonValue;
}

const SENSITIVE_KEY = /password|token|secret|hash/i;
const MAX_STRING = 500;

// Strips credentials and caps string sizes so the trail never stores secrets
// or bloats on a big payload.
export function sanitizeMeta(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || depth > 4) return undefined;
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeMeta(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        result[key] = '[redacted]';
      } else {
        const cleaned = sanitizeMeta(entry, depth + 1);
        if (cleaned !== undefined) result[key] = cleaned;
      }
    }
    return result;
  }
  return undefined;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuditService.name);
  }

  // Fire-and-forget: an audit hiccup must never fail the request itself.
  record(entry: AuditEntry): void {
    void this.prisma.auditLog
      .create({
        data: {
          userId: entry.userId ?? null,
          userEmail: entry.userEmail,
          action: entry.action,
          method: entry.method,
          path: entry.path,
          entityId: entry.entityId ?? null,
          status: entry.status,
          ip: entry.ip ?? null,
          meta: entry.meta,
        },
      })
      .catch((error: unknown) => {
        this.logger.error({ err: error }, 'Failed to write audit log entry');
      });
  }

  findAll(filters: { search?: string; method?: string; page?: number }) {
    const page = Math.max(0, filters.page ?? 0);
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.method ? { method: filters.method } : {}),
        ...(filters.search
          ? {
              OR: [
                { path: { contains: filters.search, mode: 'insensitive' } },
                {
                  userEmail: { contains: filters.search, mode: 'insensitive' },
                },
                { action: { contains: filters.search, mode: 'insensitive' } },
                { entityId: filters.search },
              ],
            }
          : {}),
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: page * 50,
      take: 50,
    });
  }
}
