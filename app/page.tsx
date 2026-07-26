import { cookies } from "next/headers";
import { AccessGate } from "@/components/AccessGate";
import { QueueApp } from "@/components/QueueApp";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isValidSessionToken(session)) {
    return <AccessGate />;
  }

  return <QueueApp />;
}
