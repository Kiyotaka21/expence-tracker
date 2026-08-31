import {
  categorySchema,
  createCategorySchema,
  idParamSchema,
  updateCategorySchema,
} from '@expence/contracts';
import { createZodDto } from 'nestjs-zod';

export class IdParamDto extends createZodDto(idParamSchema) {}
export class CreateCategoryBodyDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryBodyDto extends createZodDto(updateCategorySchema) {}
export class CategoryResponseDto extends createZodDto(categorySchema) {}
