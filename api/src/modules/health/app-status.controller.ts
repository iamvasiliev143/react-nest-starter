import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppStatusService } from './app-status.service.js';
import { AppStatus } from './dto/app-status.response.dto.js';
import { AllowDuringMaintenance } from './maintenance.guard.js';

@Public()
@SkipThrottle()
@AllowDuringMaintenance(true)
@ApiTags('Status')
@Controller({ path: 'health/app', version: VERSION_NEUTRAL })
export class AppStatusController {
  constructor(private readonly status: AppStatusService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AppStatus })
  read(): Promise<AppStatus> {
    return this.status.read();
  }
}
