import type { TenantReference } from '@accounterbro/core';
import type { Actor } from '@event-driven-platform/actor';

export interface HttpPresenterRequest {
    readonly actor: Actor;
    readonly tenant: TenantReference;
}
