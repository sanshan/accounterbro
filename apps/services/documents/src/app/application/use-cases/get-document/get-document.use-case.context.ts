import type { TenantReference } from '@accounterbro/core';
import type { Actor } from '@event-driven-platform/actor';
import type { UseCaseContext } from '@event-driven-platform/use-case';

export interface GetDocumentUseCaseContext extends UseCaseContext {
    readonly actor: Actor;
    readonly tenant: TenantReference;
}
