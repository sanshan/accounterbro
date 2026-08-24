import { ObjectStorage } from '@accounterbro/object-storage';
import { LocalFolderStorage } from '@accounterbro/object-storage/local-folder';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { DocumentsConfigModule } from '../config/documents-config.module';
import { documentsConfig } from '../config/documents.config';

export function createDocumentsObjectStorage(
    config: ConfigType<typeof documentsConfig>,
): ObjectStorage {
    switch (config.storage.driver) {
        case 'local-folder':
            return new LocalFolderStorage({
                rootDirectory: config.storage.localFolder.rootDirectory,
            });
    }
}

@Module({
    imports: [DocumentsConfigModule],
    providers: [
        {
            provide: ObjectStorage,
            inject: [documentsConfig.KEY],
            useFactory: createDocumentsObjectStorage,
        },
    ],
    exports: [ObjectStorage],
})
export class DocumentsObjectStorageModule {}
