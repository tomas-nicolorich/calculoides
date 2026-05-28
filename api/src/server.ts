import "./env";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ?? "3001";

// 1. Environment Configuration
const env = process.env.CALC_ENVIRONMENT ?? "local";

app.use(cors());
app.use(express.json());

// 2. Supabase Health Check (FR-005)
const checkSupabase = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Missing Supabase environment variables");
    return false;
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch (e: unknown) {
    console.error("Supabase health check failed:", e);
    return false;
  }
};

app.get("/api/health", async (_req, res) => {
  const isUp = await checkSupabase();
  if (isUp) {
    res.status(200).json({ status: "OK", database: "connected" });
  } else {
    res
      .status(503)
      .json({ status: "Service Unavailable", database: "disconnected" });
  }
});

// 3. Recursive Route Loading
const routeHandlers = new Map<
  string,
  (req: express.Request, res: express.Response) => Promise<void>
>();

const loadRoutes = async (dir: string, baseRoute = "/api") => {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      // Skip special directories
      if (
        ["src", "scripts", "tests", "node_modules", ".turbo"].includes(file) &&
        baseRoute === "/api"
      ) {
        continue;
      }

      // Handle dynamic segments in directories e.g. [id] -> :id
      const segment =
        file.startsWith("[") && file.endsWith("]")
          ? `:${file.slice(1, -1)}`
          : file;
      await loadRoutes(filePath, `${baseRoute}/${segment}`);
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      const routeName = file.replace(".ts", "");

      // Handle dynamic segments in filenames e.g. [id].ts -> :id
      const segment =
        routeName.startsWith("[") && routeName.endsWith("]")
          ? `:${routeName.slice(1, -1)}`
          : routeName;

      const fullRoute =
        segment === "index" ? baseRoute : `${baseRoute}/${segment}`;

      try {
        // Use absolute path for import
        const handlerModule = (await import(`file://${filePath}`)) as {
          default: unknown;
        };
        const handler = handlerModule.default;

        if (typeof handler === "function") {
          const typedHandler = handler as (
            req: express.Request,
            res: express.Response,
          ) => Promise<void>;
          routeHandlers.set(fullRoute, typedHandler);

          app.all(fullRoute, async (req, res) => {
            try {
              await typedHandler(req, res);
            } catch (err) {
              console.error(`Error handling route ${fullRoute}:`, err);
              if (!res.headersSent) {
                res.status(500).json({ error: "Internal Server Error" });
              }
            }
          });
          console.log(`Mounted route: ${fullRoute}`);
        }
      } catch (err) {
        console.error(`Failed to load route ${file} at ${fullRoute}:`, err);
      }
    }
  }
};

const applyRewrites = () => {
  const vercelConfigPath = path.resolve(__dirname, "../../vercel.json");
  if (!fs.existsSync(vercelConfigPath)) return;

  try {
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, "utf-8")) as {
      rewrites?: { source: string; destination: string; methods?: string[] }[];
    };
    if (!config.rewrites) return;

    for (const rewrite of config.rewrites) {
      if (!rewrite.source.startsWith("/api")) continue;

      const methods = rewrite.methods;

      app.all(rewrite.source, async (req, res, next) => {
        if (methods && !methods.includes(req.method)) {
          next();
          return;
        }

        let destination = rewrite.destination;

        // Replace dynamic segments in destination e.g. :id
        Object.entries(req.params).forEach(([key, value]) => {
          destination = destination.replace(`:${key}`, value as string);
        });

        const url = new URL(
          destination,
          `http://${req.headers.host ?? "localhost"}`,
        );
        const targetPath = url.pathname;
        const targetHandler = routeHandlers.get(targetPath);

        if (targetHandler) {
          // Merge query params from rewrite destination into req.query
          // Note: We use Object.defineProperty because req.query is often a read-only getter in Express
          const newQuery = { ...req.query };
          url.searchParams.forEach((value, key) => {
            newQuery[key] = value;
          });

          Object.defineProperty(req, "query", {
            value: newQuery,
            writable: true,
            configurable: true,
          });

          try {
            await targetHandler(req, res);
          } catch (err) {
            console.error(`Error in rewritten handler ${targetPath}:`, err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Internal Server Error" });
            }
          }
        } else {
          res.status(404).json({ error: "Not Found" });
        }
      });
      console.log(
        `Applied rewrite: ${rewrite.source} -> ${rewrite.destination}`,
      );
    }
  } catch (err) {
    console.error("Failed to parse vercel.json for rewrites:", err);
  }
};

const start = async () => {
  const handlersDir = path.resolve(__dirname, "handlers");

  // Load new consolidated handlers from handlers/ directory
  await loadRoutes(handlersDir);

  // Apply rewrites after all handlers are loaded to map logical legacy routes
  applyRewrites();

  app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Local API server running on http://localhost:${port}`);
    console.log(`Environment: ${env}`);
  });
};

start().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
