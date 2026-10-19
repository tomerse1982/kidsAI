/** Creates/updates the bootstrap admin from ADMIN_EMAIL / ADMIN_PASSWORD and default settings. */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPrisma } from "@/server/prisma-factory";

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars) are required");
  const db = createPrisma();
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({ where: { email }, create: { email, passwordHash, role: "admin", displayName: "Administrator" }, update: { passwordHash, role: "admin", isActive: true } });
  const settings: [string, unknown, string][] = [
    ["chat.rate_limit_per_min", Number(process.env.CHAT_RATE_LIMIT_PER_MIN ?? 20), "Chat requests per minute per client"],
    ["chat.message_retention_days", 90, "Conversation history retention (days); older conversations are purged by `npm run db:purge`"],
    ["retrieval.min_similarity", 0.8, "Minimum semantic similarity for an answer to count as grounded"],
  ];
  for (const [key, value, description] of settings) {
    await db.applicationSetting.upsert({ where: { key }, create: { key, value: value as never, description }, update: { description } });
  }
  console.log(`admin user ready: ${email}`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
