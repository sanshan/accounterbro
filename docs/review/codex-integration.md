# Codex Pull-Request Review Integration Evidence

This document records provider-specific setup and observed GitHub behavior for Task #237. The provider-neutral contract and active policy rules remain owned by [`docs/review/README.md`](README.md) and [`docs/review/rules/`](rules/).

## Status

Subscription-backed Codex pull-request review is **operational as of 2026-09-08 UTC** after the account's code-review usage capacity reset. Both manual and automatic pull-request-open reviews have completed successfully through the ChatGPT/Codex GitHub integration.

Credits usage remains disabled. No repository LLM API secret, paid GitHub Action, credits fallback, provider-output parser, or review-state gate has been introduced.

A clean review result has been observed on PR #243. The committed `PRR-001` known-violation case has also produced two matching `violation` results in independent fresh review contexts. Its boundary case and all controlled `PRR-002` through `PRR-006` calibration trials remain pending, so Task #237 is not yet complete and the blocking catalog is not yet eligible for Task #238 enforcement.

## Repository bootstrap

The root `AGENTS.md` contains only routing guidance: code-changing pull requests and changes to repository review policy or its routing must read the canonical review contract and apply the active repository-owned rules. It does not duplicate the rule catalog or finding contract in provider-local wording.

## Setup exercised

The following subscription-backed setup was complete before the successful automatic-review probes:

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
| Final configured automatic-review probe before account repair | PR #243 opened at `2026-09-03T07:14:17Z`, after the final repository-specific settings were in place but before the connector account association was repaired. | `a454e42f6b2aa8657334a4461e3b2503b3eb4f58` | Through `2026-09-03T07:19:22Z`, GitHub exposed no top-level Codex comment, submitted review, or inline review comment. This approximately five-minute absence window is evidence for this probe only, not a general provider-latency guarantee. |
| Connector re-authentication | The GitHub connector was disconnected and re-authorized from the active ChatGPT/Codex account on `2026-09-03`, while retaining the existing GitHub App installation and repository environment. | n/a | ChatGPT showed GitHub connected to `sanshan` after authorization. This repaired the prior account-association error path. |
| Manual review after connector re-authentication | Comment `5523535547` posted `@codex review` on PR #243 at `2026-09-03T09:22:49Z`. | `62d9b887997de487d56de3448121d9282d66ea88` | At `2026-09-03T09:22:57Z`, `chatgpt-codex-connector[bot]` posted top-level issue comment `5523537347` stating that the Codex usage limit for code reviews had been reached. The earlier account-connection error did not recur. No review was submitted. |
| First completed review after quota reset | Comment `5582837758` posted `@codex review` on PR #243 at `2026-09-08T09:37:48Z`. | `c51d8877dabef5bf4abfacdfc943818e06495990` | Review `5140049712` was submitted by `chatgpt-codex-connector[bot]` at `2026-09-08T09:42:17Z` with state `COMMENTED` and REST `commit_id` equal to the exact head. Inline comment `3956514295` found that review-policy-only PRs were not routed to the contract. |
| Finding fix and re-review | The routing finding was fixed in a new head and comment `5583571583` requested another review at `2026-09-08T10:17:15Z`. | `0e65209db63c4fe4cb61ad55ba135eb2d3cc0fb9` | Review `5140467809` was submitted at `2026-09-08T10:21:53Z`, state `COMMENTED`, with exact matching `commit_id`. The prior inline thread became `is_outdated=true`. This intermediate head accidentally replaced unrelated root `AGENTS.md` content and Codex reported inline comment `3956843100` as a blocking `PRR-002` duplicate-guidance violation. That change was not a committed calibration case and was removed immediately. |
| Minimal-diff restoration and re-review | The branch restored the exact prior `AGENTS.md` and retained only the routing fix; comment `5583652281` requested review at `2026-09-08T10:23:18Z`. | `d42f04d4ca1e8252c7861716cd342f3bf7b2bc0b` | Review `5140512718` was submitted at `2026-09-08T10:26:23Z`, state `COMMENTED`, with exact matching `commit_id`. Both earlier finding threads were now outdated. Inline comment `3956884172` correctly identified stale provider evidence, which the next task head corrected. |
| First clean result | Comment `5583744499` requested review on PR #243 at `2026-09-08T10:30:44Z`. | `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9` | At `2026-09-08T10:35:02Z`, top-level bot comment `5583797867` said no major issues were found and included reviewed short SHA `8a9ee52188`. A PR-level `+1` reaction from the connector was also present at `2026-09-08T10:37:07Z`. No Codex pull-request review object, commit status, or check run was created for this clean result. |
| Prompt-only calibration attempt | Comment `5583807642` asked the reviewer to classify the committed hypothetical `PRR-001` cases explicitly. | `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9` | Bot comment `5583822792` returned another ordinary clean PR review result instead of the requested case classifications. Prompt-only hypothetical classification is therefore not counted as controlled calibration evidence. |
| `PRR-001` independent violation trial 1 and automatic-open proof | PR #244 opened at `2026-09-08T10:39:15Z` from base revision `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9` with the committed `unrelated-backend-cache` task context and three-line diff. No manual trigger preceded the review. | `cb155d65cbdf97289706b9f5f2d2d380c9ea6e9e` | Automatic review `5140648979` completed at `2026-09-08T10:40:57Z`. Inline comment `3957010219` explicitly reported `POLICY (PRR-001, blocking)` with the required scope/evidence reasoning. This proves the configured `on pull-request open` trigger works after account repair and capacity reset. CI run `34216587989` was fully green. |
| Same-context re-trigger on trial 1 | Comment `5583976945` posted `@codex review` on unchanged PR #244 at `2026-09-08T10:49:54Z`, after the `PRR-001` finding already existed on that PR. | unchanged `cb155d65cbdf97289706b9f5f2d2d380c9ea6e9e` | At `2026-09-08T10:51:42Z`, top-level bot comment `5583998662` said no major issues were found. The original `PRR-001` review thread remained `is_resolved=false` and `is_outdated=false` on the same head. This re-trigger is not an independent calibration trial: the provider context already contained the finding and the clean-looking result did not clear it. |
| `PRR-001` independent violation trial 2 | PR #252 opened at `2026-09-08T11:28:17Z` from the same base revision `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9` with the same declared task context and equivalent three-line calibration diff as PR #244. | `89c7fd31c928783a05634b253898de74139b54e8` | Automatic review `5141125051` completed at `2026-09-08T11:30:22Z`. Inline comment `3957422052` again identified the out-of-scope cache as the `PRR-001` known violation. CI run `34220866670` completed fully green. PRs #244 and #252 were then closed without merge. |

PR #243 deterministic CI run `34215714898` completed successfully for head `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9`. Its single required `Test and build` job completed all steps successfully, including review-catalog validation, lint, typecheck, tests, builds, E2E, and artifact startup checks. The controlled PR #244 and #252 trial heads also completed equivalent full CI successfully. CI success remains independent of Codex review state.

## Provider troubleshooting evidence

The earlier manual error matched open public `openai/codex` bug reports #11881 and #30168. Those reports contained mixed community workarounds, including reconnecting the GitHub connector from ChatGPT rather than only reinstalling the GitHub App.

For this repository/account, reconnecting the connector changed the observed failure mode from “create a Codex account and connect to github” to an explicit code-review usage-limit response. After subscription-backed capacity reset, the same integration completed reviews without enabling credits, confirming that the repaired account association can execute code review.

Because Task #237 explicitly excludes credits fallback, credits remain disabled throughout these probes.

## Stable provider-observable facts

The following facts are established by PR #243 and controlled probes #244/#252:

- failed manual triggers are top-level pull-request issue comments from `chatgpt-codex-connector[bot]`; they are not pull-request reviews and expose no reviewed commit association;
- a successful finding run creates a pull-request review from `chatgpt-codex-connector[bot]` with state `COMMENTED`;
- the GitHub REST review object for a finding run exposes an exact `commit_id`, and the standard review body also includes the reviewed commit as a short SHA;
- findings are emitted as inline pull-request review comments inside review threads, with path/line evidence and thread `is_resolved`/`is_outdated` state available through GitHub;
- while a review is processing, the connector may expose a transient `eyes` reaction; it disappears after completion and is not a completion signal;
- after a new head is pushed, prior Codex review submissions remain in history with their original `commit_id`, while inline finding threads can become `is_outdated=true` when the referenced diff is no longer current;
- a historical Codex review therefore cannot be treated as review of the current head merely because it exists on the pull request; exact head association must be checked;
- automatic review on a fresh pull-request-open event is proven: PR #244 and PR #252 both started review automatically without a manual trigger;
- no automatic review-on-push behavior has been established; observed new-head reviews on PR #243 were manually requested;
- a clean result is represented by a top-level issue comment from the connector containing a reviewed short SHA plus a PR-level `+1` reaction; unlike a finding run, the observed clean result creates no Codex review object with REST `commit_id` and no Codex commit status/check run;
- a later same-head clean-looking response does not erase an existing current-head finding: on PR #244 the original blocking thread remained unresolved and non-outdated after the later clean comment;
- therefore review state cannot be modeled as “latest Codex text wins”; current-head findings must remain part of the aggregate state until they are resolved or made stale by a new head;
- repeated `@codex review` inside an already-annotated PR cannot be assumed to be an independent evaluator trial. Fresh isolated PR #252 reproduced the `PRR-001` violation that the same-context re-trigger on PR #244 did not re-emit;
- GitHub currently exposes no Codex-owned check run or commit status that can be used directly as the independent-review gate.

The repository implementation in Task #238 must use only these proven facts. In particular, the clean result's strongest observed head association is currently the reviewed short SHA embedded in the connector's top-level comment, which is weaker than the exact structured `commit_id` exposed by finding reviews. Task #238 must not silently turn that natural-language representation into a brittle pass/fail parser; if no sufficiently reliable machine-readable clean association is established before #237 completes, the Epic must be revised rather than guessing.

## Calibration outcome

The `PRR-001` known-violation case now satisfies the contract's repeated-classification requirement using two independent fresh review contexts:

| Rule / case | Trial | Base revision | Reviewed head | Result |
| --- | --- | --- | --- | --- |
| `PRR-001` / `unrelated-backend-cache` | PR #244 automatic open review `5140648979` | `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9` | `cb155d65cbdf97289706b9f5f2d2d380c9ea6e9e` | `violation` — inline `3957010219` |
| `PRR-001` / `unrelated-backend-cache` | PR #252 automatic open review `5141125051` | `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9` | `89c7fd31c928783a05634b253898de74139b54e8` | `violation` — inline `3957422052` |

The differing PR numbers and commit SHAs are infrastructure identities only. Both independent trials used the same rule version, base revision, declared task context and calibration diff semantics. The same-context re-trigger on PR #244 is intentionally excluded because the prior finding remained visible and unresolved in that review context.

The accidental intermediate `PRR-002` finding on head `0e65209db63c4fe4cb61ad55ba135eb2d3cc0fb9` is also still excluded from controlled calibration because its diff/context did not match the committed `copied-service-configuration-rules` case.

Therefore:

- `PRR-001` known violation: **2/2 independent `violation` trials complete**;
- `PRR-001` boundary `required-local-configuration-docs`: still requires one matching `no-violation` result;
- every committed `PRR-002` through `PRR-006` boundary still requires one matching `no-violation` or `not-applicable` classification;
- every committed `PRR-002` through `PRR-006` known violation still requires two independent matching `violation` classifications;
- no deliberate calibration violation exists in the Task #237 production branch;
- the blocking catalog remains mechanically valid but is not eligible for Task #238 enforcement until all controlled calibration succeeds.

## Harness lessons applied

The calibration-method correction follows the same broad principles used by mature agent harnesses without importing their model-running infrastructure:

- independent evaluator contexts are more trustworthy than repeated judgments contaminated by prior review history;
- blocking findings require concrete, attributable evidence rather than free-form taste;
- repository-owned context remains the policy source of truth;
- current review state is an aggregate of review artifacts for the current head, not a single latest message;
- repeated semantic failures that can become deterministic checks should eventually leave AI review ownership.

These principles are compatible with the repository's no-credits/no-LLM-in-CI baseline. Multi-agent fan-out or adversarial model verification, as used by some external harnesses, is not introduced here because it would require a separate model orchestration/billing path outside Task #237's constraints.

## Required continuation before Task #238

Before any review-state automation is added:

1. run the committed `PRR-001` boundary in a fresh isolated review context and record its expected `no-violation` result;
2. run every committed `PRR-002` through `PRR-006` known violation twice in independent fresh review contexts and every boundary once, preserving equivalent rule/base/task/diff semantics across repeated trials;
3. clarify/recalibrate or downgrade any rule only if **independent** trials contradict its declared decision boundary;
4. continue investigating whether Codex exposes a sufficiently reliable machine-readable clean/current-head association for Task #238; do not substitute a natural-language heuristic merely to finish the Epic;
5. record all final calibration results and any additional provider state semantics actually observed;
6. after the final evidence update, obtain green deterministic CI and a clean independent review of the final Task #237 head before merge.

Task #238 must not infer a gate from setup-error comments, quota-error comments, transient reactions, stale review submissions, same-context duplicate suppression, or the absence of a review.
