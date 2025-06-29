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
import { getDevices } from "@/actions/get-devices";
import { getCookie } from "@/lib/get-cookie";
import { GalleryVerticalEnd, AudioWaveform, Command } from "lucide-react";
import { UsersDevice } from "@/types";

const ICONS = [GalleryVerticalEnd, AudioWaveform, Command];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [devices, setDevices] = React.useState<UsersDevice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = getCookie("token");
    if (!token) {
      setError("Not logged in");
      return;
    }
    setLoading(true);
    getDevices(token)
      .then(setDevices)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const tsDevices = devices.map((d, i) => ({
    name: d.deviceName,
    logo: ICONS[i % ICONS.length],
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {loading
          ? "Loading…"
          : error
            ? `Error: ${error}`
            : <TeamSwitcher device={tsDevices} />
        }
      </SidebarHeader>
      <SidebarContent>
        <NavProjects
          projects={[
            { name: "Dashboard", url: "/dashboard", icon: GalleryVerticalEnd },
            { name: "Data",      url: "/data",      icon: AudioWaveform  },
            { name: "Settings",  url: "/settings",  icon: Command        },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: "–", email: "–", avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
