# ADR-002: Shared-Schema Multi-Tenancy

## Status

Accepted

## Decision

Customers are represented as organizations.

Tenant-owned database records will include an organization_id.
The authenticated server context, rather than frontend input,
determines the active organization.

## Initial strategy

- Shared application
- Shared PostgreSQL database
- Shared database schema
- organization_id on tenant-owned tables

## Security rule

Every tenant-owned database query must be restricted to the
authenticated organization.

Cross-tenant access must be covered by integration tests.
