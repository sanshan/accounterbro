# Register Document

## Purpose

Allow a user to submit a file for registration as a Document and receive a stable Document identifier immediately after the initial registration step succeeds.

## Input

The request contains only the file.

This specification does not currently define file type or size restrictions.

## Document statuses

- `PENDING` — the Document has been created and processing of the original file has not finished.
- `REGISTERED` — the original file has been stored successfully and registration is complete.
- `FAILED` — the system could not store the original file.

## Requirements

### DOC-REG-001 — Start a new registration

Given file content that is not already known to the system,
when the initial registration step succeeds,
then a new Document is created with status `PENDING` and the request succeeds with:

```text
{
  id,
  status: PENDING,
  duplicate: false
}
```

If the initial registration step fails, the request fails and does not return a successful result.

### DOC-REG-002 — Return an existing duplicate

Given file content whose complete binary content is identical to content already known to the system,
when a new registration request is made,
then no new Document is created and the request succeeds with:

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

Given concurrent registration requests with identical binary content,
when those requests are processed,
then only one Document exists for that content.

One request may create the Document; the other requests succeed by returning that Document as a duplicate.

### DOC-REG-004 — Complete registration asynchronously

Given a newly created `PENDING` Document,
when asynchronous processing of its original file finishes,
then its status eventually becomes:

- `REGISTERED` if the original file was stored successfully; or
- `FAILED` if the system could not store the original file.

The initial `Register Document` request does not wait for this transition after it has successfully returned the `PENDING` result.

## Out of scope

This specification does not define:

- retry count, backoff, or other retry policy;
- retry behavior initiated after a Document is `FAILED`;
- request-idempotency semantics separate from duplicate content detection;
- the mechanism used to identify identical binary content;
- storage technology or storage orchestration;
- internal Operations, events, transactions, Outbox behavior, or other implementation details;
- file type or size restrictions.
