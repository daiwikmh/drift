import { redirect } from "next/navigation";
import { auth, AUTH_ENABLED } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  // Already signed in? Skip straight to the cockpit.
  if (AUTH_ENABLED) {
    const session = await auth();
    if (session) redirect("/dashboard");
  }
  return <LoginForm authEnabled={AUTH_ENABLED} />;
}
