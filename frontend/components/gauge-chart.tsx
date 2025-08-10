// components/GaugeCard.tsx
"use client"

import React, { ReactNode } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"

interface GaugeCardProps {
  title: string
  children: ReactNode
}

export const GaugeCard: React.FC<GaugeCardProps> = ({ title, children }) => (
<Card className="h-full flex flex-col justify-between">
  <CardHeader>
    <CardTitle>{title}</CardTitle>
  </CardHeader>
  <CardContent className="flex items-center justify-center w-full h-full p-0 lg:px-2">
    {children}
  </CardContent>
</Card>
)
