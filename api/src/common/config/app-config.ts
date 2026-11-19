import { ConfigService } from '@nestjs/config';
import type { Environment } from './environment.js';

/**
 * Типизированный доступ к проверенной конфигурации.
 * В runtime это сам класс ConfigService, поэтому DI-токен не меняется.
 * Файл не регистрирует ConfigModule, поэтому импорт не читает окружение.
 */
export type AppConfig = ConfigService<Environment, true>;
export const AppConfig = ConfigService as abstract new (
  ...args: never[]
) => AppConfig;
