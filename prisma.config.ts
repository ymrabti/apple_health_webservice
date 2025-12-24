import 'dotenv/config';

export default {
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
  experimental: { externalTables: true },
  tables: { external: ["users", "tokens", "checks", "sequelizemeta"] },
};
