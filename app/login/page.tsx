"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) toast.error(error);
    else router.push("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent">
            <Briefcase className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold">Pinnacle CRM</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold leading-tight">
            The CRM built for agencies and freelancers.
          </h2>
          <p className="text-primary-foreground/70 text-lg">
            Manage leads, deals, invoices, and tasks in one professional workspace.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/50">© 2026 Pinnacle CRM</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
