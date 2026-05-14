# Feature Specification: Local Server Testing

**Feature Branch**: `002-local-server-testing`  
**Created**: 2024-05-22  
**Status**: Draft  
**Input**: User description: "I'd like to be able to test Calculoides without connecting to vercel, with a local server."

## Clarifications

### Session 2024-05-22
- Q: How should the local server persist its data? → A: It should still call Supabase, just not Vercel.
- Q: How should the application detect whether it should use the "local" or "remote" configuration? → A: Use the existing `CALC_ENVIRONMENT` environment variable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local Development Mode (Priority: P1)

As a developer, I want to run Calculoides entirely on my local machine while maintaining a connection to Supabase so that I can work without dependency on Vercel deployment while using real data.

**Why this priority**: Core requirement for offline development (excluding DB) and faster iteration cycles.

**Independent Test**: Can be fully tested by setting `CALC_ENVIRONMENT=local`, launching the local development server, and performing a basic calculation or data entry that persists to Supabase without any network requests to vercel.app.

**Acceptance Scenarios**:

1. **Given** the app is configured for local mode via `CALC_ENVIRONMENT`, **When** the app starts, **Then** it connects to a local development address for the application logic but remains connected to the Supabase backend.
2. **Given** the local server is running, **When** I create a new item in Calculoides, **Then** it is persisted to the remote Supabase instance and remains visible after refresh.

---

### User Story 2 - Automated Local Testing (Priority: P2)

As a tester, I want to run the test suite against a stable local server connected to a test Supabase instance so that I can ensure feature parity.

**Why this priority**: Ensures that local development remains reliable and consistent with production behavior.

**Independent Test**: Running the existing test suite with `CALC_ENVIRONMENT=test-local` pointing to the local server and a test Supabase project.

**Acceptance Scenarios**:

1. **Given** the test environment is active, **When** tests are executed, **Then** they use the local server as the application backend.

---

### Edge Cases

- **Supabase Unreachable**: What happens when the app is in local mode but the internet connection to Supabase is lost?
- **Environment Variable Mismatch**: How does the system handle a local server configured with incorrect Supabase credentials or an unsupported `CALC_ENVIRONMENT` value?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support a configuration toggle using the `CALC_ENVIRONMENT` variable to switch between `remote` and `local` application environments.
- **FR-002**: System MUST allow configuring separate Supabase credentials for local development via environment-specific configuration files (`.env` for `local`, `.env.test` for `test-local`).
- **FR-003**: All core CRUD operations in Calculoides MUST function identically when using the local server pointing to Supabase.
- **FR-004**: System MUST provide a mechanism to launch the local application server independently of Vercel.
- **FR-005**: System MUST provide clear feedback if the local server is reachable but the connection to Supabase fails. Feedback MUST be provided as a `503 Service Unavailable` HTTP status with a JSON payload: `{ "error": "Supabase Connection Failed", "details": "..." }`.

### Key Entities *(include if feature involves data)*

- **Local Server**: A local process hosting the Calculoides application logic.
- **Supabase**: The remote backend-as-a-service used for data persistence and authentication.
- **CALC_ENVIRONMENT**: The environment variable used to select the active application configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can switch the app to local mode and see a successful connection to Supabase in under 10 seconds.
- **SC-002**: 100% of existing unit and integration tests pass when executed using the local server and a test Supabase project.
- **SC-003**: The application logic (non-database features) functions fully without any external dependencies other than Supabase.

## Assumptions

- The Supabase instance is accessible over the internet during local development.
- Developers have valid Supabase API keys and Project URLs.
- The app uses standard environment variables for both the application address and Supabase configuration.
