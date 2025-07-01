'use client';
import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
        </SidebarInset>
    </SidebarProvider>
  );
}
