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
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Category } from '@expence/contracts';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { CategoriesService } from './categories.service';
import {
  CategoryResponseDto,
  CreateCategoryBodyDto,
  IdParamDto,
  UpdateCategoryBodyDto,
} from './dto';

@ApiTags('categories')
@ApiCookieAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Категории текущего пользователя' })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<Category[]> {
    return this.categories.list(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать категорию' })
  @ApiOkResponse({ type: CategoryResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCategoryBodyDto,
  ): Promise<Category> {
    return this.categories.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить категорию' })
  @ApiOkResponse({ type: CategoryResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() body: UpdateCategoryBodyDto,
  ): Promise<Category> {
    return this.categories.update(user.id, params.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить категорию' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto): Promise<void> {
    return this.categories.remove(user.id, params.id);
  }
}
