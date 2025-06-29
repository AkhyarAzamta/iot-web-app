"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { createDevice } from "@/actions/create-device"
import { getCookie } from "@/lib/get-cookie"

const formSchema = z.object({
  name: z.string().min(2, "Device name must be at least 2 characters"),
})

type NewDeviceFormValues = z.infer<typeof formSchema>

export default function NewDeviceForm() {
  const router = useRouter()

  const form = useForm<NewDeviceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
})

const onSubmit = async (data: NewDeviceFormValues) => {
  try {
    const token = getCookie("token")
    if (!token) throw new Error("No token found in cookie")

    await createDevice({
      token,
      deviceName: data.name,
    })

    router.push("/dashboard")
  } catch (error) {
    console.error("Create device error:", error)
  }
}

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter device name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create Device</Button>
      </form>
    </Form>
  )
}
