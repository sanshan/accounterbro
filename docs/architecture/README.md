# Architecture model

This directory owns the LikeC4 model for AccounterBro's interactive System Overview.

The model complements engineering documentation. It is limited to stable high-level topology: deployable applications and services, external systems, service-owned data or storage boundaries, and major service-to-service or event relationships. Internal controllers, use cases, handlers, workspace packages, and runtime implementation details stay outside this view unless they become system-level boundaries.

## Maintenance contract

A pull request that changes AccounterBro's high-level system topology MUST update the LikeC4 model in the same change so the System Overview stays consistent with the implemented system.

Changes that do not alter System Overview topology do not require a model update. Examples include editorial documentation changes, internal refactors, use-case/controller/handler changes, and package or runtime dependency changes that remain inside an existing system boundary.

The model is maintained explicitly. It is not generated from Markdown, Nx project graphs, or source imports. Generated HTML is never edited manually.

## Publication

GitHub Actions rebuilds the complete current model when relevant documentation changes. Pull requests validate the build. The accepted main revision is published to GitHub Pages.
