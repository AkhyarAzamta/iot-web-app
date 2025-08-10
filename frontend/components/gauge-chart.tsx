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
  <Card className="gap-0">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex items-center justify-center w-full min-h-[220px] p-0 overflow-hidden">
      {children}
    </CardContent>
  </Card>
)
