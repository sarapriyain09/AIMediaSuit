import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth/options";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/dashboard/voice-studio");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center px-4 py-10">
      <LoginForm />
    </div>
  );
}
