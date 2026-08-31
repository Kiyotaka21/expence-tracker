import type { AuthUser } from '@expence/contracts';

interface UserLike {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

/** Публичное представление: без passwordHash, даты — ISO-строки как в контракте. */
export const toAuthUser = (user: UserLike): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt.toISOString(),
});
