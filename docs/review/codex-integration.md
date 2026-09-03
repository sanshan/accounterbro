# Codex Pull-Request Review Integration Evidence

This document records provider-specific setup and observed GitHub behavior for Task #237. The provider-neutral contract and active policy rules remain owned by [`docs/review/README.md`](README.md) and [`docs/review/rules/`](rules/).

## Status

Subscription-backed Codex pull-request review is **temporarily blocked by the account's Codex code-review usage limit as of 2026-09-03 UTC**. Reconnecting the GitHub connector from the active ChatGPT/Codex account repaired the previous account-association failure: a subsequent `@codex review` request was recognized by the connector and rejected specifically because the code-review usage limit had been reached.

No actual review has yet been submitted, so calibration and review-state semantics remain unproven. No repository LLM API secret, paid GitHub Action, credits fallback, provider-output parser, or review-state gate was introduced.

## Repository bootstrap

The root `AGENTS.md` contains only a routing instruction: for a code-changing pull request, read the canonical review contract and apply the active repository-owned rules. It does not duplicate the rule catalog or the finding contract in provider-local wording.

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

PR #243's deterministic CI run `33727547470` completed successfully for head `62d9b887997de487d56de3448121d9282d66ea88`; its only required job, `Test and build`, and every step in that job succeeded. CI success did not create or imply an independent-review result.

## Provider troubleshooting evidence

The earlier manual error matched open public `openai/codex` bug reports #11881 and #30168. Those reports contained mixed community workarounds, including reconnecting the GitHub connector from ChatGPT rather than only reinstalling the GitHub App.

For this repository/account, reconnecting the connector changed the observed failure mode from “create a Codex account and connect to github” to an explicit code-review usage-limit response. That is concrete evidence that the account association is now recognized by the review trigger. It is not evidence that a review can complete successfully until quota is available and an actual review artifact is observed.

Because Task #237 explicitly excludes credits fallback, the repository does not enable credits to bypass the temporary quota. The next review experiment must wait until subscription-backed code-review capacity is available.

## Stable provider-observable facts

The following facts are now established:

- failed manual triggers are represented as top-level pull-request issue comments from `chatgpt-codex-connector[bot]`;
- after connector re-authentication, the manual trigger recognizes the connected account and reports a code-review usage-limit failure rather than an account-association failure;
- the failure response exposes a comment ID and timestamps;
- it is not a pull-request review and has no review state;
- it is not an inline review comment;
- the response body does not expose the reviewed head SHA or another commit association;
- no clean/finding review artifact has been observed, so no reliable current-head, stale-review, or clean-review signal can yet be inferred.

## Calibration outcome

No `PRR-001` through `PRR-006` case has received a reviewer classification because the review mechanism has not yet completed a review. Therefore:

- there is no observed `violation`, `no-violation`, or `not-applicable` result to record for any initial rule;
- repeated known-violation evaluation is still pending;
- the temporary duplicated guidance used to expose an initial finding was removed from the final diff;
- the blocking rules remain mechanically valid but are not eligible for a CI review-state signal until real-provider calibration succeeds.

## Required continuation before Task #238

Before any review-state automation is added:

1. wait for subscription-backed Codex code-review capacity to become available; do not enable credits as a fallback for this baseline task;
2. confirm a manual review can actually complete after capacity is restored;
3. create a fresh PR-open event to re-test the automatic-open trigger after the repaired account association;
4. repeat every boundary calibration once and every known-violation calibration twice with unchanged semantics/context;
5. observe a policy finding on a real pull-request head;
6. fix that violation, create a new head, and obtain a clean re-review;
7. record the actual review/comment fields and current-head behavior, replacing blocker-only evidence where new facts are proven.

Task #238 must not infer a gate from setup-error comments, quota-error comments, or the absence of a review.
