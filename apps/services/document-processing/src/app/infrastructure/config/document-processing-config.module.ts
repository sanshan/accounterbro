import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { documentProcessingConfig } from './document-processing.config';

@Module({
    imports: [ConfigModule.forFeature(documentProcessingConfig)],
    exports: [ConfigModule],
})
export class DocumentProcessingConfigModule {}
