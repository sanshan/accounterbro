# Get Document

## Purpose

Allow a user to retrieve the current registration state of a Document by its stable identifier.

## Input

The request contains a Document identifier and executes in the calling tenant context. Tenant identity is invocation metadata rather than a route parameter.

## Requirements

### DOC-GET-001 — Return the current Document state

Given an existing Document identifier,
when the Document is requested,
then the request succeeds with:

```text
{
  id,
  status
}
```

The returned `status` reflects the Document's current state at the time of the read, including asynchronous transitions from `PENDING` to `REGISTERED` or `FAILED`.

### DOC-GET-002 — Report an unknown Document

Given a Document identifier that does not exist,
when the Document is requested,
then the request returns a not-found result.

### DOC-GET-003 — Hide a Document owned by another tenant

Given a valid Document identifier owned by another tenant,
when the Document is requested in the calling tenant context,
then the request returns the same not-found result as an unknown identifier.

The lookup must include tenant ownership at the persistence query boundary. It must not load a globally identified Document and compare ownership afterward.

## Out of scope

This specification does not define:

- listing Documents;
- search, filtering, sorting, or pagination;
- polling, push notifications, or any UI update mechanism;
- specific persistence technology or read-pipeline details beyond the required tenant-scoped lookup boundary.
- authentication or authorization of the tenant identity supplied by the trusted presenter boundary.
