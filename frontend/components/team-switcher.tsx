// components/TeamSwitcher.tsx
"use client"

import * as React from "react"
import { ChevronsUpDown, MonitorCheck, Plus } from "lucide-react"
import { useRouter, usePathname } from 'next/navigation'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useDeviceModal, useStoreDevice, useStoreUser } from "@/hooks/use-store-modal"
import { getCurrentUser } from "@/actions/get-current-user"

export interface DeviceOption {
  id: string
  deviceName: string
}

export function TeamSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile } = useSidebar()

  // Zustand stores
  const user = useStoreUser((state) => state.user)
  const setUser = useStoreUser((state) => state.setUser)
  const devices = useStoreDevice((state) => state.devices)
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const setDevices = useStoreDevice((state) => state.setDevices)
  const setActiveDevice = useStoreDevice((state) => state.setActiveDevice)
  const openModal = useDeviceModal((state) => state.onOpen)

  // Fetch current user and their devices on mount
  React.useEffect(() => {
    async function fetchUserAndDevices() {
      try {
        const data = await getCurrentUser()
        if (!data) {
          router.push("/login")
          return
        }
        setUser(data)
        if (data.devices.length > 0) {
          setDevices(data.devices)
          // 1) kalau URL sudah punya deviceId → gunakan itu
          const segs = pathname.split('/').filter(Boolean)
          if (segs.length >= 2) {
            const urlDevId = segs[1]
            const found = data.devices.find((d) => d.id === urlDevId)
            if (found) {
              setActiveDevice(found.id, found.deviceName)
              return
            }
          }
          // 2) kalau belum (misal baru /user atau gagal match), pakai default pertama
          const first = data.devices[0]
          setActiveDevice(first.id, first.deviceName)
        } else {
          openModal()
        }
      } catch {
        router.push("/login")
      }
    }
    fetchUserAndDevices()
  }, [openModal, router, setDevices, setActiveDevice, setUser, pathname])

  // On activeDevice change, navigate
   React.useEffect(() => {
     if (!activeDevice || !user?.id) return
   // hanya redirect jika saat ini belum di sub-route device (depth ≤ 2 segments)
   const segs = pathname.split('/').filter(Boolean)
   // contoh:
   //  segs=[user]               → /user          (depth=1)
   //  segs=[user, device]       → /user/device   (depth=2)
   //  segs=[user,device,xxx...] → sub-route      (depth>2)
   if (segs.length <= 2) {
     router.push(`/${user.id}/${activeDevice.id}`)
   }
   }, [activeDevice, user, router, pathname])
 
   if (!activeDevice) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <MonitorCheck className="size-6" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeDevice.deviceName}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Devices
            </DropdownMenuLabel>
            {devices.map((dev, idx) => (
              <DropdownMenuItem
                key={dev.id}
                onClick={() => setActiveDevice(dev.id, dev.deviceName)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <MonitorCheck className="size-4 shrink-0" />
                </div>
                {dev.deviceName}
                <DropdownMenuShortcut>⌘{idx + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openModal()}
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add Device</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}