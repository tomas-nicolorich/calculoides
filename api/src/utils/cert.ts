import fs from "fs";

export function ensureCert() {
  const certPath = `/tmp/supabase-ca.crt`;

  if (!fs.existsSync(certPath)) {
    const dbCa = process.env.DATABASE_CA;
    const certContent = dbCa
      ? Buffer.from(dbCa, "base64").toString("utf-8")
      : undefined;

    if (certContent) {
      fs.writeFileSync(certPath, certContent);
    }
  }

  return certPath;
}
