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


export function SignUpForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [fullname, setFullName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak sama.")
      return
    }

    try {
      const res = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullname, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Signup gagal')
      }
      toast("Success! Redirecting to login page.")
      // Redirect to login after successful signup
      setTimeout(() => router.push('/login'), 500)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create New account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="fullname">Full Name</Label>
                <Input
                  id="fullname"
                  type="text"
                  required
                  value={fullname}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-password"
                      checked={showPassword}
                      onCheckedChange={(checked) => setShowPassword(checked as boolean)}
                    />
                    <Label htmlFor="show-password" className="mb-0">
                      Show
                    </Label>
                  </div>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full">
                  Sign Up
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Do you have an account?{' '}
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
