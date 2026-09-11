import { ObjectStorage } from '@accounterbro/object-storage';
import { LocalFolderStorage } from '@accounterbro/object-storage/local-folder';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { DocumentProcessingConfigModule } from '../config/document-processing-config.module';
import { documentProcessingConfig } from '../config/document-processing.config';

export function createDocumentProcessingObjectStorage(
    config: ConfigType<typeof documentProcessingConfig>,
): ObjectStorage {
    switch (config.storage.driver) {
        case 'local-folder':
            return new LocalFolderStorage({
                rootDirectory: config.storage.localFolder.rootDirectory,
            });
    }
}

@Module({
    imports: [DocumentProcessingConfigModule],
    providers: [
        {
            provide: ObjectStorage,
            inject: [documentProcessingConfig.KEY],
            useFactory: createDocumentProcessingObjectStorage,
        },
    ],
    exports: [ObjectStorage],
})
export class DocumentProcessingObjectStorageModule {}
