# ADR-001: Use a Modular Monolith

## Status

Accepted

## Context

The platform will serve schools, sports academies, and other
educational organizations. It includes authentication, users,
students, groups, curricula, sessions, attendance, evaluations,
media, and reporting.

## Decision

The backend will begin as a Spring Boot modular monolith.

Business capabilities will be separated into packages with clear
boundaries, but they will be deployed as one application and use
one PostgreSQL database.

## Consequences

### Positive

- Simpler deployment
- Simple database transactions
- Easier local development
- Faster initial delivery
- Lower operating costs
- Modules can potentially be extracted later

### Negative

- Module boundaries require discipline
- One deployment contains all backend modules
- Poor package design could create unwanted coupling
