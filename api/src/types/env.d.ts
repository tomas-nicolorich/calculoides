declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_CA: string;
    DATABASE_URL: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    NODE_ENV: "development" | "production" | "test";
  }
}
