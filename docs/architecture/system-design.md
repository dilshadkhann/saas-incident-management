
# OpsHub — System Design

## 1. Project Overview

OpsHub is a multi-tenant SaaS incident management platform designed to help organizations manage operational incidents, track affected services, coordinate responders, and analyze incident performance.

Multiple organizations can use the same application while keeping their users and business data logically isolated.

### Primary Objectives

- Secure authentication and organization management.
- Multiple organizations within one application.
- Service and incident management.
- Incident investigation and resolution history.
- Organization-level access control.
- Operational dashboards and analytics.
- Containerized deployment and automated quality checks.

## 2. Architecture Style

OpsHub will use a modular monolithic architecture.

The application will have one frontend, one backend application, and one PostgreSQL database. Backend responsibilities will be separated into independent business modules.

### Why a Modular Monolith?

- Easier development and maintenance.
- Simpler deployment and local development.
- Clear separation of business responsibilities.
- Lower infrastructure complexity.
- Future flexibility to extract modules if genuine scaling requirements emerge.

## 3. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React | User interface |
| Language | TypeScript | Frontend type safety |
| Build tooling | Vite | Development and production builds |
| Styling | Tailwind CSS | UI styling |
| Routing | React Router | Frontend navigation |
| Backend | FastAPI | REST API |
| Backend language | Python | Business logic |
| Database | PostgreSQL | Persistent relational storage |
| ORM | SQLAlchemy | Database access |
| Migrations | Alembic | Database schema migrations |
| Containers | Docker | Application environment |
| CI/CD | GitHub Actions | Automated quality checks |
| Monitoring | Prometheus | Metrics collection |
| Visualization | Grafana | Operational dashboards |

## 4. High-Level Architecture

```text
                    USERS
                      |
                      v
             React + TypeScript
                      |
                HTTP / HTTPS
                      |
                      v
                  FastAPI
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
        Auth      Business    Authorization
        Module     Modules        Layer
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
      Services    Incidents   Organizations
          |           |           |
          +-----------+-----------+
                      |
                      v
                  SQLAlchemy
                      |
                      v
                  PostgreSQL
```

## 5. Backend Module Responsibilities

| Module | Responsibility |
|---|---|
| auth | Registration, login, logout and authentication |
| organizations | Organization creation and management |
| members | Membership, roles and invitations |
| services | Service registration and status management |
| incidents | Incident creation, assignment and lifecycle |
| timeline | Investigation updates |
| audit | Security and administrative events |
| analytics | Incident statistics and reporting |

Modules will have clearly defined responsibilities and share common infrastructure such as database sessions, configuration and authentication utilities.

## 6. Multi-Tenant Architecture

OpsHub will use a shared application and shared PostgreSQL database with logical tenant isolation.

Each organization will have a unique organization identifier. Organization-owned records will include an organization_id foreign key.

### Tenant Isolation Rules

1. Every organization-owned resource must be associated with an organization.
2. Users must have valid membership before accessing protected organization resources.
3. The backend determines the authorized organization context.
4. Database queries must be scoped to the authorized organization.
5. Client-supplied organization IDs must never be trusted as proof of access.
6. Cross-organization access attempts must be rejected.
7. Tenant isolation must be covered by automated tests.

Frontend filtering alone is not an authorization mechanism.

## 7. Authentication and Authorization

### Authentication

The application will support:

- User registration.
- User login and logout.
- Argon2id password hashing.
- Authentication using appropriately protected HttpOnly cookies.
- Authentication expiration and session security.
- CSRF protection for cookie-based authentication.

### Organization Roles

| Role | Permissions |
|---|---|
| Admin | Manage organization, members, services and incidents |
| Responder | Manage incidents and investigation updates |
| Viewer | Read dashboards, services and incidents |

Permissions will be enforced on the backend.

## 8. Incident Management

### Incident Severity

| Severity | Meaning |
|---|---|
| SEV1 | Critical |
| SEV2 | High |
| SEV3 | Medium |
| SEV4 | Low |

### Incident Lifecycle

```text
Investigating
      |
      v
 Identified
      |
      v
 Monitoring
      |
      v
  Resolved
```

Incidents will support:

- Title and description.
- Severity and status.
- Affected service.
- Assigned responder.
- Creation and resolution timestamps.
- Investigation updates.
- Incident history.

Valid lifecycle transitions will be enforced through backend business rules.

## 9. Initial Data Model

The initial relational entities will include:

- Users
- Organizations
- Memberships
- Invitations
- Services
- Incidents
- Incident Updates
- Audit Logs

### Core Relationships

- A user can belong to multiple organizations.
- An organization can have multiple members.
- An organization can own multiple services.
- An organization can own multiple incidents.
- A service can be associated with multiple incidents.
- An incident can have multiple investigation updates.
- Audit events record the organization and actor when applicable.

The detailed schema, constraints, indexes and relationship rules will be maintained in a separate database design document.

## 10. API Design Principles

The backend will expose versioned REST endpoints under:

`/api/v1/`

Principles:

- Resource-oriented URLs.
- Appropriate HTTP methods and status codes.
- Request and response validation.
- Consistent error responses.
- Authentication and authorization for protected resources.
- Pagination for collection endpoints.
- OpenAPI documentation through FastAPI.
- Organization-scoped resource access.

## 11. Security Principles

- Passwords will never be stored in plaintext.
- Secrets will be provided through environment configuration.
- Sensitive environment files will not be committed.
- Database access will use parameterized ORM operations.
- Backend inputs will be validated.
- Authorization will be checked for protected operations.
- Cross-tenant access will be explicitly tested.
- Important actions will be recorded in audit logs.
- Production configuration will use secure cookie and transport settings.

## 12. Testing Strategy

The project will include:

- Unit tests for business logic.
- API integration tests.
- Database integration tests.
- Authentication tests.
- Role and permission tests.
- Multi-tenant isolation tests.
- Frontend component tests.
- End-to-end tests for critical user journeys.

A feature will not be considered complete merely because it works manually.

## 13. Development and Deployment

Docker will provide reproducible local development.

GitHub Actions will execute relevant checks on pull requests, including:

- Backend linting.
- Backend automated tests.
- Frontend linting.
- Frontend build validation.
- Additional security and quality checks as the project matures.

Prometheus and Grafana will provide application observability.

## 14. Out of Scope for Initial MVP

The following are intentionally excluded from the first release:

- Subscription billing and payment processing.
- AI-powered incident analysis.
- Advanced on-call scheduling.
- Complex third-party alert integrations.
- Microservices architecture.

These capabilities may be considered after the core product is stable.

## 15. Architecture Evolution

The architecture will evolve through documented decisions and tested implementation changes.

Major changes to the technology stack, security model, tenant isolation strategy or deployment architecture must be documented and reviewed before implementation.

---

**Document:** System Design
**Project:** OpsHub
**Repository:** saas-incident-management
**Status:** Initial architecture baseline
