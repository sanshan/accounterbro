# Codex review triggering

This document maps the provider-neutral sequencing in [`README.md`](README.md#merge-workflow) to the current Codex GitHub integration. It does not define review policy or replace the provider evidence in [`codex-integration.md`](codex-integration.md).

## Required operating mode

Codex review is intentionally triggered only after deterministic repository CI is green for the exact current pull-request head.

For a new pull request:

1. create the pull request without manually requesting Codex review;
2. wait for all required deterministic CI for the current head to complete successfully;
3. only when CI is green, request review with `@codex review`;
4. wait for a clean independent-review result for that exact head before merge.

After any relevant new commit:

1. treat the previous independent-review conclusion as invalid for the new head;
2. do not immediately request another Codex review;
3. wait for required deterministic CI to become green for the new head;
4. then request a fresh `@codex review` and wait for the current-head result.

If CI is pending or failing, Codex review MUST NOT be manually requested.

## Pull-request-open automatic review

`codex-integration.md` records that the integration was previously exercised with both personal and repository Code Review configured to start review on pull-request open. That remains historical provider evidence, not the desired operating mode.

To avoid spending a review before deterministic checks have passed, disable Codex settings that automatically start code review when a pull request is opened for this repository. If both repository-level and personal review-on-open settings can apply, disable each applicable automatic trigger and retain manual `@codex review` as the post-CI trigger.

This is a provider-side configuration change. AccounterBro MUST NOT add a GitHub Action, LLM API call, credits fallback, provider-output parser, or other repository automation merely to delay Codex until CI is green.

If provider-side automatic review-on-open remains enabled or cannot be disabled, a review started before deterministic CI becomes green does not satisfy the required post-CI review. Once CI is green for that same head, explicitly request a fresh `@codex review`.
