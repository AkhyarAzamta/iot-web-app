// components/TeamSwitcher.tsx
"use client"

import * as React from "react"
import { ChevronsUpDown, MonitorCheck, Plus, MoreVertical, Copy, Pencil, Trash } from "lucide-react"
import { useRouter, usePathname } from 'next/navigation'
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
import { Button } from "@/components/ui/button"
import { deleteDevice } from "@/actions/delete-device"
import { Skeleton } from "@/components/ui/skeleton" // Tambahkan komponen skeleton
import { getCurrentUser } from "@/actions/get-current-user"
import { LoadingSpinner } from "./ui/loading"

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
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const devices = useStoreDevice((state) => state.devices)
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const setDevices = useStoreDevice((state) => state.setDevices)
  const setActiveDevice = useStoreDevice((state) => state.setActiveDevice)
  const openModal = useDeviceModal((state) => state.onOpen)
  const openEditModal = useDeviceModal((state) => state.onOpenEdit)
  const setUser = useStoreUser((state) => state.setUser)

  // Kontrol dialog konfirmasi (terpisah agar tidak tergantung pada dropdown)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmDevice, setConfirmDevice] = React.useState<{ id: string; name: string } | null>(null)
  const openConfirm = (event: React.MouseEvent, id: string, name: string) => {
    event.preventDefault() // Mencegah perilaku default seperti navigasi
    event.stopPropagation() // Mencegah propagasi event ke elemen lain
    setConfirmDevice({ id, name })
    setConfirmOpen(true)
    // biarkan dropdown menutup sendiri; dialog dikontrol jadi tetap tampil
    setDropdownOpen(false)
  }

  React.useEffect(() => {
  setDropdownOpen(false);
  setConfirmOpen(false);
  setConfirmDevice(null);

  // Reset focus ke body agar tidak terjebak di dialog/dropdown
  if (typeof window !== "undefined") {
    setTimeout(() => {
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.focus();
    }, 100);
  }
}, [devices]);

  // Fetch current user and their devices on mount
  React.useEffect(() => {
    async function fetchUserAndDevices() {
      try {
        setIsLoading(true);
        const data = await getCurrentUser();
        if (!data) {
          router.push("/login");
          return;
        }
        setUser(data);
        if (data.devices.length > 0) {
          setDevices(data.devices);
          const segs = pathname.split('/').filter(Boolean);
          const urlDeviceId = segs[1];
          const targetDevice = urlDeviceId
            ? data.devices.find(d => d.id === urlDeviceId)
            : data.devices[0];
          if (targetDevice) {
            setActiveDevice(targetDevice.id, targetDevice.deviceName);
          } else if (data.devices.length > 0) {
            setActiveDevice(data.devices[0].id, data.devices[0].deviceName);
          }
        } else {
          openModal();
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserAndDevices();
  }, [openModal, router, setDevices, setActiveDevice, setUser, pathname]);

  const handleSelectDevice = (dev: DeviceOption) => {
    setActiveDevice(dev.id, dev.deviceName);
    setDropdownOpen(false);
    if (user) {
      router.push(`/${user.id}/${dev.id}`);
    }
  };

const handleCopyId = (event: React.MouseEvent, deviceId: string) => {
  event.preventDefault();
  event.stopPropagation();
  navigator.clipboard.writeText(deviceId);
  toast.success("Device ID copied to clipboard");
  setDropdownOpen(false); // pastikan dropdown ditutup
  setTimeout(() => {
    setDropdownOpen(false); // double safety jika dropdown belum tertutup
  }, 100);
}

const handleEditDevice = (device: DeviceOption) => {
  openEditModal(device);
  setDropdownOpen(false);
  // Pastikan setelah edit, modal edit di-close dan focus direset
  setTimeout(() => {
    if (typeof window !== "undefined") {
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.focus();
    }
  }, 200);
}

const handleDeleteDevice = async (event: React.MouseEvent, deviceId: string) => {
  if (!user) return;
  event.preventDefault();
  event.stopPropagation();
  try {
    await deleteDevice(deviceId);

    // Update state setelah penghapusan
    const updatedDevices = devices.filter(d => d.id !== deviceId);
    setDevices(updatedDevices);

    // Jika device yang aktif dihapus
    if (activeDevice?.id === deviceId) {
      if (updatedDevices.length > 0) {
        const newActive = updatedDevices[0];
        setActiveDevice(newActive.id, newActive.deviceName);
        router.push(`/${user.id}/${newActive.id}`);
      } else {
        setActiveDevice("", "");
        openModal();
      }
    }

    toast.success("Device deleted successfully");
  } catch (error) {
    toast.error("Failed to delete device");
    console.error(error);
  } finally {
    setConfirmOpen(false);
    setConfirmDevice(null);
    setDropdownOpen(false);
    // Reset focus ke body agar pointer events kembali normal
    setTimeout(() => {
      if (typeof window !== "undefined") {
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
      }
    }, 200);
  }
}

  // Skeleton saat loading
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
              <LoadingSpinner />
            </div>
            <Skeleton className="h-4 w-4 rounded-md" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!activeDevice) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Button
            onClick={openModal}
            variant="ghost"
            className="w-full justify-start"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Device
          </Button>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
        >
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <MonitorCheck className="size-6" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeDevice.deviceName || "Select Device"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Devices
            </DropdownMenuLabel>
            {devices.map((dev, idx) => (
              <div key={dev.id} className="flex items-center justify-between group hover:bg-accent">
                <div
                  className="flex items-center gap-2 p-2 flex-1 cursor-pointer"
                  onClick={() => handleSelectDevice(dev)}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <MonitorCheck className="size-4 shrink-0" />
                  </div>
                  <span className="text-sm truncate">{dev.deviceName}</span>
                  <DropdownMenuShortcut>⌘{idx + 1}</DropdownMenuShortcut>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={(e) => handleCopyId(e, dev.id)}>
                      <Copy className="mr-2 h-4 w-4" />
                      <span>Copy ID</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditDevice(dev)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>

                    {/* Hanya memicu dialog konfirmasi (tidak menggunakan AlertDialogTrigger di sini) */}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        openConfirm(e, dev.id, dev.deviceName)
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                openModal();
                setDropdownOpen(false);
              }}
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

      {/* AlertDialog terkontrol secara global di level komponen */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Perangkat{" "}
              <span className="font-semibold">{confirmDevice?.name}</span> dan data sensor akan
              dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                if (confirmDevice) {
                  handleDeleteDevice(e, confirmDevice.id)
                } else {
                  setConfirmOpen(false)
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </SidebarMenu>
  )
}
