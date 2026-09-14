# Codex review triggering

This document maps the provider-neutral sequencing in [`README.md`](README.md#merge-workflow) to the current Codex GitHub integration. It does not define review policy or replace the provider evidence in [`codex-integration.md`](codex-integration.md).

## Required operating mode

Codex review is intentionally triggered only after deterministic repository CI is green for the exact current pull-request head.

For a new pull request:

1. create the pull request as a **draft** and do not manually request Codex review;
2. wait for all required deterministic CI for the current head to complete successfully;
3. only when CI is green, mark the draft pull request ready for review;
4. use the configured Codex review triggered by the ready transition; if no review starts for the current head, request it once with `@codex review`;
5. wait for a clean independent-review result for that exact head before merge.

The current integration reports review triggers for opening a pull request for review, marking a draft ready, and commenting `@codex review`. Creating the pull request as a draft therefore keeps the normal review trigger behind the deterministic-CI gate without requiring repository automation.

Connector-authored task-style or summary output that may appear while a pull request is still draft is not independent-review state and MUST NOT be treated as satisfying the required review.

After any relevant new commit:

1. treat the previous independent-review conclusion as invalid for the new head;
2. do not immediately request another Codex review;
3. wait for required deterministic CI to become green for the new head;
4. then request a fresh `@codex review` and wait for the current-head result, because automatic review-on-push is not proven.

If CI is pending or failing, Codex review MUST NOT be manually requested.

## Pull-request-open automatic review

`codex-integration.md` records that the integration was exercised with personal and repository Code Review configured to start review when a pull request is opened for review. That remains provider evidence, not permission to bypass the CI-first sequence.

The default AccounterBro operating pattern is to create task pull requests as drafts, keep them draft while deterministic CI runs, and mark them ready only after CI is green. This delays the configured ready/open review trigger until the correct point in the lifecycle.

If a workflow cannot use draft pull requests and must create a ready-for-review pull request immediately, disable any applicable Codex provider setting that automatically starts code review on pull-request open and retain manual `@codex review` as the post-CI trigger. If both repository-level and personal review-on-open settings can apply, disable each applicable automatic trigger.

Provider-side settings are not controlled by repository code. AccounterBro MUST NOT add a GitHub Action, LLM API call, credits fallback, provider-output parser, or other repository automation merely to delay Codex until CI is green.

If an actual independent review starts before deterministic CI becomes green, that review does not satisfy the required post-CI review. Once CI is green for that same head, explicitly request a fresh `@codex review`.
