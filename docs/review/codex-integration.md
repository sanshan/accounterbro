# Codex Pull-Request Review Integration Evidence

This document records provider-specific setup and empirically observed GitHub behavior for Task #237. The provider-neutral contract and active policy rules remain owned by [`docs/review/README.md`](README.md) and [`docs/review/rules/`](rules/).

## Status

Subscription-backed Codex pull-request review is operational as of 2026-09-08 UTC after the account's code-review capacity reset. Manual review and automatic review on fresh pull-request open events both work through the ChatGPT/Codex GitHub integration.

Credits usage remains disabled. No repository LLM API secret, API-key review action, paid GitHub Action, credits fallback, provider-output parser, review-state gate, or permanent LLM invocation in CI has been introduced.

All six initial blocking rules, `PRR-001` through `PRR-006`, completed the repository calibration contract: each known violation produced two matching blocking findings in independent fresh review contexts and each committed boundary produced a clean reviewer outcome. All deliberate calibration violations lived only on disposable probe branches and pull requests and were closed without merge.

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

| Probe | Head / trigger | Observed GitHub result |
| --- | --- | --- |
| Pre-setup PR #241 | Opened before connector/environment setup completed. | No authoritative automatic review; manual requests hit setup errors. |
| Intermediate PR #242 | App/environment existed but account association was not yet working. | Manual `@codex review` returned the connector account-association error. |
| PR #243 after connector re-authentication | Manual `@codex review` on head `62d9b887997de487d56de3448121d9282d66ea88`. | Account-association error disappeared; provider instead reported that subscription code-review usage capacity had been reached. No credits fallback was enabled. |
| First successful finding review on PR #243 | Manual request on `c51d8877dabef5bf4abfacdfc943818e06495990`. | Review `5140049712`, state `COMMENTED`, exact REST `commit_id`, inline finding `3956514295`. |
| Finding fix and new-head review | New heads `0e65209d...` and `d42f04d4...`. | New review submissions were associated with the new exact head; older inline threads became `is_outdated=true` while historical review submissions remained visible. |
| First clean result on PR #243 | Manual review of `8a9ee52188b7bd3d3f4066280bf5f0ac22c82fb9`. | Top-level connector comment `5583797867` reported no major issues and embedded reviewed short SHA `8a9ee52188`; PR-level `+1` was also emitted. No Codex review object, check run, or commit status represented the clean result. |
| Fresh automatic-open proof | PR #244 opened with no manual review trigger. | Automatic review `5140648979` produced inline blocking `PRR-001` finding `3957010219`. This proves the configured pull-request-open trigger after account repair/capacity reset. |
| Same-context re-trigger | Manual `@codex review` on unchanged PR #244 after its current-head finding already existed. | Connector later posted a clean-looking top-level result, while the original blocking thread remained unresolved and non-outdated on the same head. This run is not an independent calibration repeat and proves that “latest Codex text wins” is invalid. |
| Prompt-only hypothetical calibration | Comment `5583807642` asked Codex to classify committed hypothetical cases. | Connector performed an ordinary PR review instead of returning the requested case classifications. Prompt-only classification is not calibration evidence. |

## Stable provider-observable facts

The following behaviors are established by PR #243 and the controlled calibration probes:

- the reviewer actor is `chatgpt-codex-connector[bot]`;
- a finding run creates a pull-request review with state `COMMENTED` and an exact `commit_id` for the reviewed head;
- blocking findings are inline review comments with path/line evidence and participate in GitHub review threads;
- review threads expose `is_resolved` and `is_outdated`; after a new head, historical findings can become outdated while their review submissions remain in history;
- a transient PR-level `eyes` reaction may be present while review is processing and is not a completion signal;
- automatic review on a fresh pull-request-open event is proven; automatic review on push is not proven;
- the observed clean representation is a connector top-level comment containing a reviewed short SHA plus a PR-level `+1` reaction;
- the observed clean representation does not create a Codex review object with exact REST `commit_id`, a Codex-owned check run, or a Codex commit status;
- a clean result does not expose whether the reviewer internally decided `no-violation` or `not-applicable`; both are externally observable only as absence of a finding / clean outcome;
- a later same-head clean-looking response does not erase an existing unresolved, non-outdated current-head blocking finding;
- repeated review inside an already-annotated PR cannot be assumed to be an independent evaluator trial; fresh isolated PR contexts are required for repeated calibration when prior findings could influence or suppress evaluation;
- failed setup/quota comments, transient reactions, stale review submissions, same-context duplicate suppression, or absence of a review cannot be treated as a clean gate signal.

## Calibration outcome

Each violation repeat below used a fresh pull request with equivalent rule semantics, base repository context, declared task context, and calibration diff semantics. PR numbers and commit SHAs are infrastructure identities only. Boundary rows record the declared expected decision and the externally observable clean signal; Codex does not expose `no-violation` versus `not-applicable` as separate clean artifacts.

| Rule / case | Trial | Reviewed head | Provider result |
| --- | --- | --- | --- |
| `PRR-001` / `unrelated-backend-cache` | PR #244 | `cb155d65cbdf97289706b9f5f2d2d380c9ea6e9e` | `violation` — review `5140648979`, inline `3957010219` |
| `PRR-001` / `unrelated-backend-cache` | PR #252 | `89c7fd31c928783a05634b253898de74139b54e8` | `violation` — review `5141125051`, inline `3957422052` |
| `PRR-001` / `required-local-configuration-docs` | PR #246 | `c35440a2aa4880ce237091f1a192a8b47b4f0cc5` | expected `no-violation`; clean `+1` reaction `494154536`; CI #341 / run `34222739796` green |
| `PRR-002` / `copied-service-configuration-rules` | PR #247 | `25dfdfc106681422650b24e59bb96fe2b0d028f9` | `violation` — review `5140864420`, inline `3957196988` |
| `PRR-002` / `copied-service-configuration-rules` | PR #248 | `25dfdfc106681422650b24e59bb96fe2b0d028f9` | `violation` — review `5140882782`, inline `3957212860` |
| `PRR-002` / `concise-routing-reference` | PR #249 | `6d6666a98650daa252beef5470b0ed908b8223da` | expected `no-violation`; clean `+1` reaction `494165525` |
| `PRR-003` / `service-test-repeats-runner-retry` | PR #250 | `07037a745f48bf80fc1f78da362ac441bcc04c77` | `violation` — review `5140943219`, inline `3957264944` |
| `PRR-003` / `service-test-repeats-runner-retry` | PR #251 | `07037a745f48bf80fc1f78da362ac441bcc04c77` | `violation` — review `5140986826`, inline `3957303157` |
| `PRR-003` / `controller-proves-owned-context-mapping` | PR #253 | `795b27efae516c8beedd6dec00a63162de0576df` | expected `no-violation`; clean `+1` reaction `494230447` |
| `PRR-004` / `service-local-runner-retry-wrapper` | PR #268 | `d33e7016c8d493b9a965e1b5070d3b2b9a0bbf99` | `violation` — review `5142388335`, inline `3958434701`; CI #359 / run `34232410278` green |
| `PRR-004` / `service-local-runner-retry-wrapper` | PR #269 | `b4b9db74ec02c22131e9b103a9b99d398c86b4d5` | `violation` — review `5142391071`, inline `3958437050`; CI #360 / run `34232440917` green |
| `PRR-004` / `standard-manifest-composition` | PR #265 | `36769cd5955637e69f0992fe7c0219b8a5950b4f` | expected `no-violation`; clean `+1`; CI #354 green |
| `PRR-005` / `renamed-generator-command-with-stale-readme` | PR #257 | `d1ee4e993cab3435b39b106782204d8eb75bc4d5` | `violation` — review `5141979481`, inline `3958133026` |
| `PRR-005` / `renamed-generator-command-with-stale-readme` | PR #258 | `d1ee4e993cab3435b39b106782204d8eb75bc4d5` | `violation` — review `5141988484`, inline `3958139510` |
| `PRR-005` / `schema-type-only-refactor` | PR #259 | `1ce0b95b8f8db4c45828ea6e15d77dee66ea1220` | expected `not-applicable`; clean `+1` reaction `494338686` |
| `PRR-006` / `invented-upload-size-limit` | PR #260 | `39ccb8b19d3108c29086b021aea6cf847eabc19e` | `violation` — review `5141986792`, inline `3958138132` |
| `PRR-006` / `invented-upload-size-limit` | PR #261 | `39ccb8b19d3108c29086b021aea6cf847eabc19e` | `violation` — review `5141997990`, inline `3958146466` |
| `PRR-006` / `required-file-without-content-restriction` | PR #262 | `8790133c22f03b90ed888ed064c88aa43ee675bd` | expected `no-violation`; clean `+1` reaction `494344795` |

The accepted calibration matrix is therefore complete: six blocking rules, twelve independent violation classifications, and six clean boundary classifications. The accepted calibration probes completed deterministic CI successfully. The Task branch itself was also fully green at pre-final-evidence head `ae43f7af14e6d948eaa473ee41519b7140a6ecd9` in CI #358 / run `34232171727`; its required `Test and build` job passed catalog validation, lint, typecheck, migrations, tests, builds, E2E, and API/Web artifact startup checks.

## Rejected calibration attempts and harness lessons

Calibration evidence deliberately excludes runs that were not independent or whose fixture introduced unrelated deterministic failures:

- the prompt-only hypothetical classification attempt is excluded because Codex ignored the requested classification format and performed an ordinary PR review;
- the same-context re-trigger on PR #244 is excluded because the existing current-head finding remained visible and could influence or suppress re-evaluation;
- the accidental `PRR-002` finding on intermediate Task head `0e65209d...` is excluded because its diff/context did not match the committed `PRR-002` calibration case;
- early `PRR-004` probes #254-#256 are excluded because synthetic fixtures created unrelated lint/typecheck failures;
- `PRR-004` probes #263-#264 correctly found the policy violation but are excluded because the fixture still violated deterministic repository conventions;
- probes #266-#267 are excluded because direct EDP type imports expanded the Documents service dependency surface and failed typecheck;
- the committed `PRR-004` calibration fixture was refined without changing the rule's decision boundary so it uses only the service's already-consumed public `Runner` type surface; fresh probes #268/#269 then produced matching blocking findings with green deterministic CI.

A controlled calibration fixture must therefore be executable, respect normal repository dependency/convention boundaries except for the single deliberate semantic violation being tested, and remain orthogonal to deterministic checks. Legitimate lint/typecheck/test failures must be fixed in the fixture rather than disabled or weakened.

All disposable calibration PRs were closed without merge. No intentional calibration violation exists in the Task #237 final production diff.

## Constraints carried into Task #238

Task #238 must use only provider behavior established above. In particular:

1. Finding reviews have a strong structured current-head association through review `commit_id` and inline thread state.
2. The strongest observed clean-head association is currently the reviewed short SHA embedded in a connector top-level comment plus a PR-level `+1`; there is no Codex-owned clean review object, check run, or commit status.
3. Current review state is an aggregate over current-head findings and staleness/resolution, not the latest connector text.
4. A new relevant head requires a new independent-review conclusion; historical reviews alone are insufficient.
5. No automatic review-on-push behavior has been established, so Task #238 must not assume it.
6. A brittle natural-language parser must not be introduced merely to manufacture a machine-readable clean gate. If the observed provider surface is insufficient for reliable enforcement, the Epic/task design must be revised rather than guessing.
7. Credits, API-key review calls, and permanent LLM-in-CI fallback remain out of scope.

Before Task #237 merges, its final head still requires green deterministic CI and a clean Codex review after this evidence update.
