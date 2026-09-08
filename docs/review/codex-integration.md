# Codex Pull-Request Review Integration Evidence

This document records provider-specific setup and empirically observed GitHub behavior for Task #237. The provider-neutral contract and active policy rules remain owned by [`docs/review/README.md`](README.md) and [`docs/review/rules/`](rules/).

## Status

Subscription-backed Codex pull-request review is operational as of 2026-09-08 UTC. Manual review and automatic review on fresh pull-request-open events both work through the official ChatGPT/Codex GitHub integration.

Credits usage remains disabled. No repository LLM API secret, API-key review action, paid GitHub Action, credits fallback, provider-output parser, review-state gate, or permanent LLM invocation in CI has been introduced.

All six initial blocking rules, `PRR-001` through `PRR-006`, satisfy the calibrated **blocking-safety** boundary defined by the repository contract:

- every known violation produced two matching blocking policy findings in independent fresh review contexts;
- every committed boundary case was reviewed as a controlled case and produced a clean outcome with no blocking finding;
- accepted calibration probes completed deterministic CI successfully;
- all disposable calibration pull requests were closed without merge.

Codex does not expose whether a clean boundary was internally classified as `no-violation` or `not-applicable`. The repository therefore records the boundary case's declared provider-neutral expected decision and the provider's actually observable clean result separately; it does not claim an unobserved clean subtype.

## Repository bootstrap

The root `AGENTS.md` contains only routing guidance: code-changing pull requests and pull requests that change repository review policy or routing must read the canonical review contract and apply the active repository-owned rules. It does not duplicate the rule catalog or finding contract in provider-local wording.

## Setup exercised

The successful probes used this subscription-backed setup:

- the ChatGPT Codex Connector GitHub App was installed for `sanshan/accounterbro`;
- a Codex Cloud environment named `sanshan/accounterbro` was configured for the repository;
- the environment used the `universal` image, automatic setup, setup caching, no environment variables, no secrets, and no agent internet access;
- personal Code Review and repository Code Review were configured to review on pull-request open;
- credits usage and full-code-review billing remained disabled.

The repository uses the official Codex GitHub integration rather than an API-key-based Codex GitHub Action.

## Provider lifecycle evidence

| Probe | Observed GitHub result |
| --- | --- |
| PR #241 before setup completion | No authoritative automatic review; manual requests hit setup errors. |
| PR #242 after app/environment setup but before working account association | Manual `@codex review` returned the connector account-association error. |
| PR #243 after connector re-authentication | Account-association error disappeared; provider instead reported subscription code-review usage capacity exhausted. No credits fallback was enabled. |
| First successful finding review on PR #243, head `c51d8877...` | Review `5140049712`, state `COMMENTED`, exact REST `commit_id`, inline finding `3956514295`. |
| Finding fix and later heads | New review submissions were associated with the new exact head; older inline threads became `is_outdated=true` while historical review submissions remained visible. |
| First clean result on PR #243, head `8a9ee521...` | Top-level connector comment `5583797867` reported no major issues and embedded reviewed short SHA; PR-level `+1` was also emitted. No Codex review object, check run, or commit status represented the clean result. |
| PR #244 fresh open | Automatic review `5140648979` produced blocking `PRR-001` finding `3957010219` without a manual trigger, proving automatic review on fresh PR open. |
| Same-head re-trigger on PR #244 | A later clean-looking top-level result did not remove the original unresolved, non-outdated current-head blocking thread. “Latest Codex text wins” is therefore invalid. |
| Prompt-only hypothetical calibration on PR #243 | Codex performed an ordinary review rather than returning requested hypothetical case classifications. Prompt-only classification is not calibration evidence. |
| Final-head review of PR #243 at `d44ac621...` | Review `5142546697` correctly found two P1 evidence defects: clean boundaries had been described as explicit subtypes not exposed by the provider, and the rewritten committed PRR-004 boundary had not itself been rerun. Both findings were addressed: the calibration contract now distinguishes provider-neutral expected decisions from observable clean evidence, and current PRR-004 boundary probe #270 was executed successfully. |

## Stable provider-observable facts

The following behaviors are established by PR #243 and the controlled calibration probes:

- the reviewer actor is `chatgpt-codex-connector[bot]`;
- a finding run creates a pull-request review with state `COMMENTED` and an exact `commit_id` for the reviewed head;
- blocking findings are inline review comments with path/line evidence and participate in GitHub review threads;
- review threads expose `is_resolved` and `is_outdated`; after a new head, historical findings can become outdated while their review submissions remain in history;
- a transient `eyes` reaction may be present while review is processing and is not a completion signal;
- automatic review on a fresh pull-request-open event is proven; automatic review on push is not proven;
- the observed clean representation is a connector top-level comment containing a reviewed short SHA and/or a PR-level `+1` reaction depending on the run;
- the observed clean representation does not create a Codex review object with exact REST `commit_id`, a Codex-owned check run, or a Codex commit status;
- a clean result does not expose whether the reviewer internally decided `no-violation` or `not-applicable`;
- a later same-head clean-looking response does not erase an existing unresolved, non-outdated current-head blocking finding;
- repeated review inside an already-annotated PR cannot be assumed to be an independent evaluator trial; fresh isolated PR contexts are used for repeated known-violation calibration;
- failed setup/quota comments, transient reactions, stale review submissions, same-context duplicate suppression, or absence of a review cannot be treated as a clean gate signal.

## Calibration outcome

Known-violation repeats use independent fresh pull-request contexts with equivalent rule semantics, repository context, declared task context, and calibration diff semantics. Boundary rows keep the repository-declared expected decision while recording only the provider result that was actually observable.

| Rule / case | Trial | Reviewed head | Observable provider result |
| --- | --- | --- | --- |
| `PRR-001` / `unrelated-backend-cache` | PR #244 | `cb155d65cbdf97289706b9f5f2d2d380c9ea6e9e` | blocking `violation` — review `5140648979`, inline `3957010219` |
| `PRR-001` / `unrelated-backend-cache` | PR #252 | `89c7fd31c928783a05634b253898de74139b54e8` | blocking `violation` — review `5141125051`, inline `3957422052` |
| `PRR-001` / `required-local-configuration-docs` | PR #246 | `c35440a2aa4880ce237091f1a192a8b47b4f0cc5` | declared expected `no-violation`; clean `+1` `494154536`; CI #341 green |
| `PRR-002` / `copied-service-configuration-rules` | PR #247 | `25dfdfc106681422650b24e59bb96fe2b0d028f9` | blocking `violation` — review `5140864420`, inline `3957196988` |
| `PRR-002` / `copied-service-configuration-rules` | PR #248 | `25dfdfc106681422650b24e59bb96fe2b0d028f9` | blocking `violation` — review `5140882782`, inline `3957212860` |
| `PRR-002` / `concise-routing-reference` | PR #249 | `6d6666a98650daa252beef5470b0ed908b8223da` | declared expected `no-violation`; clean `+1` `494165525` |
| `PRR-003` / `service-test-repeats-runner-retry` | PR #250 | `07037a745f48bf80fc1f78da362ac441bcc04c77` | blocking `violation` — review `5140943219`, inline `3957264944` |
| `PRR-003` / `service-test-repeats-runner-retry` | PR #251 | `07037a745f48bf80fc1f78da362ac441bcc04c77` | blocking `violation` — review `5140986826`, inline `3957303157` |
| `PRR-003` / `controller-proves-owned-context-mapping` | PR #253 | `795b27efae516c8beedd6dec00a63162de0576df` | declared expected `no-violation`; clean `+1` `494230447` |
| `PRR-004` / `service-local-runner-retry-wrapper` | PR #268 | `d33e7016c8d493b9a965e1b5070d3b2b9a0bbf99` | blocking `violation` — review `5142388335`, inline `3958434701`; CI #359 green |
| `PRR-004` / `service-local-runner-retry-wrapper` | PR #269 | `b4b9db74ec02c22131e9b103a9b99d398c86b4d5` | blocking `violation` — review `5142391071`, inline `3958437050`; CI #360 green |
| `PRR-004` / current `standard-manifest-composition` | PR #270 | `439dd22965c7024fcb6767d6de201484c1937732` | declared expected `no-violation`; clean `+1` `494475119`; CI #362 / run `34236390003` green |
| `PRR-005` / `renamed-generator-command-with-stale-readme` | PR #257 | `d1ee4e993cab3435b39b106782204d8eb75bc4d5` | blocking `violation` — review `5141979481`, inline `3958133026` |
| `PRR-005` / `renamed-generator-command-with-stale-readme` | PR #258 | `d1ee4e993cab3435b39b106782204d8eb75bc4d5` | blocking `violation` — review `5141988484`, inline `3958139510` |
| `PRR-005` / `schema-type-only-refactor` | PR #259 | `1ce0b95b8f8db4c45828ea6e15d77dee66ea1220` | declared expected `not-applicable`; clean `+1` `494338686` |
| `PRR-006` / `invented-upload-size-limit` | PR #260 | `39ccb8b19d3108c29086b021aea6cf847eabc19e` | blocking `violation` — review `5141986792`, inline `3958138132` |
| `PRR-006` / `invented-upload-size-limit` | PR #261 | `39ccb8b19d3108c29086b021aea6cf847eabc19e` | blocking `violation` — review `5141997990`, inline `3958146466` |
| `PRR-006` / `required-file-without-content-restriction` | PR #262 | `8790133c22f03b90ed888ed064c88aa43ee675bd` | declared expected `no-violation`; clean `+1` `494344795` |

The accepted calibration matrix is complete for blocking safety: six blocking rules, twelve independent known-violation findings, and six clean boundary reviews. The provider-neutral case expectations remain versioned in `docs/review/calibration/`; clean subtype is not inferred when Codex does not expose it.

## Rejected calibration attempts and harness lessons

Calibration evidence deliberately excludes runs that were not independent or whose fixture introduced unrelated deterministic failures:

- the prompt-only hypothetical classification attempt is excluded because Codex ignored the requested classification format and performed an ordinary PR review;
- the same-context re-trigger on PR #244 is excluded because the existing current-head finding remained visible and could influence or suppress re-evaluation;
- the accidental `PRR-002` finding on intermediate Task head `0e65209d...` is excluded because its diff/context did not match the committed `PRR-002` calibration case;
- early `PRR-004` probes #254-#256 are excluded because synthetic fixtures created unrelated lint/typecheck failures;
- `PRR-004` probes #263-#264 correctly found the policy violation but are excluded because the fixture still violated deterministic repository conventions;
- probes #266-#267 are excluded because direct EDP type imports expanded the Documents service dependency surface and failed typecheck;
- after the committed PRR-004 boundary case was rewritten to the production-shaped variable rename, the older boundary evidence was retired and the exact current case was rerun as PR #270.

A controlled calibration fixture must be executable, respect normal repository dependency/convention boundaries except for the single deliberate semantic violation being tested, and remain orthogonal to deterministic checks. Legitimate lint/typecheck/test failures must be fixed in the fixture rather than disabled or weakened.

All disposable calibration PRs were closed without merge. No intentional calibration violation exists in the Task #237 production branch.

## Constraints carried into Task #238

Task #238 must use only provider behavior established above. In particular:

1. Finding reviews have a strong structured current-head association through review `commit_id` and inline thread state.
2. The strongest observed clean-head association is a reviewed short SHA in a connector top-level clean comment together with the provider's PR-level clean reaction; there is no Codex-owned clean review object, check run, or commit status.
3. Current review state is an aggregate over current-head findings and staleness/resolution, not the latest connector text.
4. A new relevant head requires a new independent-review conclusion; historical reviews alone are insufficient.
5. No automatic review-on-push behavior has been established, so Task #238 must not assume it.
6. Clean provider output does not expose `no-violation` versus `not-applicable`; Task #238 only needs the proven blocking/clean state and must not infer hidden subtypes.
7. A brittle natural-language parser must not be introduced merely to manufacture a machine-readable clean gate. If the observed provider surface is insufficient for reliable enforcement, the Epic/task design must be revised rather than guessed.
8. Credits, API-key review calls, and permanent LLM-in-CI fallback remain out of scope.

Before Task #237 merges, the final Task head requires green deterministic CI and a clean Codex review after this evidence correction.
