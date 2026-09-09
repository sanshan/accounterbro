import { documentProcessingName } from '@accounterbro/core';

export const documentProcessingOperationNames = {
    prepareProcessing: `${documentProcessingName}.prepare-processing`,
    finishProcessing: `${documentProcessingName}.finish-processing`,
} as const;
