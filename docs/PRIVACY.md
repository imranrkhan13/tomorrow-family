# Data boundaries

The browser stores source files and tasks in IndexedDB. It stores only the household
access code in sessionStorage, never the Interfaze credential. No analytics are used.

When you click Extract and consent, your notice is sent to the app's server and to
Interfaze. The response, source-derived metadata, input hash and token usage remain
in a private cache (local filesystem for local dev; Redis for hosted deployments).
The full original file is not separately persisted by this app's server, but provider
responses can contain much of its content. Interfaze's own retention policy applies.

Downloaded backups contain originals and extracted content. Keep them private.
Local deletion removes local notices and their tasks, but does not clear server
cache. Contact the owner for server data deletion. Cache removal should leave a
non-content tombstone if duplicate-call prevention must remain in effect.

Single-household access code authentication is a pilot boundary. Do not use this
shared-code setup as a public multi-tenant school information system. Real expansion
needs per-user authentication, tenant-separated encrypted storage, retention controls,
auditing, consent design, abuse controls and a viable budget.
