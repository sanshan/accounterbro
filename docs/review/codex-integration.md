# Codex Pull-Request Review Integration Evidence

This document records provider-specific setup and observed GitHub behavior for Task #237. The provider-neutral contract and active policy rules remain owned by [`docs/review/README.md`](README.md) and [`docs/review/rules/`](rules/).

## Status

Subscription-backed Codex pull-request review is **blocked as of 2026-09-03 UTC**. The configured GitHub App, Codex Cloud environment, and Code Review preferences did not produce a review. Manual requests were accepted as GitHub comments but the Codex connector answered that the account must be created and connected to GitHub.

No repository LLM API secret, paid GitHub Action, credits fallback, provider-output parser, or review-state gate was introduced.

## Repository bootstrap

The root `AGENTS.md` contains only a routing instruction: for a code-changing pull request, read the canonical review contract and apply the active repository-owned rules. It does not duplicate the rule catalog or the finding contract in provider-local wording.

## Setup exercised

The following subscription-backed setup was completed before the authoritative PR-open experiment:

- the ChatGPT Codex Connector GitHub App was installed for `sanshan/accounterbro`;
- a Codex Cloud environment named `sanshan/accounterbro` was created for that repository;
- the environment used the `universal` image, automatic setup, enabled setup caching, no environment variables, no secrets, and no agent internet access;
- personal Code Review had automatic review enabled with the `on pull-request open` trigger;
- full code review and credits usage remained disabled;
- the repository inherited those personal Code Review settings.

The intended interaction follows the official Codex GitHub integration rather than the API-key-based Codex GitHub Action: https://developers.openai.com/codex/third-party/github.

## Observed lifecycle

| Probe | Trigger and timing | Pull-request head | Observed GitHub result |
| --- | --- | --- | --- |
| Pre-setup control | PR #241 opened at `2026-09-02T19:44:32Z`, before the connector/environment setup was complete. | `8e3484d9a66b0dc998c403d9c72544abffc21364` | No automatic review. Manual requests received the connector setup-error comment. This probe is not evidence about the final automatic setting because setup was incomplete. |
| Configured automatic review | PR #242 opened at `2026-09-03T06:49:02Z`, after the GitHub App and Codex Cloud environment were configured. | `8e3484d9a66b0dc998c403d9c72544abffc21364` | Through `2026-09-03T06:52:10Z`, GitHub exposed no top-level Codex comment, submitted review, or inline review comment. |
| Configured manual review | Comment `5521772030` posted `@codex review` on PR #242 at `2026-09-03T06:52:13Z`. | `8e3484d9a66b0dc998c403d9c72544abffc21364` | At `2026-09-03T06:52:22Z`, `chatgpt-codex-connector[bot]` posted top-level issue comment `5521773622`: “To use Codex here, create a Codex account and connect to github.” No review was submitted. |

PR #242's deterministic CI run `33725009314` completed successfully. CI success did not create or imply an independent-review result.

## Stable provider-observable facts

Only these facts were established:

- the failed manual trigger is represented as a top-level pull-request issue comment;
- its actor login is `chatgpt-codex-connector[bot]`;
- the response exposes a comment ID and timestamps;
- it is not a pull-request review and has no review state;
- it is not an inline review comment;
- the response body does not expose the reviewed head SHA or another commit association;
- no clean/finding review artifact was observed, so no reliable current-head, stale-review, or clean-review signal can be inferred.

The absence window for the automatic probe is evidence of this experiment only. It is not a general promise about provider latency.

## Calibration outcome

No `PRR-001` through `PRR-006` case received a reviewer classification because the review mechanism did not start. Therefore:

- there is no observed `violation`, `no-violation`, or `not-applicable` result to record for any initial rule;
- repeated known-violation evaluation was not possible;
- the temporary duplicated guidance used to expose an initial finding was removed from the final diff;
- the blocking rules remain mechanically valid but are not eligible for a CI review-state signal until real-provider calibration succeeds.

## Required continuation before Task #238

Before any review-state automation is added:

1. repair or complete the subscription-backed Codex/GitHub account association without repository API secrets, paid Actions, or credits fallback;
2. repeat every boundary calibration once and every known-violation calibration twice with unchanged semantics/context;
3. observe a policy finding on a real pull-request head;
4. fix that violation, create a new head, and obtain a clean re-review;
5. record the actual review/comment fields and current-head behavior, replacing this blocker-only evidence where new facts are proven.

Task #238 must not infer a gate from the connector setup-error comment or from the absence of a review.
