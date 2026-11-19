import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

export class ZodValidationPipe<
  Schema extends z.ZodType,
> implements PipeTransform<unknown, z.output<Schema>> {
  constructor(
    private readonly schema: Schema,
    private readonly createError?: () => Error,
  ) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw (
        this.createError?.() ??
        new BadRequestException({
          fieldErrors: result.error.issues.map((issue) => ({
            path: issue.path.map(String).join('.'),
            message: 'Invalid value',
          })),
        })
      );
    }
    return result.data;
  }
}
