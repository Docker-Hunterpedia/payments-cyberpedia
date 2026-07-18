import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { DiscountsModule } from './discounts/discounts.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { FinanceModule } from './finance/finance.module';
import { StudentsModule } from './students/students.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { PaymentsModule } from './payments/payments.module';
import { TeachersModule } from './teachers/teachers.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv, type Env } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const isDev =
          configService.get('NODE_ENV', { infer: true }) === 'development';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info',
            transport: isDev
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
            genReqId: (req) =>
              (req.headers['x-request-id'] as string | undefined) ??
              randomUUID(),
            redact: {
              paths: ['req.headers.authorization'],
              censor: '[redacted]',
            },
          },
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CurrenciesModule,
    PaymentMethodsModule,
    DiscountsModule,
    TeachersModule,
    CoursesModule,
    StudentsModule,
    EnrollmentsModule,
    PaymentsModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
