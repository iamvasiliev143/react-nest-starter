import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../database/postgres/repositories/users.repository.js';
import type { UserIdentity, UserProfile } from './interfaces/user.interface.js';

/** Пользователи Telegram Mini App. */
@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async upsert(profile: UserProfile): Promise<void> {
    await this.users.upsert(profile);
  }

  find(id: string): Promise<UserIdentity | null> {
    return this.users.findId(id);
  }
}
