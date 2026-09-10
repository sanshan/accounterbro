# Process Document

## Purpose

Allow a registered Document to be processed into extracted text and return the resulting Document Processing state without starting duplicate processing for the same Document within the calling tenant.

## Input

The request contains:

- the Document identifier;
- the opaque storage reference for the registered Document's original content.

The UseCase executes in the calling tenant context. Tenant identity is invocation metadata rather than a request-body field.

The storage reference is supplied by the invocation boundary and is used as-is to obtain the original Document bytes. Process Document does not derive or reconstruct a storage key from tenant or Document identity.

## Document Processing statuses

- `PENDING` — processing has been created and no terminal outcome has been recorded yet.
- `COMPLETED` — processing completed successfully and stores extracted text.
- `FAILED` — processing reached a terminal processing failure and stores the failure reason.

`PENDING` is the durable intermediate state between preparing a new processing and recording its terminal outcome. It may be observable while processing is in progress, after an interrupted execution, or by a concurrent invocation for the same tenant and Document.

## Requirements

### DPROC-PROC-001 — Process a new Document successfully

Given a Document that has no existing Document Processing within the calling tenant,
when the Process Document UseCase completes successfully,
then exactly one new Document Processing has been created and the request succeeds with:

```text
{
  id,
  documentId,
  status: COMPLETED,
  extractedText
}
```

The processing first enters `PENDING`. The UseCase then obtains the original Document content using the supplied storage reference, passes its bytes to the configured document extractor, and records the successful outcome before returning.

A completed processing stores the extracted text and does not expose a failure reason.

### DPROC-PROC-002 — Record a terminal processing failure

Given a newly created `PENDING` Document Processing,
when processing reaches a terminal, non-retryable failure,
then the UseCase records the terminal outcome and succeeds with:

```text
{
  id,
  documentId,
  status: FAILED,
  failureReason
}
```

A failed processing stores the failure reason and does not expose extracted text.

A retryable execution failure before a terminal outcome is recorded does not by itself transition the processing to `FAILED`. The durable `PENDING` state remains available for recovery or retry of the same logical execution through the platform execution mechanism.

### DPROC-PROC-003 — Return an existing completed processing

Given Document Processing already exists for the Document within the calling tenant and its current status is `COMPLETED`,
when Process Document is invoked again,
then the request succeeds by returning the stored completed processing state and extracted text.

The original Document content is not obtained again, extraction is not run again, and no new terminal outcome is recorded.

### DPROC-PROC-004 — Return an existing failed processing

Given Document Processing already exists for the Document within the calling tenant and its current status is `FAILED`,
when Process Document is invoked again,
then the request succeeds by returning the stored failed processing state and failure reason.

The original Document content is not obtained again, extraction is not run again, and the persisted failure is not automatically retried or replaced.

### DPROC-PROC-005 — Defer while processing is already in progress

Given Document Processing already exists for the Document within the calling tenant and its current status is `PENDING`,
when another Process Document invocation observes that state,
then the current execution ends with a retryable execution failure whose code is:

```text
document-processing-in-progress
```

The invocation does not obtain the original Document content, does not start another extraction, and does not record a terminal outcome.

The UseCase does not wait, poll, or run its own retry loop. Retry cadence and subsequent execution are owned by the external execution boundary.

## Out of scope

This specification does not define:

- retry count, backoff, or other retry policy;
- a separate manual retry UseCase for an already `FAILED` processing;
- document extraction technology or implementation details;
- the storage technology or physical key/path represented by the supplied storage reference;
- transport, consumers, asynchronous delivery, broker behavior, or presenter behavior;
- internal execution-claim, replay, idempotency, transaction, Outbox, or concurrency implementation details;
- standalone product behavior for Prepare Document Processing or Finish Document Processing Operations;
- authentication or authorization of the tenant identity supplied by the trusted invocation boundary.
