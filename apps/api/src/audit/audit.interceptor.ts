import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AuditService, sanitizeMeta } from './audit.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Records every successful mutating request automatically, so new endpoints
// are audited without remembering to add anything. Auth routes are skipped
// here — AuthService logs login/logout itself (with failures).
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!MUTATING.has(request.method)) return next.handle();
    const path = (request.originalUrl ?? request.url).split('?')[0];
    if (path.startsWith('/auth')) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const params = request.params as Record<string, string> | undefined;
        this.audit.record({
          userId: request.user?.id,
          userEmail: request.user?.email ?? 'anonymous',
          action: `${request.method} ${path}`,
          method: request.method,
          path,
          entityId: params?.id ?? null,
          status: response.statusCode,
          ip: request.ip,
          meta: sanitizeMeta(request.body) as Prisma.InputJsonValue,
        });
      }),
    );
  }
}
