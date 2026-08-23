import { documentName } from '@accounterbro/core';

export const documentOperationNames = {
    prepareRegistration: `${documentName}.prepare-registration`,
    finishRegistration: `${documentName}.finish-registration`,
} as const;
