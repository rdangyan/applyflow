# ApplyFlow

ApplyFlow is a portfolio-quality job-search workspace. The repository contains the issue #1 walking skeleton plus the issue #2 identity slice: registration, sign-in, protected routing, reload restoration, current-user retrieval, and sign-out.

The feature surface is intentionally narrow. Refresh-token rotation and device management, companies, applications, interviews, reminders, and analytics belong to later issues and are not implemented here.

## Architecture

- `frontend/` — React 19, TypeScript, Vite, and Material UI. The UI calls the API through generated TypeScript bindings in `frontend/src/generated`.
- `backend/` — Java 21, Spring Boot 3.5, Flyway, JPA/Hibernate validation, PostgreSQL, Actuator, and Springdoc OpenAPI.
- Production artifact — the frontend build is copied into the Spring Boot JAR and served from the same origin as `/api/v1`.
- Database ownership — Flyway is the only schema mutation mechanism. Hibernate uses `ddl-auto: validate` and cannot update the schema.

## Prerequisites

- Java 21
- Node.js 22+ and npm 10+
- Docker with Compose (for PostgreSQL or fully containerized startup)

The checked-in Maven scripts download Maven 3.9.11 on first use, so a global Maven installation is not required.

## Local development

Start PostgreSQL:

```sh
docker compose up -d postgres
```

Install frontend dependencies and generate the API client:

```sh
npm run install:frontend
npm run generate:api
```

Start the backend (PowerShell):

```powershell
backend\mvnw.cmd -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=local
```

In another terminal, start Vite:

```sh
npm --prefix frontend run dev
```

Open <http://localhost:5173>. Vite proxies API, health, and API-documentation paths to Spring Boot.

To exercise the single production artifact locally, build it and run the JAR while PostgreSQL is available:

```sh
npm run build
java -jar backend/target/applyflow.jar
```

Then open <http://localhost:8080>.

## Containerized startup

Build and start both services:

```sh
docker compose up --build
```

Open <http://localhost:8080>. Database data is retained in the `applyflow-postgres` named volume.

## Public inspection endpoints

- Browser-to-database status: <http://localhost:8080/api/v1/system/status>
- Registration: `POST /api/v1/auth/register`
- Sign-in: `POST /api/v1/auth/login`
- Reload restoration: `POST /api/v1/auth/refresh`
- Current user: `GET /api/v1/auth/me`
- Sign-out: `POST /api/v1/auth/logout`
- OpenAPI JSON: <http://localhost:8080/api-docs>
- Swagger UI: <http://localhost:8080/swagger-ui.html>
- Liveness: <http://localhost:8080/actuator/health/liveness>
- Readiness: <http://localhost:8080/actuator/health/readiness>

Only Actuator health is exposed, and health details are suppressed. API errors use Problem Details with a stable error code, timestamp, and `traceId`; the same trace identifier is returned as `X-Trace-Id` and included in structured logs. Request bodies, credentials, cookies, and secrets are not logged.

## Checks

Run the CI-equivalent checks:

```sh
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm run check:api
npm run test:backend
npm run build
```

`npm run build` creates `backend/target/applyflow.jar`, the combined production artifact.

## Configuration

The application reads environment variables and defaults to the local Compose database:

| Variable | Default |
| --- | --- |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/applyflow` |
| `DATABASE_USERNAME` | `applyflow` |
| `DATABASE_PASSWORD` | `applyflow` |
| `JWT_SECRET` | local development secret; set a strong secret in hosted environments |
| `REFRESH_COOKIE_SECURE` | `false`; set to `true` for HTTPS deployments |
| `VITE_API_BASE_URL` | empty (same origin) |

Do not commit production credentials. The local defaults are for development only.
