import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createTeacherSchema,
  Role,
  updateTeacherSchema,
  type CreateTeacherInput,
  type UpdateTeacherInput,
} from '@cyberpedia/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TeachersService } from './teachers.service';

@Controller('teachers')
@Roles(Role.ADMIN)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createTeacherSchema)) body: CreateTeacherInput,
  ) {
    return this.teachersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTeacherSchema)) body: UpdateTeacherInput,
  ) {
    return this.teachersService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.teachersService.remove(id);
  }
}
