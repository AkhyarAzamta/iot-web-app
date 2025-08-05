"use client";
import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { GalleryVerticalEnd, AudioWaveform, Command } from "lucide-react";
import { useStoreDevice, useStoreUser } from "@/hooks/use-store-modal";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const user = useStoreUser((state) => state.user);
  const activeDevice = useStoreDevice((state) => state.activeDevice);

  // Jika user belum dimuat, tampilkan loading atau null
  if (!user) {
    return null; // Atau tampilkan loading spinner
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects
          projects={[
            { 
              name: "Dashboard", 
              url: `/${user.id}/${activeDevice?.id}`, 
              icon: GalleryVerticalEnd 
            },
            { 
              name: "Sensor Data",      
              url: `/${user.id}/${activeDevice?.id}/sensor-data`, 
              icon: AudioWaveform  
            },
            { 
              name: "Settings",  
              url: `/${user.id}/${activeDevice?.id}/sensor-settings`,  
              icon: Command        
            },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser /> {/* Gunakan tanpa props */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}