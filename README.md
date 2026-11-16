# nextjs-multivendor-marketplace

A REST API for a small marketplace. Users sign up, vendors register shops and list products, and customers place orders that vendors then fulfil.

Built with **Next.js 15** (App Router route handlers), **Prisma 6** and **PostgreSQL**, in TypeScript. An animated web UI that covers every API scenario lives in [`frontend/`](frontend/), as a separate Next.js app.

## Features

- **JWT authentication.** Tokens are signed with `jose` and passwords are hashed with scrypt.
- **Role-based access control** for five roles: `USER`, `CUSTOMER`, `VENDOR`, `ADMIN` and `SUPERADMIN`. The rules are defined in one place and enforced in middleware.
- **Ownership rules.** Vendors manage only the shops they own and see only their own products and orders.
- **Orders split by vendor.** A basket with products from several shops becomes one order per vendor.
- **Request validation** with Zod. Errors map to consistent HTTP status codes: `400` validation, `403` permission, `404` not found, `500` for anything unexpected (such as the database being down), with details logged but never sent to the client.
- **Hexagonal architecture** (ports and adapters): the business rules live in `core/` with no framework imports, and Prisma, scrypt, jose and HTTP plug in as adapters. See [Architecture](#architecture).
- **Web frontend** for every role: shop and basket, orders and delivery tracking, shop management, and user and catalog administration. Available in English and French.
- **Live demo** at `/demo`: try the frontend as a customer, vendor or admin on sample data, without an account or a database.
- **Interactive API docs** on the API's home page (<http://localhost:3001/>), where you can log in and try every endpoint. The OpenAPI 3.1 spec is generated from the code (Zod schemas, access rules), so it can't drift from the API. The frontend also shows it in Swagger UI at `/docs`.
- **Docker setup** with PostgreSQL, a migration job, the API and the frontend, each as a standalone Next.js build.

## Tech stack

| Layer          | Technology                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime        | [Node.js](https://nodejs.org/), [TypeScript](https://www.typescriptlang.org/) 5                                                      |
| Framework      | [Next.js](https://nextjs.org/) 15 (App Router route handlers and middleware), [React](https://react.dev/) 19                        |
| Database       | [PostgreSQL](https://www.postgresql.org/) 16, accessed through [Prisma](https://www.prisma.io/) 6                                   |
| Authentication | [jose](https://github.com/panva/jose) (JWT, HS256); passwords hashed with scrypt from Node's built-in `crypto`                      |
| Validation     | [Zod](https://zod.dev/) 4                                                                                                            |
| Logging        | [winston](https://github.com/winstonjs/winston)                                                                                      |
| Frontend       | Next.js 15 and React 19, [Tailwind CSS](https://tailwindcss.com/) 4, [Motion](https://motion.dev/) for animation, [Lucide](https://lucide.dev/) icons |
| API docs       | [OpenAPI](https://www.openapis.org/) 3.1 generated from the code, rendered with [Scalar](https://scalar.com/) (API) and [Swagger UI](https://swagger.io/tools/swagger-ui/) (frontend) |
| Testing        | [Jest](https://jestjs.io/) 29, [next-test-api-route-handler](https://github.com/Xunnamius/next-test-api-route-handler); [Cypress](https://www.cypress.io/) 15 for end-to-end tests |
| Tooling        | [pnpm](https://pnpm.io/), [ESLint](https://eslint.org/) 9, [Docker](https://www.docker.com/) and Docker Compose                       |

## API overview

| Area     | Endpoints                                                   | Description                                                                          |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Auth     | `POST /api/auth`<br>`POST /api/auth/newaccount`             | Log in to get a JWT; sign up as `CUSTOMER` (default) or `VENDOR`                     |
| Users    | `/api/user`<br>`/api/user/[cuid]`                           | User management for admins. Responses never include passwords or tokens              |
| Vendors  | `/api/vendor`<br>`/api/vendor/[cuid]`<br>`/api/vendor/register` | A logged-in user registers a shop and becomes its owner                              |
| Products | `/api/product`<br>`/api/product/[cuid]`                     | Vendors add products only to shops they own; a vendor's list shows only its products |
| Orders   | `/api/order`<br>`/api/order/[cuid]`<br>`/api/order/[cuid]/updateDelivery` | One order per vendor; the shop's owner updates the delivery status                   |
| Logs     | `POST /api/logs`                                            | Stores log entries; protected by a shared secret instead of a JWT                    |

### Interactive docs

Open <http://localhost:3001/> for the full reference: every endpoint with its request body, responses, errors and the roles allowed to call it. To try calls there, log in with `POST /api/auth`, then paste `Bearer: TOKEN <token>` into **Authentication → Value** (top right) and use **Test Request**.

The raw OpenAPI 3.1 document is at <http://localhost:3001/openapi.json>. It is built in `adapters/http/openapi.ts`:

- request bodies come from the Zod schemas the routes validate with;
- each endpoint's allowed roles are worked out from the access rules the middleware enforces;
- `adapters/http/openapi.test.ts` fails if a route handler is added or removed without updating the docs, if a response schema stops matching the real DTOs, or if an example would fail validation.

The page loads [Scalar](https://scalar.com/) from jsdelivr, falling back to unpkg, pinned to one version with an integrity hash (see `app/route.ts` to upgrade it). If neither CDN is reachable, it links to the raw document.

A ready-made [Insomnia](https://insomnia.rest/) request collection is in [`insomnia/`](insomnia/).

### Authentication

Get a token from `POST /api/auth`:

```bash
curl -X POST http://localhost:3001/api/auth \
  -H "content-type: application/json" \
  -d '{"email": "you@example.com", "password": "your-password"}'
```

Then send it on every request. The header format is non-standard: note the literal `TOKEN ` after `Bearer:`.

```
authorization: Bearer: TOKEN <jwt>
```

Tokens expire after 20 minutes, or after one year for admin roles.

## Getting started

### Prerequisites

- Node.js 20 or newer
- [pnpm](https://pnpm.io/) 10
- Docker (for PostgreSQL)

### Environment

Copy the templates, then fill in the two secrets in `.env`:

```bash
cp .env.example .env            # development, Prisma CLI, seed, Docker api service
cp .env.test.example .env.test  # Jest: separate nextjs_multivendor_marketplace_test database, test-only secrets

# Generate each secret with:
openssl rand -base64 48
```

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | everything | From your machine the Docker database is on port 5434. Inside Docker, `docker-compose.yml` overrides it. |
| `AUTH_SECRET` | signing tokens | Changing it signs everyone out. |
| `LOG_TOKEN_SECRET` | `POST /api/logs` | Shared with the server's logger. |
| `LOG_LEVEL` | optional | Default `debug`. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | optional, Docker | Credentials for the `db` service; keep `DATABASE_URL` in sync. |

`.env` and `.env.test` are git-ignored; only the `*.example` templates are committed.

### Option 1: everything in Docker

```bash
docker compose up -d --build
```

This starts four services:

| Service    | URL                     | Description                                                       |
| ---------- | ----------------------- | ----------------------------------------------------------------- |
| `frontend` | <http://localhost:3000> | The web UI and the API docs at `/docs`                            |
| `api`      | <http://localhost:3001> | The REST API; its home page is the interactive API reference     |
| `db`       | `localhost:5434`        | PostgreSQL                                                        |
| `migrate`  |                         | Applies the migrations, then exits                                |

The browser only talks to the frontend. It forwards every `/api/*` request to the `api` service (set by `API_URL`), so both apps share one origin and no CORS setup is needed. `/api/*` also works on port 3000.

### Option 2: local development

```bash
pnpm install
docker compose up -d db   # PostgreSQL only
pnpm db:deploy            # apply migrations
pnpm db:seed              # optional: load demo data
pnpm dev                  # API on http://localhost:3001
```

In a second terminal, start the frontend:

```bash
cd frontend
pnpm install
pnpm dev                  # UI on http://localhost:3000
```

The frontend forwards `/api/*` to `http://localhost:3001` by default; set `API_URL` to point it elsewhere.

## Demo

<http://localhost:3000/demo> lets anyone see the frontend from each role's side without signing up. It is linked from the landing page and the footer.

| View              | Signed in as                     | Starts on  | Pages                                     |
| ----------------- | -------------------------------- | ---------- | ----------------------------------------- |
| `/demo/customer`  | `camille@demo.shop` (CUSTOMER)   | Shop       | Shop, basket and checkout, orders         |
| `/demo/vendor`    | `victor@demo.shop` (VENDOR)      | My shops   | My shops, products, incoming orders       |
| `/demo/admin`     | `ada@demo.shop` (SUPERADMIN)     | All orders | Orders, users, catalog                    |

- **Real pages, sample data.** The demo routes re-export the real pages. A demo session provider swaps the API client for an in-memory stand-in (`frontend/lib/demo/store.ts`) that holds 8 users, 4 shops, 9 products and 7 orders. It applies the same access rules as the API, so buttons appear and actions fail exactly as they would for that role.
- **Nothing is saved.** Changes last until the page is reloaded. The banner's **Reset** button does exactly that. The demo never calls the API, so it works even when the API and database are down.
- **Banner.** A strip above the navigation says it's a demo, switches between views (staying on the same page when the other role has it, such as Orders), resets the data, and exits back to `/demo`.
- The admin view uses SUPERADMIN so that every edit and delete action is visible. Change `DEMO_IDENTITY` in `store.ts` to show a plain ADMIN instead.

## Scripts

| Command                  | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `pnpm dev`               | Start the API development server on port 3001                |
| `pnpm build` / `start`   | Production build and server                                  |
| `pnpm test`              | Run the API test suite (Jest)                                |
| `pnpm e2e` (in `frontend/`) | Run the end-to-end tests (Cypress)                       |
| `pnpm lint`              | Lint the project                                             |
| `pnpm typecheck`         | Typecheck the API                                            |
| `pnpm commitlint`        | Check this branch's commit messages against `origin/main`    |
| `pnpm db:migrate`        | Create and apply a new migration (development)               |
| `pnpm db:deploy`         | Apply pending migrations                                     |
| `pnpm db:seed`           | Load the demo data from `prisma/seed.sql`                    |
| `pnpm db:hash-passwords` | Hash any passwords still stored in plain text                |
| `pnpm db:studio`         | Open Prisma Studio                                           |

## Testing

```bash
pnpm test
```

The tests use Jest and need the PostgreSQL container running.

- **Route tests** run against a separate `nextjs_multivendor_marketplace_test` database, configured in `.env.test`. It is rebuilt from the migrations on every run, so your development data is never touched. Each test creates its own records through the factories in `__test__/helpers/`.
- **Access-control tests** in `middleware.test.ts` check every role against every protected endpoint.
- **Use-case tests** in `core/application/*.test.ts` cover the business rules without a database. Each use case gets mock repositories from `__test__/helpers/mockRepositories.ts`, the real scrypt hasher, and a fake token issuer where it needs one.
- **Adapter tests**:
  - `adapters/persistence/prisma/errors.test.ts`: how Prisma errors become core errors or a 500.
  - `adapters/persistence/prisma/unitOfWork.test.ts`: against the test database, a failed write rolls back the earlier ones.
  - `adapters/http/accessRules.test.ts`: the role rules.
  - `adapters/http/openapi.test.ts`: the API docs match the routes, DTOs, validation and access rules.
  - `adapters/security/password.test.ts`: hashing.
- **Contract test** in `__test__/frontend-contract.test.ts` checks that the frontend's copy of the access rules gives the same answers as the API's. A type check (`pnpm exec tsc --noEmit`) also confirms that the frontend's response types match the response DTOs in `adapters/http/dto.ts`.

For an end-to-end check against a running API, use `./scripts/smoke-test.sh` (defaults to `http://localhost:3001`).

### End-to-end tests (frontend)

Cypress tests in `frontend/cypress/e2e/` drive the frontend in a real browser. Start the stack first (`docker compose up -d --build`), then:

```bash
cd frontend
pnpm exec cypress install   # once per machine: downloads the Cypress binary
pnpm e2e                    # all specs, headless
pnpm e2e:demo               # only the specs that don't need the API
pnpm e2e:open               # interactive runner
```

| Spec                   | Needs    | Covers                                                                                      |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `landing.cy.ts`        | frontend | Language switch, scroll cue, gallery, demo link, no sideways scroll on 320px phones   |
| `demo-chooser.cy.ts`   | frontend | View cards, each view's start page, 404 for unknown views, view switcher, exit and sign-out |
| `demo-customer.cy.ts`  | frontend | Search and shop filter, out-of-stock items, checkout split into one order per shop, Reset   |
| `demo-vendor.cy.ts`    | frontend | Own shops only, adding a product, opening a shop (duplicate names refused), delivery update |
| `demo-admin.cy.ts`     | frontend | All orders and details, editing and deleting users, catalog deletes and their refusals      |
| `auth.cy.ts`           | API      | Redirect to sign-in and back, sign-up, sign-out, form checks, duplicate email, wrong password |

- The tests run against <http://localhost:3000>; set `CYPRESS_BASE_URL` to test another address.
- `auth.cy.ts` uses the real API and the development database. It creates accounts named `e2e-…@example.test` and deletes them afterwards with `docker exec` on the `nextjs-multivendor-marketplace-db-1` container (override with `CYPRESS_dbContainer`, `CYPRESS_dbUser` and `CYPRESS_dbName`). It is skipped when the API is down.
- Every test starts in English, and the gallery's remote photos are blocked, so runs don't depend on the network.
- The Cypress files are excluded from the frontend's type check and Docker image.

## Contributing

### Branches and commits

- **Branch names:** `<type>/<description>`, lowercase, e.g. `feature/add-cart-summary` or `bugfix/fix-login-redirect`. Types: `feature`, `bugfix`, `hotfix`, `refactor`, `chore`, `docs`, `test`, `experiment`, `release`. Commits on `main` are refused; work on a branch and merge it. Check a name with `scripts/check-branch-name.sh <name>`.
- **Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/), `type(scope): subject`, e.g. `feat(core): split orders per shop`. Usual scopes: `core`, `adapters`, `http`, `api`, `db`, `docs`, `frontend`, `e2e`, `docker`, `ci`, `deps` (another scope is a warning, not an error). The commit-msg hook checks the format locally; CI checks every commit of a pull request with commitlint (`commitlint.config.mjs`).

### Git hooks

`pnpm install` installs them (with [Husky](https://typicode.github.io/husky/)):

| Hook | Runs | Time |
| --- | --- | --- |
| `commit-msg` | The first line matches `type(scope): description`. It also refuses local merge commits named `Merge branch …`, so fast-forward, or reword the message (`chore: merge feature/x`) | instant |
| `pre-commit` | Branch-name check (refuses `main`), then `npm run precommit`: ESLint `--fix` on the staged files of each app ([lint-staged](https://github.com/lint-staged/lint-staged)) | a few seconds |
| `pre-push` | Branch-name check (here `main` is allowed, so merged work can be pushed), then a typecheck of the API and the frontend | a few seconds |

The tests aren't in the hooks, because they need the database; CI runs them. To skip the hooks once (e.g. a work-in-progress commit), use `git commit --no-verify`. CI still checks everything.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

| Job | Checks |
| --- | --- |
| Commit and branch conventions (pull requests only) | Every commit in the PR passes commitlint; the branch name follows the convention |
| API | Lint, typecheck, the Jest suite against a PostgreSQL service, production build |
| Frontend | Lint, typecheck, production build, then the Cypress landing and demo specs against the built app (they need no API) |

`auth.cy.ts` isn't run in CI, because it needs the API and its database; run it locally with `pnpm e2e`.

### Releases and changelog

Releases are automated with [release-please](https://github.com/googleapis/release-please) (`.github/workflows/release-please.yml`). Nobody edits `CHANGELOG.md` by hand.

1. Merge pull requests into `main` as usual.
2. release-please opens, then keeps updating, a **release PR** (`chore(main): release x.y.z`). It bumps the version in `package.json` and `frontend/package.json` and adds the new section to `CHANGELOG.md`.
3. When you want to release, merge the release PR. That creates the tag (`v0.2.0`) and the GitHub Release.

The commit types decide the version bump. While the version is below 1.0.0, a breaking change (`feat!:`) bumps the minor version instead of jumping to 1.0.0.

| Commit | Bump | Changelog section |
| --- | --- | --- |
| `feat` | minor | Features |
| `fix`, `perf` | patch | Bug Fixes, Performance |
| `feat!`, `fix!`, or a `BREAKING CHANGE:` footer | major | flagged as breaking |
| `docs`, `refactor`, `revert` | patch | Documentation, Refactoring, Reverts |
| `test`, `build`, `ci`, `chore`, `style` | none on their own | hidden |

The API docs read their version from `package.json`, so <http://localhost:3001/> shows each new version as soon as it's released.

**Setup, once:** enable *Settings → Actions → General → Allow GitHub Actions to create and approve pull requests*. The first release PR will be `0.1.0`, covering everything so far.

**Squash merges:** if you squash pull requests, only the PR title reaches `main`, so the title must follow the commit convention too.

**CI on the release PR:** pull requests opened with the default `GITHUB_TOKEN` don't trigger other workflows, so CI doesn't run on the release PR. It only changes version numbers and the changelog, which is fine. To have CI run anyway, give the action a personal access token (`token:` input).

## Architecture

The API follows a **hexagonal architecture** (ports and adapters). The core holds the business rules and depends on nothing outside itself; everything else plugs into it through ports.

```
                 driving side                         driven side
   HTTP request ──► app/api/**/route.ts ──┐      ┌──► adapters/persistence/prisma ──► PostgreSQL
   (middleware.ts checks token + role)    │      │
                                          ▼      │
                        ┌──────────────────────────────────┐
                        │ core/                            │
                        │   application/  use cases        │──► adapters/security/password.ts (scrypt)
                        │   domain/       entities, errors │
                        │   ports/        interfaces ──────│──► adapters/security/jwt.ts (jose)
                        └──────────────────────────────────┘
                                 wired together in container.ts
```

- **Core** (`core/`), with no imports from Next.js, Prisma, Zod, jose, winston or Node built-ins. ESLint resolves every import in `core/` to a file, so the build fails whether the import is written as `@/adapters/...`, `../../adapters/...` or a package name. A second rule stops adapters importing `container.ts`.
  - `domain/`: entities (`User`, `Vendor`, `Product`, `Order`, `Log`) and the core's errors (`NotFoundError`, `PermissionError`, `ValidationError`). The errors carry no HTTP status.
  - `ports/`: what the core needs from outside: repositories, a `UnitOfWork` (run several writes atomically), a `PasswordHasher` and a `TokenIssuer`.
  - `application/`: the use cases. `AuthService` handles login: check credentials, issue a token, store it. The others are `UserService`, `VendorService`, `ProductService`, `OrderService` and `LogService`: ownership checks, one order per shop (all created in one transaction, so a basket is never half-placed), role-scoped lists. Their inputs are the core's own command types (`commands.ts`), not request bodies.
- **Driven adapters** implement the ports:
  - `adapters/persistence/prisma/`: the repositories and `PrismaUnitOfWork` (a Prisma interactive transaction). Every query goes through one error mapper: duplicate or missing records become core errors, and anything else is rethrown, so a database outage is a `500`, never an empty list.
  - `adapters/security/`: `ScryptPasswordHasher` and `JoseTokenIssuer`.
  - `adapters/logging/`: the winston logger.
- **Driving adapter: HTTP.** The route handlers in `app/api/` (Next.js requires them there) and `middleware.ts`, plus their helpers in `adapters/http/`:
  - `schemas.ts` and `validate.ts`: request DTOs (Zod). Routes validate a body, then build the core's command, converting where the wire format differs (`product_list` → `products`, date strings → `Date`).
  - `dto.ts`: response DTOs (`toUserDto`, `toProductDto`, …). Routes always return a DTO, never an entity, so credentials can't leak and new database columns stay private until added there.
  - `responses.ts`: turns core errors into status codes (404, 403, 400). Anything unexpected becomes a generic 500 and is logged.
  - `accessRules.ts`: which role may call which path and method, enforced by `middleware.ts`. These are HTTP rules (they speak in URLs), so they live here, not in the core.
  - `request.ts` and `currentUser.ts`: reading the token and role (safe in middleware), and loading the signed-in user for routes. `getCurrentUser` is built in `container.ts` from `userService`, which is passed in rather than imported, so routes import it from `@/container`.
- **Composition root** (`container.ts`): the only module that knows both sides. It creates the adapters and hands them to the use cases.

To swap a technology, write a new adapter for its port and change `container.ts`. To call a use case from somewhere other than HTTP (a script, a queue worker), import it from `container.ts`.

## Project structure

```
app/api/          Route handlers: the HTTP adapter (validate → command → use case → DTO)
app/route.ts      Home page: the interactive API docs (app/openapi.json/route.ts serves the spec)
middleware.ts     Token check and HTTP access rules, before any route runs
core/
  domain/         Entities and core errors
  ports/          Repository, unit-of-work, password-hasher and token-issuer interfaces
  application/    Use cases and their command types
adapters/
  http/           Request schemas, response DTOs, error → status mapping, access rules, auth helpers, OpenAPI spec
  persistence/prisma/  Prisma client, repositories, unit of work and error mapper
  security/       scrypt password hasher, jose token issuer
  logging/        winston logger
container.ts      Composition root: wires adapters into the use cases
prisma/           Schema, migrations and seed data
__test__/         Test setup and helpers (factories, request helper, mock repositories)
scripts/          Smoke test and maintenance scripts
frontend/         Web UI: a separate Next.js app with its own Dockerfile
  app/              Pages, plus app/api/[...path] which forwards to the API
  app/demo/[view]/  Demo routes: the real pages under a demo session
  components/       UI components and providers (session, basket, toasts, i18n)
  lib/client/       API client, response types and a copy of the access rules
  lib/demo/         Sample data and the in-memory API used by the demo
  lib/i18n/         Locale config and the English and French dictionaries
  cypress/          End-to-end tests
```

## Deploying

### Fresh environment

1. Set `DATABASE_URL`, `AUTH_SECRET` and `LOG_TOKEN_SECRET` in the platform's environment settings. Generate secrets with `openssl rand -base64 48`, and never reuse the local ones.
2. Apply the migrations: `pnpm db:deploy`.
3. Deploy the frontend with `API_URL` set to the API's internal address. The API itself doesn't need to be public.
4. Don't run `pnpm db:seed` here. The seed accounts in `prisma/seed.sql` have publicly known demo passwords, including a SUPERADMIN.
