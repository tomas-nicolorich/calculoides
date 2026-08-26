# Delta for UI Design System

## ADDED Requirements

### Requirement: Spinner Primitive Provides a Sanctioned Full-Page/Shape-Unknown Loading Indicator

`app/_ui/Spinner.tsx` MUST be a ported primitive accepting a `size` prop
with values `sm | md | lg`, MUST render with `role="status"` and
`aria-label="Loading"`, and MUST be re-exported from the `app/_ui` barrel
(`app/_ui/index.tsx`), matching `main`'s exact prop API.

#### Scenario: Spinner exposes the ported size vocabulary
- GIVEN a consumer needs a full-page loading indicator
- WHEN it imports `Spinner` from the `app/_ui` barrel with `size="md"`
- THEN it renders the `md` conic-gradient ring matching `main`'s ported shape

#### Scenario: Spinner carries required accessibility attributes
- GIVEN `Spinner` renders in any size
- WHEN an assistive technology inspects it
- THEN it exposes `role="status"` and `aria-label="Loading"`

### Requirement: Spinner Is Reserved for Full-Page or Shape-Unknown Loading, Skeleton for Known Content Shape

The system MUST use `Spinner` only where the awaited content's final shape
is unknown or the loading state spans the full page before any page shell
is determined (e.g., a session check), and MUST use `Skeleton` wherever the
final content shape is already known (e.g., a page layout or a widget's
populated state).

#### Scenario: A session-gated route uses Spinner
- GIVEN a route's loading state occurs before the page's content shape is determined
- WHEN its fallback renders
- THEN it uses `Spinner`, not `Skeleton`

#### Scenario: A page-shaped or widget-shaped loading state uses Skeleton
- GIVEN a route or widget's final layout is already known
- WHEN its fallback renders
- THEN it uses `Skeleton`, not `Spinner`
