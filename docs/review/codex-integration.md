# Codex Pull-Request Review Integration Evidence

This document records provider-specific setup and empirically observed GitHub behavior for Tasks #237 and #238. The provider-neutral contract and active policy rules remain owned by [`docs/review/README.md`](README.md) and [`docs/review/rules/`](rules/).

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

The root `AGENTS.md` contains concise routing guidance: code-changing pull requests and pull requests that change repository review policy or routing must read the canonical review contract and apply the active repository-owned rules. It does not duplicate the merge lifecycle, rule catalog, or finding contract.

The normative independent-review merge lifecycle is owned only by [`docs/review/README.md`](README.md#merge-workflow). This provider evidence records how the configured Codex integration behaves; it does not redefine that lifecycle.

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
| Review of PR #243 at `d44ac621...` | Review `5142546697` correctly found two P1 evidence defects: clean boundaries had been described as explicit subtypes not exposed by the provider, and the rewritten committed PRR-004 boundary had not itself been rerun. Both were corrected. |
| Current PRR-004 boundary probe #270 | Exact current boundary case at head `439dd229...` produced clean `+1` `494475119`; CI #362 / run `34236390003` was green; probe closed without merge. |
| Later PR #243 reviews | Codex found and drove fixes for incomplete nested review-routing coverage and misplaced normative fixture guidance. Each new finding was fixed on a new head and re-reviewed. |
| Final Task #237 head `97475aa07d...` | Connector clean comment `5586779348` reported no major issues for reviewed short SHA `97475aa07d`; deterministic CI #366 was green. PR #243 then merged into `epic-ai-pr-review` as `4b7d071f...`. |
| Task #238 PR #272 automatic-open output at head `114bb7b9...` | Connector comment `5587421913` emitted a task-style summary with a “View task” link and claimed it had committed `a5f1272`, but GitHub PR head remained `114bb7b9...`, the PR still contained two commits, and no clean review object or `+1` was produced. This connector-authored prose is not review-state evidence. |

## Stable provider-observable facts

The following behaviors are established by PR #243, PR #272, and the controlled calibration probes:

- the reviewer actor is `chatgpt-codex-connector[bot]`;
- a finding run creates a pull-request review with state `COMMENTED` and an exact `commit_id` for the reviewed head;
- blocking findings are inline review comments with path/line evidence and participate in GitHub review threads;
- review threads expose `is_resolved` and `is_outdated`; after a new head, historical findings can become outdated while their review submissions remain visible;
- a transient `eyes` reaction may be present while review is processing and is not a completion signal;
- automatic review on a fresh pull-request-open event is proven; automatic review on push is not proven;
- the observed clean representation is a connector top-level comment containing a reviewed short SHA and/or a PR-level `+1` reaction depending on the run;
- the observed clean representation does not create a Codex review object with exact REST `commit_id`, a Codex-owned check run, or a Codex commit status;
- connector-authored top-level prose is not inherently review-state evidence: PR #272 produced task-style prose with an execution claim that was not reflected in the actual GitHub branch/head state;
- a clean result does not expose whether the reviewer internally decided `no-violation` or `not-applicable`;
- a later same-head clean-looking response does not erase an existing unresolved, non-outdated current-head blocking finding;
- repeated review inside an already-annotated PR cannot be assumed to be an independent evaluator trial; fresh isolated PR contexts are used for repeated known-violation calibration;
- failed setup/quota comments, task-style connector output, transient reactions, stale review submissions, same-context duplicate suppression, or absence of a review cannot be treated as a clean gate signal.

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
- after the committed PRR-004 boundary case was rewritten to the production-shaped variable rename, the older boundary evidence was retired and the exact current case was rerun as PR #270;
- PRR-007 probes #347-#348 are excluded because their Vite-proxy-only fixture did not establish an actual runtime service relationship and therefore did not isolate the rule's high-level topology boundary.

As required by the provider-neutral calibration contract, accepted calibration evidence must isolate the semantic rule boundary; unrelated deterministic lint/typecheck/test/dependency failures invalidate that evidence until the fixture is corrected. Task #237 applied that rule rather than weakening deterministic checks.

All disposable calibration PRs were closed without merge. No intentional calibration violation exists in the Task #237 production branch.

## Workflow enforcement consequence

The normative merge lifecycle is defined only by [`docs/review/README.md`](README.md#merge-workflow). The provider evidence above establishes the implementation constraints that affect enforcement:

- finding state has structured exact-head and thread-state metadata;
- clean state lacks a Codex-owned structured exact-head review/check/status artifact;
- automatic review on push has not been demonstrated;
- connector-authored prose and reaction/timestamp ordering are not stable enough to serve as machine state.

Because of those observed constraints, Task #238 does not add an independent-review CI parser/gate. Doing so with the current surface would require unsupported parsing or inference rather than a proven machine contract. The repository process remains governed by the canonical merge workflow even though this part of it cannot yet be safely hard-enforced by CI.

A future machine gate is appropriate only after the provider exposes a documented or empirically proven structured clean artifact tied to the exact head. Credits, API-key review calls, permanent LLM-in-CI fallback, and manual attestation presented as independently derived reviewer state remain outside the observed integration design.

## PRR-007 calibration evidence

`PRR-007` was calibrated on 2026-09-12 using the same blocking-safety procedure as the initial catalog. The accepted known-violation fixture establishes a real Web → API runtime interaction rather than relying on development proxy configuration alone. Both known-violation trials used fresh pull requests with equivalent case semantics, and the committed boundary case was exercised separately. All three accepted probes completed deterministic CI successfully and were closed without merge.

| Rule / case | Trial | Reviewed head | Observable provider result |
| --- | --- | --- | --- |
| `PRR-007` / `new-service-relationship-with-stale-system-overview` | PR #350 | `a986c1c5d789ec33843c6f9d5ce3d36087470a7b` | blocking `violation` — review `5186580343`, inline `3996372942`; CI run `34697352648` green |
| `PRR-007` / `new-service-relationship-with-stale-system-overview` | PR #351 | `a986c1c5d789ec33843c6f9d5ce3d36087470a7b` | blocking `violation` — review `5186581097`, inline `3996373882`; CI run `34697359773` green |
| `PRR-007` / `internal-refactor-with-stable-topology` | PR #352 | `bd5608c4e76fb818a58bce99ef427a83332d7979` | declared expected `not-applicable`; clean `+1` `502469586`; CI run `34697536637` green |

The boundary row records only the observable clean result. Codex did not expose whether it internally classified the case as `not-applicable` or `no-violation`, so this evidence does not claim an unobserved clean subtype.
