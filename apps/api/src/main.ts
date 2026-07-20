import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  // Traefik is the only ingress; without this every client shares the proxy's
  // IP and the per-IP rate limits become one global bucket.
  app.set('trust proxy', 1);
  // the SPA lives on a different origin, so responses must stay readable
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.enableShutdownHooks();

  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  const corsOrigin = configService.get('CORS_ORIGIN', { infer: true });
  app.enableCors({ origin: corsOrigin ? corsOrigin.split(',') : true });

  await app.listen(configService.get('PORT', { infer: true }));
}
void bootstrap();
