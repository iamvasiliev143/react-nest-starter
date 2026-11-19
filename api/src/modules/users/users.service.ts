import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../database/postgres/repositories/users.repository.js';
import type { UserIdentity, UserProfile } from './interfaces/user.interface.js';

/** Пользователи. Без DATABASE_URL работает без БД. */
@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async upsert(profile: UserProfile): Promise<void> {
    await this.users.upsert(profile);
  }

  async find(id: string): Promise<UserIdentity | null> {
    if (!this.users.isConfigured) return { id };
    return this.users.findId(id);
  }
}
