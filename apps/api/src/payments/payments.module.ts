import { Module } from '@nestjs/common';
import {
  InstallmentsController,
  PaymentsController,
} from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, InstallmentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
