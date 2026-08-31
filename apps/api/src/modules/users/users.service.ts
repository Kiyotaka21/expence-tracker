import { Injectable } from '@nestjs/common';

import type { User } from '../../generated/prisma/client';
import { UsersRepository, type CreateUserData } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  create(data: CreateUserData): Promise<User> {
    return this.users.create(data);
  }

  /** Отметка последней выдачи пары токенов: register, login или refresh. */
  touchLastLogin(id: string): Promise<void> {
    return this.users.touchLastLogin(id);
  }
}
