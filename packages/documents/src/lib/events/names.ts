import { documentName } from '@accounterbro/core';

export const documentEventNames = {
    uploadRequested: `${documentName}.registration-prepared`,
    registered: `${documentName}.registration-finished`,
} as const;
