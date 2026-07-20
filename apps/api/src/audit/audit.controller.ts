import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@cyberpedia/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('method') method?: string,
    @Query('page') page?: string,
  ) {
    const pageNumber = Math.max(0, Number.parseInt(page ?? '0', 10) || 0);
    return this.auditService.findAll({ search, method, page: pageNumber });
  }
}
