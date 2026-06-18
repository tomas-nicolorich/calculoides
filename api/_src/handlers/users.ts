import { dispatch, RouteConfig } from "../utils/dispatcher";
import { UserService } from "../services/user";
import {
  withAuth,
  withErrorHandling,
  AuthenticatedRequest,
  ApiRequest,
  ApiResponse,
} from "../middleware/handler";
import { z } from "zod";

const UpsertUserSchema = z.object({
  name: z.string(),
});

const routes: RouteConfig = {
  upsert: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const { email } = authReq.user;
    if (!email) {
      res.status(400).json({ error: "User email not found in session" });
      return;
    }
    const { name } = UpsertUserSchema.parse(req.body);
    const user = await UserService.upsertUser(authReq.user.id, email, name);
    res.status(200).json(user);
  },
  me: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const user = await UserService.getUser(authReq.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  },
};

export const usersHandler = withErrorHandling(
  withAuth(async (req, res) => {
    return dispatch(req, res, routes, "upsert");
  }),
);

export default usersHandler;
