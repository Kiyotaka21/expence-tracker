import { Module } from '@nestjs/common';

import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  // Репозиторий наружу не отдаём: AuthModule работает только через UsersService.
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
