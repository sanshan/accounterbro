# Codex Pull-Request Review Integration Evidence

This document records provider-specific setup and observed GitHub behavior for Task #237. The provider-neutral contract and active policy rules remain owned by [`docs/review/README.md`](README.md) and [`docs/review/rules/`](rules/).

## Status

Subscription-backed Codex pull-request review is **operational again as of 2026-09-08 UTC** after the account's code-review usage capacity reset. A manual `@codex review` request on PR #243 completed successfully through the ChatGPT/Codex GitHub integration and produced a GitHub pull-request review plus an inline review comment.

Credits usage remains disabled. No repository LLM API secret, paid GitHub Action, credits fallback, provider-output parser, or review-state gate has been introduced.

A clean review result has not yet been observed. The committed `PRR-001` through `PRR-006` calibration cases also remain pending; real policy findings observed on intermediate PR heads are recorded below but are not substituted for the committed calibration cases.

## Repository bootstrap

The root `AGENTS.md` contains only routing guidance: code-changing pull requests and changes to repository review policy or its routing must read the canonical review contract and apply the active repository-owned rules. It does not duplicate the rule catalog or finding contract in provider-local wording.

## Setup exercised

The following subscription-backed setup was complete before the final PR-open probe:

- the ChatGPT Codex Connector GitHub App was installed for `sanshan/accounterbro` only;
- the app had read access to checks, commit statuses and metadata, and read/write access to actions, code, issues, pull requests and workflows;
- a Codex Cloud environment named `sanshan/accounterbro` was created for that repository;
- the environment used the `universal` image, automatic setup, enabled setup caching, no environment variables, no secrets, and no agent internet access;
- personal Code Review had automatic review enabled with the `on pull-request open` trigger;
- repository Code Review was set to review the owner's pull requests and to trigger on pull-request open;
- full code review and credits usage remained disabled.

The intended interaction follows the official Codex GitHub integration rather than the API-key-based Codex GitHub Action: https://learn.chatgpt.com/docs/third-party/github.

## Observed lifecycle

| Probe | Trigger and timing | Pull-request head | Observed GitHub result |
| --- | --- | --- | --- |
| Pre-setup control | PR #241 opened at `2026-09-02T19:44:32Z`, before the connector/environment setup was complete. | `8e3484d9a66b0dc998c403d9c72544abffc21364` | No automatic review. Manual requests received the connector setup-error comment. This probe is not evidence about the final automatic setting because setup was incomplete. |
| Intermediate setup | PR #242 opened at `2026-09-03T06:49:02Z`, after the GitHub App and Codex Cloud environment existed but before the repository-specific Code Review settings were finalized. | `8e3484d9a66b0dc998c403d9c72544abffc21364`, later `a454e42f6b2aa8657334a4461e3b2503b3eb4f58` | No automatic review was observed. Manual `@codex review` requests received the connector account-association error. This PR is not the authoritative automatic-review probe because its open event preceded the final settings. |
| Manual review after final settings | Comment `5521997968` posted `@codex review` on PR #242 at `2026-09-03T07:12:24Z`, after the final Code Review settings were in place. | `a454e42f6b2aa8657334a4461e3b2503b3eb4f58` | At `2026-09-03T07:12:31Z`, `chatgpt-codex-connector[bot]` posted the account-association error. No review was submitted. |
| Final configured automatic-review probe | PR #243 opened at `2026-09-03T07:14:17Z`, after the final repository-specific settings were in place. | `a454e42f6b2aa8657334a4461e3b2503b3eb4f58` | Through `2026-09-03T07:19:22Z`, GitHub exposed no top-level Codex comment, submitted review, or inline review comment. This approximately five-minute absence window is evidence for this probe only, not a general provider-latency guarantee. |
| Connector re-authentication | The GitHub connector was disconnected and re-authorized from the active ChatGPT/Codex account on `2026-09-03`, while retaining the existing GitHub App installation and repository environment. | n/a | ChatGPT showed GitHub connected to `sanshan` after authorization. This repaired the prior account-association error path. |
| Manual review after connector re-authentication | Comment `5523535547` posted `@codex review` on PR #243 at `2026-09-03T09:22:49Z`. | `62d9b887997de487d56de3448121d9282d66ea88` | At `2026-09-03T09:22:57Z`, `chatgpt-codex-connector[bot]` posted top-level issue comment `5523537347` stating that the Codex usage limit for code reviews had been reached. The earlier account-connection error did not recur. No review was submitted. |
| First completed review after quota reset | Comment `5582837758` posted `@codex review` on PR #243 at `2026-09-08T09:37:48Z`. | `c51d8877dabef5bf4abfacdfc943818e06495990` | Review `5140049712` was submitted by `chatgpt-codex-connector[bot]` at `2026-09-08T09:42:17Z` with state `COMMENTED` and REST `commit_id` equal to the exact head. Inline comment `3956514295` found that review-policy-only PRs were not routed to the contract. |
| Finding fix and re-review | The routing finding was fixed in a new head and comment `5583571583` requested another review at `2026-09-08T10:17:15Z`. | `0e65209db63c4fe4cb61ad55ba135eb2d3cc0fb9` | Review `5140467809` was submitted at `2026-09-08T10:21:53Z`, state `COMMENTED`, with exact matching `commit_id`. The prior inline thread became `is_outdated=true`. This intermediate head accidentally replaced unrelated root `AGENTS.md` content and Codex reported inline comment `3956843100` as a blocking `PRR-002` duplicate-guidance violation. That change was not a committed calibration case and was removed immediately. |
| Minimal-diff restoration and re-review | The branch restored the exact prior `AGENTS.md` and retained only the routing fix; comment `5583652281` requested review at `2026-09-08T10:23:18Z`. | `d42f04d4ca1e8252c7861716cd342f3bf7b2bc0b` | Review `5140512718` was submitted at `2026-09-08T10:26:23Z`, state `COMMENTED`, with exact matching `commit_id`. Both earlier finding threads were now outdated. Inline comment `3956884172` correctly identified that this evidence document still claimed no successful review had occurred; this document update addresses that finding. |

PR #243 deterministic CI run `34215167102` completed successfully for head `d42f04d4ca1e8252c7861716cd342f3bf7b2bc0b`. Its single required `Test and build` job completed all steps successfully, including review-catalog validation, lint, typecheck, tests, builds, E2E, and artifact startup checks. CI success is independent of Codex review state.

## Provider troubleshooting evidence

The earlier manual error matched open public `openai/codex` bug reports #11881 and #30168. Those reports contained mixed community workarounds, including reconnecting the GitHub connector from ChatGPT rather than only reinstalling the GitHub App.

For this repository/account, reconnecting the connector changed the observed failure mode from “create a Codex account and connect to github” to an explicit code-review usage-limit response. After subscription-backed capacity reset, the same manual trigger completed reviews without enabling credits, confirming that the repaired account association can execute code review.

Because Task #237 explicitly excludes credits fallback, credits remain disabled throughout these probes.

## Stable provider-observable facts

The following facts are now established from PR #243:

- failed manual triggers are top-level pull-request issue comments from `chatgpt-codex-connector[bot]`; they are not pull-request reviews and expose no reviewed commit association;
- a successful finding run creates a pull-request review from `chatgpt-codex-connector[bot]` with state `COMMENTED`;
- the GitHub REST review object exposes an exact `commit_id`, and the standard review body also includes the reviewed commit as a short SHA;
- findings are emitted as inline pull-request review comments inside review threads, with path/line evidence available through GitHub;
- while a manual review is processing, the connector has twice exposed a transient `eyes` reaction on the pull request; that reaction disappeared when the review completed, so it is not a completion signal;
- after a new head is pushed, prior Codex review submissions remain in history with their original `commit_id`, while their inline finding threads become `is_outdated=true` when the referenced diff is no longer current;
- therefore a historical Codex review cannot be treated as review of the current head merely because it exists on the pull request; exact head association must be checked;
- no automatic review-on-push behavior has been established because the observed new-head reviews were manually requested;
- no clean-result artifact has yet been observed, so the exact GitHub representation and current-head association of a clean result remain unproven.

## Calibration outcome

No committed `docs/review/calibration/PRR-001.json` through `PRR-006.json` case has yet received an explicit reviewer classification. The completed reviews above prove that the subscription-backed reviewer can consume repository guidance and emit evidence-based policy findings, but they do not replace controlled-case calibration.

One real blocking `PRR-002` finding was observed on the accidental intermediate head `0e65209db63c4fe4cb61ad55ba135eb2d3cc0fb9`. It is intentionally **not** counted as the committed `copied-service-configuration-rules` known-violation case because the reviewed diff and context were different from that committed calibration input.

Therefore:

- every committed boundary case still requires one matching `no-violation` or `not-applicable` classification;
- every committed known-violation case still requires two `violation` classifications with unchanged rule semantics and case context;
- no deliberate calibration violation exists in the current production diff;
- the blocking rules remain mechanically valid but are not eligible for Task #238 review-state enforcement until controlled calibration succeeds.

## Required continuation before Task #238

Before any review-state automation is added:

1. obtain a review of the current head after this evidence correction and observe the first clean-result representation if no blocking finding remains;
2. use the subscription-backed `@codex review` mechanism with explicit calibration guidance to classify the committed `PRR-001` through `PRR-006` case files against their matching active rules, without copying policy into provider settings;
3. run every committed boundary case at least once and every known-violation case at least twice with unchanged rule semantics and case context; clarify or downgrade any rule whose repeated classification contradicts its declared boundary;
4. create a fresh pull-request-open event after the repaired account association and restored subscription capacity to test the configured automatic `on pull-request open` trigger;
5. record the calibration outcomes, clean-result artifact, automatic-open result, and any additional current-head semantics that are actually observed;
6. after the final evidence update, obtain a clean independent review of that final task head before merge.

Task #238 must not infer a gate from setup-error comments, quota-error comments, transient `eyes` reactions, stale review submissions, or the absence of a review.
