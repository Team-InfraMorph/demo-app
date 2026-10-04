const {
  GetSecretValueCommand,
  SecretsManagerClient,
} = require("@aws-sdk/client-secrets-manager");

function required(value, name) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${name} is missing from the database secret`);
  }
  return String(value);
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const secretArn = process.env.DATABASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error("DATABASE_URL or DATABASE_SECRET_ARN is required");
  }

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const result = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!result.SecretString) {
    throw new Error("database secret must contain SecretString JSON");
  }

  const secret = JSON.parse(result.SecretString);
  const username = encodeURIComponent(required(secret.username, "username"));
  const password = encodeURIComponent(required(secret.password, "password"));
  const host = required(secret.host, "host");
  const port = encodeURIComponent(required(secret.port, "port"));
  const database = encodeURIComponent(required(secret.dbname, "dbname"));
  return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
}

module.exports = { resolveDatabaseUrl };
