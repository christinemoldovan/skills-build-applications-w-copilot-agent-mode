# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route-specific rendering in the React components and use the shared API client for requests. Each route presents loading, populated, empty, and accessible error states; it does not duplicate business rules.
- Logic tier decision: Keep Express handlers focused on HTTP input/output and place capability behavior in the backend service. Validate request data and references before persistence, returning deliberate 4xx responses instead of leaking Mongoose cast or validation errors as 500s.
- Data tier decision: Make Mongoose schemas enforce the contract's required fields and types, default team membership to an empty array, and retain the idempotent seed behavior without deleting unrelated records.
- Activity tracking approach: Accept user and team IDs at the API boundary, validate their format and existence, then persist references with the submitted activity type and duration. Compute points centrally as one point per minute and set `occurredAt` when the activity is created.
- Team management approach: Require a name and mascot, default omitted members to an empty array, and preserve submitted team details and member IDs in create/list responses.
- Leaderboard approach: Sum persisted activity points per team, sort by total points descending, and return the team name, total, and 1-based rank.
- Workout suggestions approach: Find the user by email, prefer a workout matching their fitness goal and otherwise use recent activity to choose a focus, and include a reason tied to that goal or activity. Return a deliberate 4xx when no user matches.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` checks required schema fields, defaults, references, and idempotent seeding. A failure points to a model or seed contract regression.
- API command: `npm run test:api --prefix octofit-tracker/backend` checks activity/team validation and persistence, leaderboard aggregation/ranking, and user-specific workout suggestions. A failure points to route/service behavior or its persistence contract; invalid input must not become a 5xx.
- Frontend command: `npm test --prefix octofit-tracker/frontend` checks API-backed route content, loading/empty/error states, and accessible error announcements. A failure points to presentation behavior, request wiring, or API response handling.
- Backend build command: `npm run build --prefix octofit-tracker/backend` checks TypeScript compilation. A failure indicates backend type errors, independent of runtime contract behavior.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` checks TypeScript compilation and the Vite production build. A failure indicates frontend type or bundling errors, independent of contract-test behavior.

Current baseline from `npm test --prefix octofit-tracker/backend` and `npm test --prefix octofit-tracker/frontend`: backend has 8 failing tests and 1 passing test (the idempotent seed test); frontend has 15 failing tests. Backend failures cover missing required model validation, activity/team requests returning 501 instead of deliberate 4xx responses, an empty leaderboard, and a workout suggestion reason that does not explain the matched activity. Frontend failures cover missing API-backed content and user-specific workout requests, plus missing loading, meaningful empty, and accessible API error states on all four routes. Re-run the focused commands above after each tier is implemented; the full suites are the final contract check.
