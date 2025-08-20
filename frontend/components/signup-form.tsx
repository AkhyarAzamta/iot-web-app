/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { signUp } from "@/actions/sign-up"

export function SignUpForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const result = await signUp(null, formData);
      
      if (result.success) {
        toast.success(result.message);
        setTimeout(() => router.push('/login'), 500);
      } else {
        // Tampilkan error di toast dan state
        toast.error(result.message);
        setErrors({ general: result.message });
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
      setErrors({ general: error.message || "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

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
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {errors.general && (
                <p className="text-base text-red-600">{errors.general}</p>
              )}
              
              <div className="grid gap-3">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="fullname">Full Name *</Label>
                <Input
                  id="fullname"
                  name="fullname"
                  type="text"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="telegramChatId">Telegram Chat ID (Optional)</Label>
                <Input
                  id="telegramChatId"
                  name="telegramChatId"
                  type="text"
                  placeholder="1234567890"
                  disabled={isLoading}
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
                      disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
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