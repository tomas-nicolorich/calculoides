# Contract: Handler Dispatcher Interface

## Purpose
A shared utility to route incoming Vercel requests to specific domain logic based on query parameters or path segments.

## Signature

```typescript
export interface RouteConfig {
  [action: string]: (req: VercelRequest, res: VercelResponse) => Promise<void>;
}

export function dispatch(
  req: VercelRequest,
  res: VercelResponse,
  routes: RouteConfig,
  defaultAction: string = 'list'
): Promise<void>;
```

## Usage Example (api/groups.ts)

```typescript
import { dispatch } from './src/utils/dispatcher';
import * as groupsService from './src/services/group';

const routes = {
  list: groupsService.list,
  create: groupsService.create,
  archive: groupsService.archive,
  transfer: groupsService.transferOwnership
};

export default async (req: VercelRequest, res: VercelResponse) => {
  const action = req.query.action as string || 'list';
  return dispatch(req, res, routes, action);
};
```

## Error Handling
- If `action` is not found in `routes`, return `404 Not Found`.
- Catch top-level errors and return `500 Internal Server Error` with JSON body `{ error: "Internal error" }`.
