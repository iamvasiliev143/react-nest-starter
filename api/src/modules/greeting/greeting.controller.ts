import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { I18nService } from '@nestjs/i18n';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Greeting } from './dto/greeting.response.dto.js';

@Public()
@ApiTags('Status')
@Controller({ path: 'greeting', version: '1' })
export class GreetingController {
  constructor(private readonly i18n: I18nService) {}

  @Get()
  @ApiOkResponse({ type: Greeting })
  greeting(): Greeting {
    return { message: this.i18n.t('greeting.message') };
  }
}
