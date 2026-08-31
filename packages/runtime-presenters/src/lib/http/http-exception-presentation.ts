import { SetMetadata } from '@nestjs/common';

export const PRESERVE_HTTP_EXCEPTION_PRESENTATION = Symbol(
    'accounterbro.http.preserve-exception-presentation',
);

export function PreserveHttpExceptionPresentation() {
    return SetMetadata(PRESERVE_HTTP_EXCEPTION_PRESENTATION, true);
}
