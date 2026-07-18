import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      body =
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : { ...(exceptionResponse as Record<string, unknown>) };
    }

    if (status >= 500) {
      this.logger.error(
        { err: exception, path: request.url },
        'Unhandled exception',
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      ...body,
    });
  }
}
