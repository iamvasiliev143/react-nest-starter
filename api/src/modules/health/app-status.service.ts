import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppStatusRepository } from '../../database/postgres/repositories/app-status.repository.js';
import type { AppStatus } from './dto/app-status.response.dto.js';

const CACHE_MS = 1000;

@Injectable()
export class AppStatusService {
  private cached?: { result: Promise<AppStatus>; expiresAt: number };

  constructor(private readonly repository: AppStatusRepository) {}

  read(): Promise<AppStatus> {
    if (this.cached && performance.now() < this.cached.expiresAt) {
      return this.cached.result;
    }

    const entry = {
      expiresAt: Infinity,
      result: this.load().finally(() => {
        entry.expiresAt = performance.now() + CACHE_MS;
      }),
    };
    this.cached = entry;
    return entry.result;
  }

  private async load(): Promise<AppStatus> {
    try {
      const row = await this.repository.read();
      if (!row) throw new ServiceUnavailableException();
      return row;
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
