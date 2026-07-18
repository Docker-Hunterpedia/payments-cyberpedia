import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.enableShutdownHooks();

  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  const corsOrigin = configService.get('CORS_ORIGIN', { infer: true });
  app.enableCors({ origin: corsOrigin ? corsOrigin.split(',') : true });

  await app.listen(configService.get('PORT', { infer: true }));
}
void bootstrap();
