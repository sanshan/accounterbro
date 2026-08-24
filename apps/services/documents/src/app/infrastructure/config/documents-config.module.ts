import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { documentsConfig } from './documents.config';

@Module({
    imports: [ConfigModule.forFeature(documentsConfig)],
    exports: [ConfigModule],
})
export class DocumentsConfigModule {}
