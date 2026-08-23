import { documentName } from '@accounterbro/core';

export const documentEventNames = {
    registrationPrepared: `${documentName}.registration-prepared`,
    registrationFinished: `${documentName}.registration-finished`,
} as const;
