# Account Deletion

Sprint 13 adds account deletion initiation through:

- `/settings/account/delete`
- `/api/account/deletion-request`

## Beta Processing

Deletion is recorded and queued for admin processing. The beta process must review:

- Legal hold.
- Audit retention.
- Tenant ownership.
- Shared document/workflow dependencies.
- Storage, vector index, cache, and analytics deletion.

Recommended SLA for beta: acknowledge within 7 days and complete verified deletion within 30 days where legally permitted.
