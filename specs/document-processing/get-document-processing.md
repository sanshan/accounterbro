# Get Document Processing

## Purpose

Allow retrieval of the current Document Processing state for a Document by its stable Document identifier.

## Input

The request contains a Document identifier and executes in the calling tenant context. Tenant identity is invocation metadata rather than a route or request-body field.

## Requirements

### DPROC-GET-001 — Return the current Document Processing state

Given Document Processing exists for the Document within the calling tenant,
when its current state is requested,
then the request succeeds with the state-appropriate result:

```text
PENDING
{
  id,
  documentId,
  status: PENDING
}

COMPLETED
{
  id,
  documentId,
  status: COMPLETED,
  extractedText
}

FAILED
{
  id,
  documentId,
  status: FAILED,
  failureReason
}
```

The returned `status` reflects the current durable processing state at the time of the read. `COMPLETED` exposes extracted text, `FAILED` exposes the stored failure reason, and `PENDING` exposes neither terminal result field.

### DPROC-GET-002 — Report missing Document Processing

Given no Document Processing exists for the Document within the calling tenant,
when its processing state is requested,
then the request returns a not-found result.

This specification does not require the UseCase to distinguish between a source Document that does not exist and a source Document that exists but has no Document Processing.

### DPROC-GET-003 — Hide Document Processing owned by another tenant

Given Document Processing exists for the Document only in another tenant,
when its processing state is requested in the calling tenant context,
then the request returns the same not-found result as missing Document Processing.

The lookup must include tenant ownership at the owning Read/persistence query boundary. It must not load globally identified processing state and compare ownership afterward.

## Out of scope

This specification does not define:

- listing Document Processing records;
- search, filtering, sorting, or pagination;
- polling, push notifications, or any UI update mechanism;
- whether the source Document itself exists when no processing state is found;
- retrying or restarting processing;
- specific persistence technology or read-pipeline implementation details beyond the required tenant-scoped lookup boundary;
- authentication or authorization of the tenant identity supplied by the trusted invocation boundary.
