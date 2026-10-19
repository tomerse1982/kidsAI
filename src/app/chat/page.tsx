import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatClient } from "@/components/chat";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await getLang()).chat };
}

export default async function ChatPage() {
  const lang = await getLang();
  return (
    <Suspense>
      {/* keyed by language: switching language discards every answer shown in the previous language */}
      <ChatClient key={lang} lang={lang} />
    </Suspense>
  );
}
