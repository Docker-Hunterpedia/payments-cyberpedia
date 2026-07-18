import { Injectable } from '@nestjs/common';
import { Role } from '@cyberpedia/shared';

@Injectable()
export class AppService {
  getHello(): string {
    return `Cyberpedia Payments API — roles: ${Object.values(Role).join(' / ')}`;
  }
}
