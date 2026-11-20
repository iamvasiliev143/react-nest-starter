import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MaintenanceException } from '../../common/errors/maintenance.exception.js';
import { AppStatusService } from './app-status.service.js';

export const AllowDuringMaintenance = Reflector.createDecorator<boolean>();

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly status: AppStatusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      context.getType() !== 'http' ||
      this.reflector.getAllAndOverride(AllowDuringMaintenance, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    if ((await this.status.read()).mode === 'maintenance') {
      throw new MaintenanceException();
    }
    return true;
  }
}
