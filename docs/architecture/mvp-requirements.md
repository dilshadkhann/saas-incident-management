
# OpsHub — MVP Requirements and Acceptance Criteria

## 1. Document Overview

This document defines the functional requirements, user stories, acceptance criteria, security expectations, and completion criteria for the OpsHub Minimum Viable Product (MVP).

OpsHub is a multi-tenant SaaS incident management platform designed to help engineering and operations teams manage services, respond to incidents, coordinate investigations, and maintain operational visibility.

This document translates the system architecture, database design, and API specification into verifiable product requirements.

### 1.1 MVP objective

Deliver a working, secure, and maintainable incident management platform that allows multiple organizations to independently:

- Register and authenticate users.
- Create and manage organization workspaces.
- Invite members and assign roles.
- Register and monitor services.
- Create, assign, investigate, and resolve incidents.
- Maintain incident timelines and audit history.
- View operational dashboards and analytics.

### 1.2 Target users

- Engineering teams.
- Site Reliability Engineering (SRE) teams.
- DevOps and platform engineering teams.
- IT operations teams.
- Organizations that need a centralized incident management workflow.

### 1.3 MVP principles

- Security before convenience.
- Tenant isolation by design.
- Backend-enforced authorization.
- Clear and predictable incident workflows.
- Maintainable modular architecture.
- Automated testing for critical functionality.
- Reproducible local development and deployment.

---

## 2. User Roles and Permissions

OpsHub supports three initial organization-level roles.

### 2.1 Admin

An Admin manages the organization and its operational configuration.

Responsibilities:

- Manage organization details.
- Invite and remove members.
- Assign and update member roles.
- Create and manage services.
- Create, assign, update, and resolve incidents.
- View dashboards, analytics, and audit logs.

### 2.2 Responder

A Responder participates in incident investigation and resolution.

Responsibilities:

- View organization services.
- View incidents.
- Create incidents.
- Update incident information.
- Assign incidents.
- Change incident lifecycle status.
- Add investigation updates.
- View dashboards and analytics.

Responders cannot manage organization membership or organization settings.

### 2.3 Viewer

A Viewer has read-only access to operational information.

Responsibilities:

- View dashboards.
- View services.
- View incidents.
- View incident timelines.
- View analytics.

Viewers cannot create, update, assign, or resolve incidents.

### 2.4 Permission matrix

| Capability | Admin | Responder | Viewer |
|---|---|---|---|
| View dashboard | Yes | Yes | Yes |
| View services | Yes | Yes | Yes |
| Create services | Yes | No | No |
| Update services | Yes | No | No |
| Delete/archive services | Yes | No | No |
| View incidents | Yes | Yes | Yes |
| Create incidents | Yes | Yes | No |
| Update incidents | Yes | Yes | No |
| Assign incidents | Yes | Yes | No |
| Change incident status | Yes | Yes | No |
| Add incident updates | Yes | Yes | No |
| View audit logs | Yes | No | No |
| View analytics | Yes | Yes | Yes |
| Invite members | Yes | No | No |
| Change member roles | Yes | No | No |
| Remove members | Yes | No | No |
| Update organization | Yes | No | No |

All permissions must be enforced by the backend.

---

## 3. Functional Requirements

Functional requirements describe what the application must do.

### FR-01: User registration

The application must allow a new user to register.

Requirements:

- Accept name, email address, and password.
- Validate all submitted fields.
- Enforce a documented password policy.
- Prevent duplicate accounts for the same normalized email address.
- Hash passwords using Argon2id.
- Never store plaintext passwords.

Acceptance criteria:

- A valid registration creates a user account.
- Invalid input returns an appropriate validation error.
- Duplicate email registration is rejected.
- Password hashes are stored instead of plaintext passwords.
- Passwords and hashes are never included in API responses.

### FR-02: User authentication

The application must allow registered users to log in and log out.

Requirements:

- Authenticate users using email and password.
- Create a server-managed authenticated session.
- Deliver the session through a secure cookie.
- Provide an authenticated current-user endpoint.
- Invalidate the session on logout.

Acceptance criteria:

- Valid credentials create an authenticated session.
- Invalid credentials do not create a session.
- Unauthenticated users cannot access protected endpoints.
- Logout invalidates the current session.
- Session cookies use appropriate security attributes.
- Cookie-based state-changing requests enforce CSRF protection.

### FR-03: Organization management

The application must support multiple independent organization workspaces.

Requirements:

- Allow authenticated users to create organizations.
- Automatically establish the creator's initial Admin membership.
- Allow users to view their organizations.
- Allow Admins to update organization details.
- Maintain independent organization membership and resources.

Acceptance criteria:

- An organization can be created successfully.
- Its creator becomes an Admin.
- Users can only list organizations where they have active membership.
- Only authorized Admins can update organization details.
- A user without membership cannot access organization resources.

### FR-04: Organization membership and invitations

The application must allow Admins to manage organization membership.

Requirements:

- List active members.
- Invite users by email.
- Support Admin, Responder, and Viewer roles.
- Allow valid invitations to be accepted.
- Allow Admins to change member roles.
- Allow Admins to remove members.
- Prevent removal or demotion of the last active Admin.

Acceptance criteria:

- Admins can invite members.
- Non-Admins cannot create invitations.
- Invitation tokens are securely generated.
- Invitations expire after a configured period.
- An invitation cannot be accepted more than once.
- The resulting membership has the assigned role.
- Members cannot be changed or removed by unauthorized users.
- Historical incident and audit records remain available after membership removal.

### FR-05: Service management

The application must allow organizations to register and manage their services.

Requirements:

- Create services.
- List services belonging to an organization.
- View individual service details.
- Update service details.
- Support service health states.
- Preserve historical incident references when services are archived or removed.

Initial service states:

- `operational`
- `degraded`
- `partial_outage`
- `major_outage`
- `maintenance`

Acceptance criteria:

- Admins can create services.
- Responders and Viewers cannot create or modify services.
- Service records always belong to one organization.
- Service updates are restricted to authorized Admins.
- Services cannot be accessed by users from unrelated organizations.
- Historical incidents are not destroyed by service archival.

### FR-06: Incident creation

The application must allow authorized users to report incidents.

Requirements:

- Provide an incident title.
- Provide a description.
- Select severity.
- Associate an incident with an organization-owned service.
- Record the creator.
- Set an initial lifecycle status.
- Record creation and update timestamps.

Severity levels:

| Severity | Description |
|---|---|
| SEV1 | Critical |
| SEV2 | High |
| SEV3 | Medium |
| SEV4 | Low |

Acceptance criteria:

- Admins and Responders can create incidents.
- Viewers cannot create incidents.
- Required fields are validated.
- The referenced service must belong to the same organization.
- The backend assigns the creator and initial status.
- The new incident appears in the organization's incident list.

### FR-07: Incident management

The application must allow authorized users to manage existing incidents.

Requirements:

- View incident details.
- Update permitted incident attributes.
- Change incident severity.
- Change incident service association when permitted.
- Assign an incident to an organization member.
- Validate incident lifecycle transitions.
- Record meaningful incident activity.

Initial incident lifecycle:

`investigating → identified → monitoring → resolved`

Acceptance criteria:

- Admins and Responders can update incidents.
- Viewers have read-only access.
- An incident cannot be assigned to a user outside its organization.
- Invalid lifecycle transitions are rejected.
- Successful status transitions are recorded.
- The system maintains accurate timestamps.
- Incident changes do not affect another organization's records.

### FR-08: Incident investigation timeline

The application must provide a chronological history of incident activity.

Requirements:

- Allow authorized users to add investigation updates.
- Record the author of each update.
- Record creation timestamps.
- Display updates in chronological order.
- Record lifecycle changes in the timeline.
- Preserve historical updates.

Acceptance criteria:

- Admins and Responders can add updates.
- Viewers can read updates but cannot create them.
- Each update is associated with the correct incident and organization.
- Timeline entries retain their original author and timestamp.
- Incident status changes appear in the history.
- Historical records cannot be silently overwritten through ordinary update operations.

### FR-09: Audit logging

The application must record important administrative and security-related activities.

Initial auditable events:

- User registration.
- Authentication events where appropriate.
- Organization creation and updates.
- Member invitations.
- Invitation acceptance.
- Role changes.
- Member removal.
- Service creation, updates, and archival.
- Incident creation and updates.
- Incident assignments.
- Incident lifecycle transitions.

Acceptance criteria:

- Relevant actions generate audit records.
- Each organization-owned audit record has an organization scope.
- Audit entries identify the actor and affected resource where applicable.
- Audit timestamps are recorded in UTC.
- Audit records are not editable through ordinary application operations.
- Sensitive information is excluded from audit metadata.
- Only authorized users can view organization audit logs.

### FR-10: Operational dashboard

The application must provide a dashboard summarizing organization operations.

Initial dashboard metrics:

- Total incidents.
- Open incidents.
- Resolved incidents.
- Incidents grouped by severity.
- Incidents grouped by status.
- Service health summary.
- Recent incident activity.

Acceptance criteria:

- Dashboard data belongs only to the selected organization.
- Metrics reflect the underlying records.
- Dashboard access requires valid membership.
- Users with different roles see only information they are authorized to access.
- Empty organizations display useful empty states rather than errors.

### FR-11: Incident analytics

The application must provide basic incident analytics.

Initial analytics:

- Incident counts by severity.
- Incident counts by status.
- Incident trends over a selected date range.
- Service-level incident distribution.

Acceptance criteria:

- Analytics queries are organization-scoped.
- Date filters are validated.
- Empty date ranges return valid empty results.
- Analytics totals are consistent with the underlying incident data.
- Users cannot retrieve analytics for organizations where they lack membership.

### FR-12: Health and readiness

The backend must expose operational health endpoints.

Requirements:

- Liveness endpoint.
- Readiness endpoint.
- Database connectivity check for readiness.
- Safe health response bodies.

Acceptance criteria:

- Liveness indicates whether the application process is running.
- Readiness indicates whether required dependencies are available.
- Database unavailability causes readiness failure.
- Health responses do not disclose credentials or internal infrastructure details.

---

## 4. Non-Functional Requirements

### NFR-01: Security

- Passwords must be hashed using Argon2id.
- Authentication must use secure server-managed sessions.
- Production cookies must use HttpOnly and Secure.
- CSRF protection must be enforced for cookie-based state-changing requests.
- Authorization must be enforced by the backend.
- Every tenant-owned query must enforce organization scope.
- Request data must be validated.
- Secrets must be supplied through environment configuration.
- Sensitive values must not appear in logs.
- Production traffic must use HTTPS.

### NFR-02: Tenant isolation

- Organizations must have independent logical data boundaries.
- Users must only access resources belonging to organizations where they have active membership.
- Every tenant-owned record must carry appropriate organization context.
- Cross-tenant relationships must be rejected.
- Database constraints must help preserve tenant consistency.
- Tests must verify that direct object-ID manipulation cannot bypass tenant isolation.

### NFR-03: Performance

Initial development targets:

- Typical API read operations should aim for a response time below 500 ms under normal local or test conditions.
- Typical API write operations should aim for a response time below 1 second under normal local or test conditions.
- Dashboard queries should avoid unnecessary repeated database queries.
- Pagination must be used for potentially large collections.
- Database indexes must support common filtering and lookup patterns.

These are initial engineering targets, not production service-level guarantees.

### NFR-04: Reliability and data integrity

- Database operations involving related records must use appropriate transactions.
- Failed operations must not leave partially created business records.
- Foreign-key and uniqueness constraints must be respected.
- Migrations must be repeatable and version-controlled.
- Errors must be handled consistently.
- Historical incident and audit information must be preserved.

### NFR-05: Maintainability

- Backend code must use modular application boundaries.
- Frontend components must be organized by feature or responsibility.
- Business logic must not be unnecessarily duplicated.
- Configuration must be separated from source code.
- Code formatting and linting must be automated.
- API contracts and architecture documents must remain synchronized.

### NFR-06: Usability and accessibility

- Navigation must be consistent.
- Forms must provide useful validation feedback.
- Loading and error states must be visible.
- Destructive actions must require appropriate confirmation.
- Empty states must explain what users can do next.
- Important controls must be keyboard accessible.
- Color must not be the only way to communicate severity or status.

### NFR-07: Observability

- Application logs must be structured.
- Errors must be recorded with useful diagnostic context.
- Sensitive information must be excluded.
- Basic application metrics must be exposed where appropriate.
- Prometheus and Grafana will support initial monitoring and visualization.

---

## 5. User Stories

### US-01: Account registration

As a new user, I want to create an account so that I can access OpsHub.

Acceptance:

- Valid registration creates an account.
- Invalid registration displays useful errors.
- Duplicate email addresses are rejected.

### US-02: Secure login

As a registered user, I want to log in securely so that I can access my organization workspace.

Acceptance:

- Valid credentials authenticate the user.
- Invalid credentials are rejected.
- Logout terminates the session.

### US-03: Organization creation

As a user, I want to create an organization so that I can manage my team's incidents independently.

Acceptance:

- Organization creation succeeds.
- Creator receives Admin membership.
- Organization data remains isolated.

### US-04: Invite team members

As an Admin, I want to invite team members so that they can participate in incident management.

Acceptance:

- Invitations are created with assigned roles.
- Valid invitations can be accepted.
- Expired and reused invitations are rejected.

### US-05: Manage services

As an Admin, I want to register our services so that the team can associate incidents with the affected systems.

Acceptance:

- Services can be created and updated.
- Service ownership is organization-scoped.
- Historical incident relationships are preserved.

### US-06: Report an incident

As a Responder, I want to report an incident so that the team can investigate an operational problem.

Acceptance:

- Required incident details are captured.
- Severity is assigned.
- Incident appears in the incident list.

### US-07: Assign an incident

As a Responder, I want to assign an incident to a team member so that investigation responsibilities are clear.

Acceptance:

- Valid organization members can be assigned.
- External users cannot be assigned.

### US-08: Investigate an incident

As a Responder, I want to add investigation updates so that the team can follow progress.

Acceptance:

- Updates record their author and timestamp.
- Timeline displays entries chronologically.

### US-09: Resolve an incident

As a Responder, I want to move an incident through its lifecycle so that the team knows its current operational state.

Acceptance:

- Valid transitions succeed.
- Invalid transitions are rejected.
- Status changes appear in the incident history.

### US-10: Monitor operations

As a Viewer, I want to view the dashboard so that I can understand current operational health without changing records.

Acceptance:

- Dashboard displays organization-level metrics.
- Viewer cannot perform restricted write operations.

### US-11: Review audit activity

As an Admin, I want to review audit logs so that I can understand important organization activities.

Acceptance:

- Authorized Admins can view audit records.
- Unauthorized users cannot access restricted audit data.

---

## 6. User Interface Requirements

The React frontend must provide the following initial application areas.

### 6.1 Public pages

- Registration page.
- Login page.

### 6.2 Authenticated application

- Main application layout.
- Organization selector.
- Dashboard.
- Services list.
- Service details.
- Incident list.
- Incident creation form.
- Incident details.
- Incident investigation timeline.
- Team member management.
- Invitation management.
- Analytics.
- Audit logs.
- Organization settings.

### 6.3 Interface behavior

- Navigation must reflect the user's role.
- Unauthorized actions must not be presented as available actions.
- Backend authorization remains mandatory even when UI elements are hidden.
- Forms must show field-level validation errors.
- Loading states must be provided for asynchronous operations.
- Failed requests must show understandable error messages.
- Empty lists must provide helpful guidance.
- Destructive actions must require confirmation.
- The interface must be responsive across desktop, tablet, and mobile layouts.

---

## 7. Testing Requirements

Testing must verify functional correctness, authorization, tenant isolation, and data integrity.

### 7.1 Backend unit tests

Test:

- Password hashing and verification.
- Validation rules.
- Role and permission checks.
- Incident lifecycle transitions.
- Invitation expiration and acceptance.
- Business logic for service and incident operations.

### 7.2 Backend integration tests

Test:

- Authentication endpoints.
- Organization management.
- Membership and invitation workflows.
- Service endpoints.
- Incident endpoints.
- Incident timeline.
- Audit logs.
- Analytics.
- Database transaction behavior.

### 7.3 Tenant isolation tests

Create at least two independent organizations with different users.

Verify:

- Organization A cannot list Organization B's services.
- Organization A cannot read Organization B's incidents.
- Organization A cannot update Organization B's incidents.
- Organization A cannot access Organization B's audit logs.
- A user cannot assign an incident to a member of another organization.
- Guessing or obtaining another organization's UUID does not bypass authorization.

These are mandatory security tests.

### 7.4 Role-based access tests

Verify that:

- Admin can perform all permitted operations.
- Responder can perform incident-related operations.
- Viewer can only perform read operations.
- Non-Admins cannot manage organization membership.
- Unauthorized operations return the documented HTTP status.

### 7.5 Frontend tests

Test:

- Form validation.
- Authentication flows.
- Role-aware navigation.
- Incident creation and updates.
- Loading and error states.
- Empty states.
- Dashboard rendering.

### 7.6 End-to-end tests

The initial end-to-end workflow must cover:

1. Register a user.
2. Log in.
3. Create an organization.
4. Create a service.
5. Invite a team member.
6. Accept an invitation.
7. Create an incident.
8. Assign the incident.
9. Add an investigation update.
10. Change incident status.
11. Resolve the incident.
12. Verify timeline and audit history.
13. Verify dashboard metrics.
14. Confirm cross-tenant restrictions.

---

## 8. MVP Scope and Exclusions

### 8.1 Included in MVP

- User registration and authentication.
- Server-managed sessions.
- Organizations and workspaces.
- Organization memberships.
- Role-based authorization.
- Member invitations.
- Service management.
- Incident creation and management.
- Incident assignment.
- Incident lifecycle transitions.
- Incident investigation timeline.
- Audit logs.
- Operational dashboard.
- Basic incident analytics.
- Backend health and readiness endpoints.
- Automated tests.
- Docker-based local development.
- GitHub Actions CI.
- Prometheus and Grafana monitoring foundations.

### 8.2 Explicitly excluded from MVP

- Billing and subscription management.
- AI incident analysis.
- AI-generated remediation suggestions.
- Advanced on-call scheduling.
- Complex third-party alert integrations.
- Public status pages.
- Advanced notification routing.
- Microservices architecture.
- Enterprise SSO and SAML.
- Advanced custom reporting.

These features may be considered after the MVP is functional, tested, and documented.

---

## 9. Definition of Done

The MVP is considered complete only when all applicable criteria below are satisfied.

### 9.1 Functional completion

- [ ] User registration works.
- [ ] Login and logout work.
- [ ] Organization creation works.
- [ ] Organization membership works.
- [ ] Invitations can be created and accepted.
- [ ] Role management works.
- [ ] Service management works.
- [ ] Incident creation works.
- [ ] Incident assignment works.
- [ ] Incident status transitions work.
- [ ] Incident timeline works.
- [ ] Audit logging works.
- [ ] Dashboard displays correct metrics.
- [ ] Basic analytics work.

### 9.2 Security completion

- [ ] Passwords are hashed securely.
- [ ] Sessions are protected.
- [ ] CSRF protection is implemented.
- [ ] Backend role authorization is enforced.
- [ ] Tenant isolation is enforced.
- [ ] Cross-tenant access tests pass.
- [ ] Secrets are not committed to Git.
- [ ] Sensitive information is excluded from logs.

### 9.3 Engineering completion

- [ ] Database migrations work.
- [ ] Backend unit tests pass.
- [ ] Backend integration tests pass.
- [ ] Frontend tests pass.
- [ ] Critical end-to-end workflow passes.
- [ ] Linting and formatting checks pass.
- [ ] Docker-based development environment works.
- [ ] GitHub Actions CI passes.
- [ ] Application startup and health checks work.

### 9.4 Documentation completion

- [ ] README contains setup instructions.
- [ ] Architecture documentation is accurate.
- [ ] Database documentation matches implementation.
- [ ] API documentation matches implementation.
- [ ] Environment variables are documented.
- [ ] Testing instructions are documented.
- [ ] Known limitations are documented.

### 9.5 Release readiness

- [ ] No known critical security defects remain.
- [ ] No unresolved critical functional defects remain.
- [ ] Application can be started using documented instructions.
- [ ] Database can be initialized from migrations.
- [ ] A new developer can follow the setup documentation.
- [ ] Repository is clean and all intended changes are committed.

---

## 10. Requirement Traceability

The following table connects the main requirements to the architecture and implementation areas.

| Requirement | Main implementation area | Verification |
|---|---|---|
| Registration and authentication | Auth module | Auth tests |
| Organizations | Organization module | Organization tests |
| Membership and invitations | Membership module | Authorization tests |
| Services | Service module | Service tests |
| Incidents | Incident module | Incident tests |
| Incident timeline | Incident updates module | Timeline tests |
| Audit logging | Audit module | Audit tests |
| Dashboard | Analytics module and frontend | Dashboard tests |
| Tenant isolation | Backend and database | Cross-tenant tests |
| Monitoring | Health endpoints and metrics | Health checks |

---

## 11. Future Evolution

After the MVP meets its definition of done, potential improvements include:

- Email and notification integrations.
- Incident alert ingestion.
- Advanced incident analytics.
- On-call scheduling.
- Public service status pages.
- AI-assisted incident investigation.
- Billing and subscription management.
- Enterprise authentication.
- Advanced observability integrations.

Future capabilities must be evaluated against security, operational complexity, and maintainability before implementation.

---

## 12. Final Acceptance Statement

OpsHub MVP is accepted when the core incident management workflow operates reliably for multiple independent organizations, with correct role-based permissions, enforced tenant isolation, accurate incident history, and verified automated tests.

A feature is not considered complete merely because its user interface exists. Its backend behavior, authorization, data integrity, error handling, and relevant tests must also be complete.

This document is the baseline for MVP development and must be updated when approved product requirements change.
