/** Deletes conversations older than the configured retention (application_settings: chat.message_retention_days). */
import "dotenv/config";
import { createPrisma } from "@/server/prisma-factory";

async function main() {
  const db = createPrisma();
  const setting = await db.applicationSetting.findUnique({ where: { key: "chat.message_retention_days" } });
  const days = Number(setting?.value ?? 90);
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const res = await db.conversation.deleteMany({ where: { updatedAt: { lt: cutoff } } });
  console.log(`deleted ${res.count} conversations older than ${days} days`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
