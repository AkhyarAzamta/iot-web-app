"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import { useFormStatus } from "react-dom" // Hapus useFormState dari sini
import { signUp } from "@/actions/sign-up"

// Komponen untuk tombol submit
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account..." : "Sign Up"}
    </Button>
  );
}

export function SignUpForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  
  // Inisialisasi state awal
  const initialState = { success: false, message: "" };
  
  // Perbaikan: Gunakan useActionState sebagai pengganti useFormState
  const [state, formAction] = React.useActionState(signUp, initialState);

  React.useEffect(() => {
    if (state) {
      if (state.success) {
        toast.success(state.message)
        setTimeout(() => router.push('/login'), 500)
      } else {
        toast.error(state.message)
      }
    }
  }, [state, router])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create New account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="fullname">Full Name *</Label>
                <Input
                  id="fullname"
                  name="fullname"
                  type="text"
                  required
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="telegramChatId">Telegram Chat ID (Optional)</Label>
                <Input
                  id="telegramChatId"
                  name="telegramChatId"
                  type="text"
                  placeholder="1234567890"
                />
                <p className="text-xs text-muted-foreground">
                  Untuk menerima notifikasi. Dapatkan ID Telegram Anda dari <a className="underline underline-offset-4 text-blue-600" target="_blank" rel="noopener noreferrer" href="https://t.me/monitoring_kolam_bot">@monitoring_kolam_bot</a> di Telegram
                </p>
              </div>
              
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password *</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-password"
                      checked={showPassword}
                      onCheckedChange={(checked) => setShowPassword(checked as boolean)}
                    />
                    <Label htmlFor="show-password" className="mb-0 text-sm">
                      Show password
                    </Label>
                  </div>
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <SubmitButton />
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline underline-offset-4">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}