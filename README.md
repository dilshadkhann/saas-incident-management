# OpsHub

**Multi-tenant SaaS incident management platform**

OpsHub is a web-based incident management platform designed to help engineering teams monitor services, coordinate incident response, track investigations, and maintain operational visibility across organizations.

Built with React, TypeScript, FastAPI, PostgreSQL, and Docker.

## Project Status

**Current milestone:** Application Foundation

The initial application foundation is under development. Authentication, organization management, incident workflows, and operational analytics are planned for subsequent implementation stages.

## Core Capabilities

The planned MVP includes:

- User authentication and session management
- Multi-organization workspaces
- Organization membership and role-based access control
- Service health monitoring
- Incident creation, assignment, investigation, and resolution
- Incident activity timelines
- Audit logging
- Operational dashboards and analytics

## Technology Stack

| Area                | Technology                       |
| ------------------- | -------------------------------- |
| Frontend            | React, TypeScript, Vite          |
| Styling             | Tailwind CSS                     |
| Routing             | React Router                     |
| Frontend testing    | Vitest, React Testing Library    |
| Backend             | Python, FastAPI                  |
| Database            | PostgreSQL                       |
| ORM                 | SQLAlchemy                       |
| Database migrations | Alembic                          |
| Backend validation  | Pydantic                         |
| Backend testing     | Pytest                           |
| Code quality        | ESLint, Ruff, Prettier           |
| Infrastructure      | Docker Compose                   |
| CI/CD               | GitHub Actions (planned)         |
| Monitoring          | Prometheus and Grafana (planned) |

## Architecture

OpsHub follows a **modular monolith architecture**.

The frontend is a single React application with role-based experiences. The backend exposes a REST API and enforces authentication, authorization, and organization-level data isolation.

Tenant-owned resources are scoped to their organization to prevent cross-organization data access.

Detailed architecture documentation:

- [System Design](docs/architecture/system-design.md)
- [Database Design](docs/architecture/database-design.md)
- [API Specification](docs/architecture/api-specification.md)
- [MVP Requirements](docs/architecture/mvp-requirements.md)
- [Development Standards](docs/development/project-structure-and-standards.md)

## Project Structure

```text
opshub/
├── apps/
│   ├── api/              # FastAPI backend
│   └── web/              # React frontend
├── docs/
│   ├── architecture/     # Architecture and API documentation
│   └── development/      # Development standards
├── infra/
│   └── monitoring/       # Monitoring configuration
├── scripts/              # Development and maintenance scripts
├── .github/
│   └── workflows/        # CI/CD workflows
├── .env.example
├── compose.yaml
└── README.md
```

## Prerequisites

Install the following tools before starting development:

- Git
- Python 3.12
- Node.js 24 LTS
- npm
- Docker Desktop with Docker Compose

## Local Development Setup

### 1. Clone the repository

```powershell
git clone https://github.com/dilshadkhann/saas-incident-management.git
cd saas-incident-management
```

### 2. Configure environment variables

```powershell
Copy-Item .env.example .env
```

Update `.env` with secure local development credentials.

Never commit `.env` or expose its contents.

### 3. Start PostgreSQL

```powershell
docker compose up -d db
```

Check database status:

```powershell
docker compose ps
```

### 4. Set up the backend

Create a Python virtual environment:

```powershell
py -3.12 -m venv apps\api\.venv
```

Install dependencies:

```powershell
.\apps\api\.venv\Scripts\python.exe -m pip install -e ".\apps\api[dev]"
```

Start the API:

```powershell
.\apps\api\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir apps\api --reload
```

Backend endpoints:

- API: http://127.0.0.1:8000
- Swagger documentation: http://127.0.0.1:8000/docs
- Liveness: http://127.0.0.1:8000/health/live
- Readiness: http://127.0.0.1:8000/health/ready

### 5. Set up the frontend

Install dependencies:

```powershell
npm.cmd --prefix apps/web install
```

Start the frontend:

```powershell
npm.cmd --prefix apps/web run dev
```

Frontend: http://localhost:5173

## Testing and Quality Checks

### Backend

Run tests:

```powershell
.\apps\api\.venv\Scripts\python.exe -m pytest apps\api\tests -v
```

Run Ruff lint:

```powershell
.\apps\api\.venv\Scripts\ruff.exe check apps\api\app apps\api\tests
```

Check formatting:

```powershell
.\apps\api\.venv\Scripts\ruff.exe format --check apps\api\app apps\api\tests
```

Check dependency integrity:

```powershell
.\apps\api\.venv\Scripts\python.exe -m pip check
```

### Frontend

Run tests:

```powershell
npm.cmd --prefix apps/web run test
```

Run lint:

```powershell
npm.cmd --prefix apps/web run lint
```

Check formatting:

```powershell
npm.cmd --prefix apps/web run format:check
```

Create a production build:

```powershell
npm.cmd --prefix apps/web run build
```

Check dependency vulnerabilities:

```powershell
npm.cmd --prefix apps/web audit
```

## Security Principles

- Passwords must be stored using secure password hashing.
- Authentication cookies must use appropriate security attributes.
- Protected API operations must enforce authorization.
- Organization-scoped queries must prevent cross-tenant access.
- Secrets must be provided through environment variables.
- Audit logs must capture important security and operational events.

## Development Workflow

Development follows milestone-based implementation:

1. Architecture and planning
2. Application foundation
3. Authentication and organization management
4. Services and incident management
5. Audit logs and analytics
6. Production readiness and deployment

Changes are developed on feature branches and reviewed through pull requests.

## License

License information will be added when the project license is selected.
