# Register Document

## Purpose

Allow a user to submit a file for registration as a Document and receive the resulting Document state after original storage has completed within the same registration UseCase execution.

## Input

The request contains only the file.

Registration executes in the calling tenant context. Tenant identity is invocation metadata rather than a file/request-body field, and every resulting Document is owned by that tenant.

This specification does not currently define file type or size restrictions.

## Document statuses

- `PENDING` — the Document has been created and registration has not yet finished.
- `REGISTERED` — the original file has been stored successfully and registration is complete.
- `FAILED` — the system could not store the original file.

`PENDING` is the durable intermediate state between preparing a new Document and recording the storage outcome. It may be observable while registration is in progress, after an interrupted execution, or by a concurrent duplicate request.

## Requirements

### DOC-REG-001 — Register a new file

Given file content that is not already known within the calling tenant,
when the registration UseCase completes,
then exactly one new Document has been created and the request succeeds with:

```text
{
  id,
  status: REGISTERED | FAILED,
  duplicate: false
}
```

The Document first enters `PENDING`, then the original file is stored outside Documents Operation transactions, and finally the storage outcome is recorded before the UseCase returns:

- storage success results in `REGISTERED` and stores the original storage reference;
- storage failure results in `FAILED` and stores the failure reason.

If registration is interrupted after the Document is prepared but before the final outcome is recorded, the durable intermediate state remains `PENDING` until the same logical registration execution is recovered or retried through the platform execution mechanism.

### DOC-REG-002 — Return an existing duplicate

Given file content whose complete binary content is identical to content already known within the calling tenant,
when a new registration request is made,
then no new Document is created, the file is not stored again, and the request succeeds with:

```text
{
  id: existingDocumentId,
  status: existingStatus,
  duplicate: true
}
```

The existing Document is considered a duplicate regardless of whether its current status is `PENDING`, `REGISTERED`, or `FAILED`.

Submitting content that matches a `FAILED` Document does not itself request or trigger retry of that Document.

### DOC-REG-003 — Preserve one Document under concurrent duplicate registration

Given concurrent registration requests with identical binary content in the same tenant,
when those requests are processed,
then only one Document exists for that content.

One request may create and continue registering the Document; the other requests succeed by returning that Document as a duplicate and do not store the file again.

A concurrent duplicate request may observe the existing Document while its status is still `PENDING`.

### DOC-REG-004 — Complete original storage within the registration UseCase

Given a newly created `PENDING` Document,
when the same Register Document UseCase stores its original file,
then before that UseCase completes it records the storage outcome so the Document becomes:

- `REGISTERED` with the original storage reference when storage succeeds; or
- `FAILED` with the failure reason when storage fails.

External original-storage I/O does not run inside a transactional Documents Operation handler. The UseCase orchestrates the storage call between the operation that prepares the Document and the operation that records the final registration outcome.

### DOC-REG-005 — Isolate duplicate detection by tenant

Given two tenants submit identical binary content,
when both registrations complete,
then each tenant owns a distinct Document and neither registration reuses the other tenant's Document.

Content-hash uniqueness and concurrent duplicate resolution are tenant-local. Storage references/keys also remain tenant-scoped.

## Out of scope

This specification does not define:

- retry count, backoff, or other retry policy;
- retry behavior initiated after a Document is `FAILED`;
- request-idempotency semantics separate from duplicate content detection;
- the mechanism used to identify identical binary content;
- storage technology;
- transport, consumers, staging storage, asynchronous delivery, or broker behavior;
- internal transaction, Outbox, execution-log, or recovery implementation details;
- file type or size restrictions.
- authentication or authorization of the tenant identity supplied by the trusted presenter boundary.
