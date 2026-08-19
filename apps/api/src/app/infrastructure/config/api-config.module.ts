import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { apiConfig } from './api.config';

@Module({
    imports: [ConfigModule.forFeature(apiConfig)],
    exports: [ConfigModule],
})
export class ApiConfigModule {}
