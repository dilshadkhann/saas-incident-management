
# OpsHub — Project Structure and Development Standards

## 1. Document Overview

This document defines the repository structure, development conventions, coding standards, testing practices, Git workflow, environment configuration, and engineering guidelines for OpsHub.

OpsHub is a multi-tenant SaaS incident management platform built using React, TypeScript, FastAPI, PostgreSQL, and Docker.

The purpose of these standards is to ensure that the project remains:

- Maintainable as features grow.
- Secure by default.
- Consistent across frontend and backend.
- Easy to test and debug.
- Reproducible across development environments.
- Suitable for collaborative development.
- Ready for future enhancements without unnecessary complexity.

These standards apply throughout the MVP development lifecycle.

---

## 2. Technology Stack

The initial implementation uses the following technology stack.

### 2.1 Frontend

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Static typing |
| Vite | Development server and build tooling |
| Tailwind CSS | Styling |
| React Router | Application routing |
| TanStack Query | Server-state management |
| React Hook Form | Form management |
| Zod | Client-side schema validation |
| Vitest | Unit and component testing |
| Playwright | End-to-end testing |

### 2.2 Backend

| Technology | Purpose |
|---|---|
| Python | Backend language |
| FastAPI | REST API framework |
| Pydantic | Request and response validation |
| SQLAlchemy | ORM and database access |
| Alembic | Database migrations |
| PostgreSQL | Relational database |
| Argon2id | Password hashing |
| pytest | Automated testing |
| Ruff | Python linting and formatting |

### 2.3 Infrastructure and DevOps

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Local multi-container development |
| Git | Version control |
| GitHub | Source code hosting |
| GitHub Actions | Continuous integration |
| Prometheus | Metrics collection |
| Grafana | Monitoring and visualization |

### 2.4 Dependency policy

- Prefer stable, actively maintained dependencies.
- Prefer open-source tools.
- Pin or constrain dependency versions appropriately.
- Avoid adding dependencies without a clear requirement.
- Review security advisories for important dependencies.
- Keep frontend and backend dependencies separate.
- Commit dependency lock files.
- Do not install unnecessary global tools.

The selected stack is the initial project baseline. Any major technology change must be documented and justified.

---

## 3. Repository Structure

OpsHub follows a modular monolith architecture.

The frontend and backend are separate applications within one repository. The backend is organized into business modules rather than independently deployed microservices.

### 3.1 Proposed repository layout

    saas-incident-management/
    |
    |-- apps/
    |   |
    |   |-- web/
    |   |   |-- public/
    |   |   |-- src/
    |   |   |   |-- app/
    |   |   |   |-- assets/
    |   |   |   |-- components/
    |   |   |   |-- features/
    |   |   |   |-- hooks/
    |   |   |   |-- layouts/
    |   |   |   |-- lib/
    |   |   |   |-- routes/
    |   |   |   |-- styles/
    |   |   |   |-- types/
    |   |   |   |-- main.tsx
    |   |   |   |-- App.tsx
    |   |   |-- tests/
    |   |   |-- index.html
    |   |   |-- package.json
    |   |   |-- tsconfig.json
    |   |   |-- vite.config.ts
    |   |   |-- vitest.config.ts
    |   |   |-- eslint.config.js
    |   |   |-- .env.example
    |   |
    |   |-- api/
    |       |-- app/
    |       |   |-- api/
    |       |   |   |-- v1/
    |       |   |   |-- dependencies/
    |       |   |   |-- router.py
    |       |   |
    |       |   |-- core/
    |       |   |-- db/
    |       |   |-- models/
    |       |   |-- schemas/
    |       |   |-- modules/
    |       |   |   |-- auth/
    |       |   |   |-- organizations/
    |       |   |   |-- memberships/
    |       |   |   |-- services/
    |       |   |   |-- incidents/
    |       |   |   |-- audit/
    |       |   |   |-- analytics/
    |       |   |
    |       |   |-- middleware/
    |       |   |-- main.py
    |       |
    |       |-- migrations/
    |       |   |-- versions/
    |       |   |-- env.py
    |       |
    |       |-- tests/
    |       |   |-- unit/
    |       |   |-- integration/
    |       |   |-- security/
    |       |   |-- conftest.py
    |       |
    |       |-- pyproject.toml
    |       |-- alembic.ini
    |       |-- .env.example
    |
    |-- infra/
    |   |-- docker/
    |   |-- monitoring/
    |       |-- prometheus/
    |       |-- grafana/
    |
    |-- docs/
    |   |-- architecture/
    |   |-- development/
    |
    |-- scripts/
    |
    |-- .github/
    |   |-- workflows/
    |
    |-- .gitignore
    |-- .dockerignore
    |-- docker-compose.yml
    |-- README.md
    |-- LICENSE

This is the proposed target structure. Directories and files will be introduced as their corresponding implementation work begins. Empty placeholder directories are not required.

### 3.2 Root directory responsibilities

| Directory or file | Responsibility |
|---|---|
| apps/ | Application code |
| apps/web/ | React frontend |
| apps/api/ | FastAPI backend |
| infra/ | Infrastructure and monitoring configuration |
| docs/ | Project and engineering documentation |
| scripts/ | Reusable development and maintenance scripts |
| .github/ | GitHub Actions and repository automation |
| docker-compose.yml | Local application service orchestration |
| README.md | Project overview and setup instructions |
| LICENSE | Repository license |

---

## 4. Frontend Architecture Standards

The frontend uses React with TypeScript and a feature-oriented organization.

### 4.1 Application structure

The `apps/web/src/` directory has the following responsibilities:

| Directory | Responsibility |
|---|---|
| app/ | Application initialization and providers |
| assets/ | Static assets |
| components/ | Reusable UI components |
| features/ | Feature-specific components and logic |
| hooks/ | Shared React hooks |
| layouts/ | Application layouts |
| lib/ | Shared utilities and integrations |
| routes/ | Route definitions and route protection |
| styles/ | Global styling |
| types/ | Shared frontend types |

### 4.2 Feature organization

Business functionality should be grouped by feature.

Example:

    features/
    |
    |-- auth/
    |   |-- components/
    |   |-- hooks/
    |   |-- services/
    |   |-- schemas/
    |   |-- types.ts
    |
    |-- incidents/
    |   |-- components/
    |   |-- hooks/
    |   |-- services/
    |   |-- schemas/
    |   |-- types.ts
    |
    |-- services/
    |-- organizations/
    |-- memberships/
    |-- analytics/
    |-- audit/

Feature-specific functionality should remain inside its feature unless reuse across multiple features is justified.

### 4.3 Component standards

- Use functional React components.
- Use TypeScript for component props and application logic.
- Keep components focused on a clear responsibility.
- Extract reusable components when meaningful duplication appears.
- Avoid unnecessarily large components.
- Avoid deeply nested conditional rendering.
- Use accessible HTML elements.
- Provide loading, error, and empty states.
- Avoid putting business logic directly into presentation components.

### 4.4 TypeScript standards

- Enable strict TypeScript checking.
- Avoid `any` wherever practical.
- Use explicit types for API responses and important application data.
- Prefer reusable interfaces or types where appropriate.
- Handle nullable and optional values explicitly.
- Avoid unnecessary type assertions.
- Keep frontend API contracts synchronized with backend schemas.

### 4.5 API communication

- Centralize API communication in reusable service modules.
- Avoid scattering raw HTTP requests throughout components.
- Handle authentication and session-related errors consistently.
- Handle API validation errors in forms.
- Use a consistent approach to loading and error states.
- Do not treat frontend authorization as a security boundary.
- Never expose backend secrets in frontend environment variables.

### 4.6 Frontend state management

Use the appropriate state-management approach for each type of state:

- Component state for local UI interactions.
- React Context for suitable shared application-level state.
- TanStack Query for server data, caching, and synchronization.
- URL state for navigational filters and shareable views where appropriate.

Avoid introducing a global state-management library unless the application's actual complexity justifies it.

---

## 5. Backend Architecture Standards

The backend follows a modular monolith architecture using FastAPI.

Business modules are organized around the main capabilities of OpsHub.

### 5.1 Backend directory responsibilities

| Directory | Responsibility |
|---|---|
| api/ | HTTP routing and API dependencies |
| core/ | Configuration, security, and shared application concerns |
| db/ | Database engine, sessions, and database utilities |
| models/ | SQLAlchemy database models |
| schemas/ | Shared Pydantic schemas where appropriate |
| modules/ | Business functionality |
| middleware/ | Cross-cutting HTTP middleware |
| migrations/ | Alembic migration history |
| tests/ | Backend automated tests |

### 5.2 Business module boundaries

Initial backend modules:

**auth**
- Registration.
- Login.
- Logout.
- Session management.
- Current-user retrieval.

**organizations**
- Organization creation.
- Organization listing.
- Organization details.
- Organization updates.

**memberships**
- Membership management.
- Role assignment.
- Invitations.
- Invitation acceptance.
- Membership removal.

**services**
- Service creation.
- Service listing.
- Service updates.
- Service archival.

**incidents**
- Incident creation.
- Incident retrieval.
- Incident updates.
- Assignment.
- Status transitions.
- Investigation timeline.

**audit**
- Audit event creation.
- Audit event retrieval.
- Audit-related queries.

**analytics**
- Dashboard metrics.
- Incident statistics.
- Service health summaries.

Modules may interact through clearly defined interfaces and shared application services. Avoid circular dependencies and unnecessary cross-module coupling.

### 5.3 Request handling principles

A typical backend request follows this flow:

    HTTP Request
         |
         v
    FastAPI Router
         |
         v
    Authentication and Authorization
         |
         v
    Request Validation
         |
         v
    Business Logic
         |
         v
    Database Access
         |
         v
    Response Schema
         |
         v
    HTTP Response

Responsibilities should remain separated.

- Routers handle HTTP concerns.
- Pydantic schemas validate and serialize data.
- Business logic handles application rules.
- Database access handles persistence.
- Authorization dependencies enforce access requirements.

Do not place all application logic inside route handlers.

### 5.4 Dependency injection

Use FastAPI dependency injection for shared concerns such as:

- Database sessions.
- Authenticated user retrieval.
- Organization membership verification.
- Role and permission checks.
- Configuration access.

Dependencies must remain understandable and testable.

### 5.5 Exception handling

- Use consistent application-level exceptions.
- Convert expected failures into documented HTTP responses.
- Avoid exposing stack traces to API clients.
- Log unexpected errors with appropriate diagnostic information.
- Never include credentials, session tokens, or passwords in exception logs.

---

## 6. Database Development Standards

PostgreSQL is the primary relational database.

SQLAlchemy manages application database access, and Alembic manages schema migrations.

### 6.1 Database naming conventions

- Use lowercase `snake_case` for table names.
- Use lowercase `snake_case` for column names.
- Use descriptive table and column names.
- Use UUIDs for primary identifiers.
- Use UTC timestamps.
- Define foreign keys explicitly.
- Define appropriate uniqueness and check constraints.
- Index frequently queried columns.

Examples:

- `organizations`
- `organization_memberships`
- `incident_updates`
- `created_at`
- `organization_id`
- `assignee_id`

### 6.2 Tenant ownership

Every tenant-owned record must be associated with its organization.

Examples:

- Services.
- Incidents.
- Incident updates.
- Audit logs.
- Organization invitations.
- Membership records.

Queries must always enforce organization scope.

Relationships between tenant-owned records must preserve organization consistency through appropriate database constraints.

### 6.3 Database access

- Use SQLAlchemy rather than constructing SQL strings from untrusted input.
- Keep transactions explicit where business operations span multiple records.
- Use appropriate eager loading to avoid unnecessary database queries.
- Avoid N+1 query patterns.
- Handle database integrity violations safely.
- Keep database sessions properly scoped to requests or operations.

### 6.4 Migration standards

All database schema changes must use Alembic migrations.

Rules:

- Never rely on manually changing a database schema as the permanent solution.
- Generate or write migrations for schema changes.
- Review generated migrations before applying them.
- Keep migrations under version control.
- Test migrations against a development database.
- Consider existing data before making destructive changes.
- Avoid silently dropping columns or tables.
- Document important data migrations.

### 6.5 Data retention

- Historical incident records must be preserved.
- Audit history must be retained according to the documented retention policy.
- Membership removal must not delete unrelated user or incident history.
- Service archival must preserve historical incident relationships.
- Deletion behavior must respect foreign-key constraints.

---

## 7. API Development Standards

The API follows the contract documented in:

`docs/architecture/api-specification.md`

### 7.1 API conventions

- Use `/api/v1` for versioned API endpoints.
- Use resource-oriented endpoint names.
- Use appropriate HTTP methods.
- Return documented HTTP status codes.
- Use JSON request and response bodies.
- Validate all incoming data.
- Use consistent error responses.
- Use pagination for collections.
- Use UTC timestamps.

### 7.2 Request and response schemas

- Define Pydantic schemas for request validation.
- Define response schemas to control exposed fields.
- Do not return SQLAlchemy model objects directly without appropriate serialization.
- Never expose password hashes or session secrets.
- Keep schema names and field meanings consistent.

### 7.3 API compatibility

- Avoid breaking existing API contracts without a documented reason.
- Update OpenAPI documentation when endpoints or schemas change.
- Update frontend API types when contracts change.
- Keep architecture and API documentation synchronized with implementation.

---

## 8. Authentication and Security Standards

Security is a core engineering requirement, not a final-stage enhancement.

### 8.1 Password security

- Use Argon2id for password hashing.
- Never store plaintext passwords.
- Never log passwords.
- Never return password hashes through API responses.
- Validate password requirements on the backend.

### 8.2 Session security

- Use server-managed sessions.
- Store session identifiers in secure cookies.
- Use HttpOnly and Secure attributes in production.
- Configure SameSite appropriately.
- Enforce CSRF protection for cookie-authenticated state-changing requests.
- Enforce session expiration and revocation.
- Avoid logging session identifiers.

### 8.3 Authorization

- Verify authentication for protected endpoints.
- Verify active organization membership.
- Verify role permissions.
- Enforce authorization in backend dependencies and business operations.
- Validate organization ownership of referenced resources.
- Never trust frontend-only permission checks.

### 8.4 Tenant isolation

- Scope every tenant-owned database query.
- Validate cross-organization relationships.
- Prevent direct object-reference attacks.
- Test cross-tenant access using multiple organizations.
- Return appropriate non-disclosing errors for inaccessible resources.

### 8.5 Input and output security

- Validate request payloads.
- Apply safe output serialization.
- Avoid unsafe dynamic SQL.
- Apply rate limits to sensitive endpoints.
- Configure CORS using an explicit origin allowlist.
- Use HTTPS in production.
- Avoid exposing internal exception details.

---

## 9. Environment Configuration and Secrets

Configuration must be separated from application source code.

### 9.1 Environment files

Each application may maintain its own environment configuration.

Examples:

- `apps/api/.env`
- `apps/web/.env`

Example backend environment template:

    APP_ENV=development
    DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/opshub
    SESSION_SECRET=replace_with_a_secure_random_value
    CORS_ORIGINS=http://localhost:5173

Example frontend environment template:

    VITE_API_BASE_URL=http://localhost:8000/api/v1

These are illustrative development templates. Actual variable names and database drivers must match the implementation.

### 9.2 Environment standards

- Commit `.env.example` files.
- Do not commit actual `.env` files.
- Add secret-bearing environment files to `.gitignore`.
- Validate required environment variables at application startup.
- Keep development, testing, and production configuration separate.
- Do not place secrets in frontend variables.
- Remember that Vite exposes variables prefixed with `VITE_` to browser code.
- Use appropriate secret management for production deployment.

### 9.3 Secret handling

Never commit:

- Database passwords.
- Session signing secrets.
- API keys.
- Private tokens.
- Production credentials.
- Personal access tokens.

If a secret is accidentally committed, rotate or revoke it. Removing it from a later commit alone does not make the exposed secret safe.

---

## 10. Docker and Local Development Standards

Docker provides a reproducible development environment.

### 10.1 Initial services

The local environment is expected to include:

- PostgreSQL.
- FastAPI backend.
- React frontend.

Prometheus and Grafana may be added as the monitoring implementation is introduced.

### 10.2 Docker standards

- Use official or trusted base images.
- Prefer pinned image versions.
- Use environment variables for configuration.
- Keep secrets out of Dockerfiles.
- Use health checks for required services.
- Use named volumes for persistent local database data.
- Use `.dockerignore` to exclude unnecessary files.
- Avoid running application processes as root where practical.
- Keep container responsibilities clear.

### 10.3 Development workflow

A typical development workflow is:

1. Start the required Docker services.
2. Confirm database readiness.
3. Start or verify the backend.
4. Apply database migrations.
5. Start or verify the frontend.
6. Run automated tests.
7. Inspect logs when troubleshooting.
8. Stop services when finished.

Do not delete persistent database volumes merely to resolve an application error. Inspect the problem first and preserve data unless deletion is explicitly intended and approved.

### 10.4 Development and production separation

Local development configuration must not be treated as production configuration.

Production deployment requires separate consideration of:

- HTTPS and domain configuration.
- Secure cookie settings.
- Secret management.
- Database credentials and backups.
- Logging and monitoring.
- Resource limits.
- Database migration procedures.

---

## 11. Coding Style and Naming Conventions

Consistent naming improves readability and reduces confusion.

### 11.1 Python

| Element | Convention | Example |
|---|---|---|
| Files | snake_case | `incident_service.py` |
| Functions | snake_case | `create_incident()` |
| Variables | snake_case | `organization_id` |
| Classes | PascalCase | `IncidentService` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| Packages | lowercase | `incidents` |

Additional rules:

- Follow PEP 8.
- Use type hints.
- Prefer clear function and variable names.
- Keep functions focused.
- Avoid unnecessary global state.
- Use Ruff for linting and formatting.

### 11.2 TypeScript and React

| Element | Convention | Example |
|---|---|---|
| Components | PascalCase | `IncidentCard.tsx` |
| Hooks | camelCase with use prefix | `useIncidents.ts` |
| Functions | camelCase | `createIncident()` |
| Variables | camelCase | `organizationId` |
| Types and interfaces | PascalCase | `IncidentResponse` |
| Constants | UPPER_SNAKE_CASE where appropriate | `DEFAULT_PAGE_SIZE` |
| CSS classes | Tailwind utility conventions | `flex items-center` |

Additional rules:

- Follow the project's ESLint configuration.
- Use strict TypeScript.
- Keep component props typed.
- Prefer readable, small components.
- Avoid unnecessary abstraction.
- Use consistent import organization.

### 11.3 General naming rules

- Names should communicate intent.
- Avoid unclear abbreviations.
- Avoid generic names such as `data`, `item`, or `helper` when a more descriptive name is appropriate.
- Use consistent terminology across API, database, frontend, and documentation.

---

## 12. Testing Standards

Automated testing is required for critical application behavior.

### 12.1 Backend tests

Use pytest.

Organize tests into:

- Unit tests.
- Integration tests.
- Security tests.

Test coverage should include:

- Business logic.
- Authentication.
- Role permissions.
- Organization membership.
- Tenant isolation.
- Incident lifecycle.
- Database constraints.
- API error handling.

### 12.2 Frontend tests

Use Vitest and appropriate React testing utilities.

Test:

- Component behavior.
- Form validation.
- User interactions.
- Loading and error states.
- Role-aware navigation.
- API response handling.

### 12.3 End-to-end tests

Use Playwright for critical user journeys.

The initial end-to-end workflow must verify:

1. User registration.
2. Authentication.
3. Organization creation.
4. Service creation.
5. Member invitation.
6. Invitation acceptance.
7. Incident creation.
8. Incident assignment.
9. Investigation updates.
10. Status transitions.
11. Incident resolution.
12. Dashboard metrics.
13. Authorization and tenant isolation.

### 12.4 Test quality

- Tests must be repeatable.
- Tests must not depend on production data.
- Use isolated test databases or controlled test environments.
- Avoid relying on arbitrary sleep delays.
- Test failure scenarios as well as successful operations.
- Security-critical tests must not be skipped merely to achieve a passing test run.

### 12.5 Coverage expectations

Prioritize meaningful coverage of:

- Authentication and authorization.
- Tenant isolation.
- Incident lifecycle rules.
- Data integrity.
- Critical user workflows.

Code coverage percentages are useful indicators, but passing meaningful behavioral and security tests is more important than maximizing a number.

---

## 13. Code Quality and Tooling

Code quality checks must be repeatable and automated where practical.

### 13.1 Backend quality

Ruff is used for:

- Python linting.
- Python formatting.
- Basic style enforcement.

pytest is used for automated tests.

### 13.2 Frontend quality

Use:

- ESLint for linting.
- TypeScript compiler checks.
- Prettier where configured.
- Vitest for tests.
- Vite for production builds.

### 13.3 Quality principles

- Fix errors rather than suppressing them without justification.
- Avoid unused imports and variables.
- Avoid duplicate business logic.
- Keep configuration consistent.
- Review dependency changes.
- Run relevant checks before submitting changes.

---

## 14. Git and GitHub Workflow

Git is used for version control, and GitHub hosts the repository and pull requests.

### 14.1 Branching strategy

Do not develop directly on `main`.

Use short-lived feature branches.

Recommended branch prefixes:

| Prefix | Purpose |
|---|---|
| `docs/` | Documentation |
| `feat/` | New functionality |
| `fix/` | Bug fixes |
| `test/` | Testing changes |
| `refactor/` | Code restructuring |
| `chore/` | Maintenance and tooling |

Examples:

- `docs/architecture-and-planning`
- `feat/user-authentication`
- `feat/incident-management`
- `fix/tenant-isolation`
- `test/incident-workflows`

### 14.2 Commit conventions

Use clear, descriptive commit messages.

Recommended format:

`type(scope): description`

Examples:

- `docs(architecture): add system design`
- `feat(auth): implement user registration`
- `feat(incidents): add incident creation`
- `fix(security): enforce organization membership`
- `test(incidents): add lifecycle tests`
- `chore(ci): configure backend checks`

### 14.3 Pull requests

Each feature branch should be submitted through a pull request.

Before merging:

- Review the changed files.
- Check for accidental secrets.
- Run relevant automated tests.
- Run linting and formatting checks.
- Review database migrations.
- Verify documentation updates.
- Confirm CI passes.

Changes should be merged only after review and approval.

### 14.4 Main branch protection

Where supported by repository settings:

- Require pull requests.
- Require successful CI checks.
- Prevent force pushes.
- Prevent accidental deletion of `main`.
- Require appropriate review before merging.

### 14.5 Git safety

- Avoid destructive Git commands without understanding their consequences.
- Never force-push as a routine workflow.
- Do not discard uncommitted work without approval.
- Inspect `git status` before committing.
- Review staged changes before creating commits.
- Keep commits focused and meaningful.

---

## 15. Continuous Integration

GitHub Actions will provide automated quality checks.

### 15.1 Initial CI responsibilities

Backend pipeline:

- Set up the supported Python version.
- Install project dependencies.
- Run Ruff linting.
- Check formatting.
- Run pytest.

Frontend pipeline:

- Set up the supported Node.js version.
- Install dependencies using the committed lock file.
- Run ESLint.
- Run TypeScript checks.
- Run frontend tests.
- Build the production frontend.

### 15.2 Database-related checks

As database integration is introduced, CI should also:

- Start a PostgreSQL test service where required.
- Apply migrations.
- Run database integration tests.
- Verify migration consistency.

### 15.3 CI principles

- CI must produce reproducible results.
- Failed critical checks must block merging.
- Tests must not require production credentials.
- CI secrets must be managed through GitHub's secure configuration.
- Workflow permissions should follow least privilege.

---

## 16. Documentation Standards

Documentation is part of the implementation, not an optional final task.

### 16.1 Required documentation

- Project README.
- System design.
- Database design.
- API specification.
- MVP requirements.
- Project structure and development standards.
- Local development instructions.
- Environment variable reference.
- Testing instructions.
- Deployment instructions when deployment is introduced.

### 16.2 Documentation maintenance

Update documentation when:

- Architecture changes.
- Database schema changes.
- API contracts change.
- Environment variables change.
- Development commands change.
- New operational procedures are introduced.

Documentation must describe actual behavior, not planned functionality presented as completed.

### 16.3 Code documentation

- Use docstrings for important public functions and complex logic.
- Comment on why non-obvious decisions exist.
- Avoid comments that simply repeat the code.
- Keep examples accurate.
- Remove outdated documentation when replacing behavior.

---

## 17. Development Workflow

All work should follow a consistent development cycle.

### 17.1 Feature implementation cycle

1. Review the relevant architecture and requirements.
2. Identify the affected frontend, backend, and database modules.
3. Create a feature branch.
4. Implement the smallest coherent change.
5. Add or update automated tests.
6. Run linting and formatting.
7. Run relevant tests.
8. Review security and tenant isolation implications.
9. Update documentation.
10. Review Git changes.
11. Create a pull request.
12. Merge only after required checks pass and approval is obtained.

### 17.2 Bug-fixing cycle

1. Reproduce the problem.
2. Identify the root cause.
3. Determine the affected components.
4. Add a regression test where practical.
5. Implement the smallest safe fix.
6. Run relevant tests.
7. Review for unintended side effects.
8. Document important changes.
9. Submit the fix through a pull request.

### 17.3 Database change cycle

1. Review the existing database design.
2. Identify the schema change.
3. Update SQLAlchemy models.
4. Create an Alembic migration.
5. Review the migration.
6. Test the migration against a development database.
7. Update related schemas and API behavior.
8. Add or update database tests.
9. Update database documentation.

---

## 18. Engineering Principles

The following principles guide technical decisions throughout OpsHub development.

### 18.1 Prefer simplicity

- Build only what the current requirements need.
- Avoid premature abstraction.
- Avoid unnecessary microservices.
- Avoid unnecessary infrastructure.
- Prefer understandable code over clever code.

### 18.2 Security by design

- Validate every protected operation.
- Enforce permissions in the backend.
- Preserve tenant isolation at every layer.
- Protect authentication sessions.
- Treat user input and external data as untrusted.

### 18.3 Maintainability

- Keep modules focused.
- Define clear boundaries.
- Avoid duplicated logic.
- Use consistent naming.
- Write meaningful tests.
- Keep documentation current.

### 18.4 Reliability

- Use database transactions for related operations.
- Handle failures explicitly.
- Preserve historical business records.
- Test important failure scenarios.
- Avoid hidden dependencies on local machine state.

### 18.5 Controlled evolution

- Start with a modular monolith.
- Introduce complexity only when justified.
- Keep architecture decisions documented.
- Evaluate new technologies against actual requirements.
- Avoid adding future features to the MVP without an approved scope change.

---

## 19. MVP Engineering Completion Checklist

### Repository and structure

- [ ] Repository structure follows the agreed design.
- [ ] Frontend and backend are separated.
- [ ] Configuration files are organized.
- [ ] `.gitignore` is configured.
- [ ] `.dockerignore` is configured.
- [ ] Environment examples are provided.
- [ ] No secrets are committed.

### Frontend

- [ ] React and TypeScript are configured.
- [ ] Strict TypeScript checks are enabled.
- [ ] Application routing works.
- [ ] Reusable components are organized.
- [ ] Feature modules are separated.
- [ ] API communication is centralized.
- [ ] Loading and error states are implemented.
- [ ] Frontend tests pass.

### Backend

- [ ] FastAPI application starts successfully.
- [ ] Business modules are separated.
- [ ] Request and response schemas are defined.
- [ ] Database access is organized.
- [ ] Authentication is implemented securely.
- [ ] Role-based authorization is enforced.
- [ ] Tenant-scoped queries are enforced.
- [ ] Backend tests pass.

### Database

- [ ] PostgreSQL integration works.
- [ ] SQLAlchemy models match the database design.
- [ ] Alembic migrations are configured.
- [ ] Foreign keys and constraints are enforced.
- [ ] Tenant consistency is protected.
- [ ] Database integration tests pass.

### Infrastructure and CI

- [ ] Docker-based local development works.
- [ ] Docker Compose configuration is documented.
- [ ] Health checks work.
- [ ] GitHub Actions workflows are configured.
- [ ] Required CI checks pass.
- [ ] Monitoring foundations are implemented.

### Git and documentation

- [ ] Feature branches are used.
- [ ] Commit messages are meaningful.
- [ ] Pull requests are used for integration.
- [ ] README is accurate.
- [ ] Architecture documentation matches implementation.
- [ ] API documentation matches implementation.
- [ ] Development instructions are reproducible.

---

## 20. Final Engineering Standard

OpsHub must be developed as a secure, maintainable, and testable modular monolith.

A change is not considered complete merely because its code has been written or its user interface appears to work.

Each meaningful feature must have:

- Clear requirements.
- Appropriate architectural placement.
- Validated inputs.
- Correct authorization.
- Tenant-safe data access.
- Appropriate error handling.
- Relevant automated tests.
- Updated documentation where necessary.

These standards establish the engineering baseline for the OpsHub MVP.

Changes to these standards should be deliberate, documented, and consistent with the project's architecture and requirements.
