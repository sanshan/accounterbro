import { documentName } from '@accounterbro/core';

export const documentEventNames = {
    uploadRequested: `${documentName}.upload-requested`,
    registered: `${documentName}.registered`,
} as const;
