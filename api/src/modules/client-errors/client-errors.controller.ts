import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import {
  clientErrorSchema,
  type ClientErrorRequest,
} from './dto/client-error.request.dto.js';
@ApiTags('Client errors')
@Controller({ path: 'client-errors', version: '1' })
export class ClientErrorsController {
  private readonly logger = new Logger(ClientErrorsController.name);
  @Public()
  @Post()
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiNoContentResponse()
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['source', 'kind', 'page'],
      properties: {
        source: {
          type: 'string',
          enum: ['render', 'bootstrap', 'window', 'unhandledrejection'],
        },
        kind: {
          type: 'string',
          enum: [
            'Error',
            'TypeError',
            'RangeError',
            'ReferenceError',
            'SyntaxError',
            'UnknownError',
          ],
        },
        page: { type: 'string', enum: ['home', 'time', 'other'] },
      },
    },
  })
  report(
    @Body(new ZodValidationPipe(clientErrorSchema)) body: ClientErrorRequest,
  ) {
    this.logger.error({ event: 'client_error', ...body });
  }
}
