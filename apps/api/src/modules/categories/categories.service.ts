import { Injectable, NotFoundException } from '@nestjs/common';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@expence/contracts';

import { PrismaService } from '../../prisma/prisma.service';
import { toCategory } from './category.mapper';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    return rows.map(toCategory);
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const row = await this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        color: dto.color ?? null,
        icon: dto.icon ?? null,
      },
    });

    return toCategory(row);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.ensureOwned(userId, id);

    // undefined-поля Prisma игнорирует, null — записывает: partial-схема
    // из contracts даёт ровно такое поведение.
    const row = await this.prisma.category.update({
      where: { id },
      data: { name: dto.name, color: dto.color, icon: dto.icon },
    });

    return toCategory(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwned(userId, id);
    await this.prisma.category.delete({ where: { id } });
  }

  /** Категории всегда фильтруются по владельцу: чужой id должен давать 404. */
  private async ensureOwned(userId: string, id: string): Promise<void> {
    const found = await this.prisma.category.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException('Категория не найдена');
    }
  }
}
