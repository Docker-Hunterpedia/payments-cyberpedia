import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [PaymentsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
