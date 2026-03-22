/**
 * Sets User.role to ADMIN for AUTH_DEMO_EMAIL, NOJO_ADMIN_EMAIL, or TARGET_EMAIL.
 *
 * Usage (from web/):
 *   node --env-file=.env scripts/set-admin-role.mjs
 *   node --env-file=.env scripts/set-admin-role.mjs --email you@example.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function argEmail() {
  const i = process.argv.indexOf("--email");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1].trim();
  return null;
}

async function main() {
  const email =
    argEmail() ||
    process.env.TARGET_EMAIL?.trim() ||
    process.env.AUTH_DEMO_EMAIL?.trim() ||
    process.env.NOJO_ADMIN_EMAIL?.trim();

  if (!email) {
    console.error(
      "No email: pass --email you@example.com or set AUTH_DEMO_EMAIL / NOJO_ADMIN_EMAIL / TARGET_EMAIL in .env",
    );
    process.exit(1);
  }

  const r = await prisma.user.updateMany({
    where: { email },
    data: { role: "ADMIN" },
  });

  if (r.count === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`OK: set role=ADMIN for ${email} (${r.count} user(s)).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
