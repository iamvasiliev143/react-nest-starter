import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { I18nService } from '@nestjs/i18n';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Greeting } from './dto/greeting.response.dto.js';

@Public()
@ApiTags('Status')
@Controller('greeting')
export class GreetingController {
  constructor(private readonly i18n: I18nService) {}

  @Get()
  // operationId закреплён, чтобы не менять опубликованный контракт.
  @ApiOperation({
    operationId: 'StatusController_greeting',
    summary: undefined,
  })
  @ApiOkResponse({ type: Greeting })
  greeting(): Greeting {
    return { message: this.i18n.t('app.greeting') };
  }
}
