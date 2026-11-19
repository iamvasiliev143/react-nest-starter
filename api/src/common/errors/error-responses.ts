import { BadRequestErrorResponseDto } from './dto/bad-request.response.dto.js';
import { UnauthorizedErrorResponseDto } from './dto/unauthorized.response.dto.js';
import { ForbiddenErrorResponseDto } from './dto/forbidden.response.dto.js';
import { NotFoundErrorResponseDto } from './dto/not-found.response.dto.js';
import { TooManyRequestsErrorResponseDto } from './dto/too-many-requests.response.dto.js';
import { InternalServerErrorResponseDto } from './dto/internal-server-error.response.dto.js';
import { ServiceUnavailableErrorResponseDto } from './dto/service-unavailable.response.dto.js';
import type { ApiErrorResponseDto } from './dto/api-error.response.dto.js';
export const HTTP_ERROR_DTOS: Record<number, new () => ApiErrorResponseDto> = {
  400: BadRequestErrorResponseDto,
  401: UnauthorizedErrorResponseDto,
  403: ForbiddenErrorResponseDto,
  404: NotFoundErrorResponseDto,
  429: TooManyRequestsErrorResponseDto,
  500: InternalServerErrorResponseDto,
  503: ServiceUnavailableErrorResponseDto,
};
