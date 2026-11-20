import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../database/postgres/repositories/user.repository.js';
import type { UserIdentity, UserProfile } from './interfaces/user.interface.js';
import { parseReferralCode } from './referral.js';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async upsert(profile: UserProfile, startParam?: string): Promise<void> {
    await this.userRepository.upsert(profile, parseReferralCode(startParam));
  }

  find(id: string): Promise<UserIdentity | null> {
    return this.userRepository.findIdentity(id);
  }
}
