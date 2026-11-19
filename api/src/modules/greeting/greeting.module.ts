import { Module } from '@nestjs/common';
import { GreetingController } from './greeting.controller.js';

@Module({ controllers: [GreetingController] })
export class GreetingModule {}
