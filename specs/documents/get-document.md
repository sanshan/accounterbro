# Get Document

## Purpose

Allow a user to retrieve the current registration state of a Document by its stable identifier.

## Input

The request contains a Document identifier.

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

## Out of scope

This specification does not define:

- listing Documents;
- search, filtering, sorting, or pagination;
- polling, push notifications, or any UI update mechanism;
- persistence or read-pipeline implementation details.
