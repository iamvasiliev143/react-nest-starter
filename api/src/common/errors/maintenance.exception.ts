import { ServiceUnavailableException } from '@nestjs/common';

export class MaintenanceException extends ServiceUnavailableException {}
