# Incident Response

## Severity Levels

- SEV1: Tenant data exposure, auth bypass, destructive production event.
- SEV2: Major outage, failed deployment, broken login.
- SEV3: Degraded feature, analytics failure, non-critical UI regression.

## Response

1. Assign incident owner.
2. Preserve logs and audit evidence.
3. Freeze risky deployments.
4. Identify affected tenants.
5. Mitigate and communicate.
6. Verify restore or rollback.
7. Write post-incident report.

Do not delete audit logs during incident response.
