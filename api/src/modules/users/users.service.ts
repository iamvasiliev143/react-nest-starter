import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../database/postgres/repositories/user.repository.js';
import type { UserIdentity, UserProfile } from './interfaces/user.interface.js';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async upsert(profile: UserProfile): Promise<void> {
    await this.userRepository.upsert(profile);
  }

  find(id: string): Promise<UserIdentity | null> {
    return this.userRepository.findId(id);
  }
}
