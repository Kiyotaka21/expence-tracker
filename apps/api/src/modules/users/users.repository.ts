import { Injectable } from '@nestjs/common';

import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Данные для создания пользователя. Намеренно узкий тип, а не
 * `Prisma.UserCreateInput`: `id`, даты и связи вызывающему протаскивать нечего.
 */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  name?: string | null;
}

/** Единственное место в модуле, которое знает про Prisma. */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }
}
