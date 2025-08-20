"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { StoreModal } from "@/components/modals/device-modal";
import { NotificationHandler } from "@/components/notifications";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useStoreDevice, useStoreUser } from "@/hooks/use-store-modal";
import { useDeviceModal } from "@/hooks/use-store-modal"; // <<--- pastikan hook ini diexport dari file yang sama
import eventBus from "@/lib/eventBus";
import { SensorData } from "@/types";
import socket from "@/utils/socket";
import { Separator } from "@radix-ui/react-separator";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { getCurrentUser } from "@/actions/get-current-user";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading";
import { getDevices } from "@/actions/get-devices";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const activeUser = useStoreUser((state) => state.user);
  const setUser = useStoreUser((state) => state.setUser);

  const activeDevice = useStoreDevice((state) => state.activeDevice);
  const setActiveDevice = useStoreDevice((state) => state.setActiveDevice);
  const setDevices = useStoreDevice((state) => state.setDevices);

  // modal hook
  const openDeviceModal = useDeviceModal((s) => s.onOpen);

  const deviceOpenGuardRef = useRef(false);
  const deviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getPageName = () => {
    if (!mounted) return "";
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 2) return "Dashboard";
    const pageSegment = segments[segments.length - 1] || "";
    const pageNames: Record<string, string> = {
      'sensor-data': 'Sensor Data',
      'sensor-settings': 'Sensor Settings',
    };
    return pageNames[pageSegment] ||
      pageSegment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);

        if (userData) {
          const devices = await getDevices();
          setDevices(devices);

          if (devices.length > 0) {
            const firstDevice = devices[0];
            setActiveDevice(firstDevice.id, firstDevice.deviceName);
          } else {
            // tidak ada device -> clear active
            setActiveDevice("", "");
            // buka modal CREATE DEVICE (hanya sekali)
            if (!deviceOpenGuardRef.current) {
              deviceOpenGuardRef.current = true;
              openDeviceModal();
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [setUser, setActiveDevice, setDevices, router, openDeviceModal]);

  // socket setup (tetap seperti semula)
  useEffect(() => {
    if (!activeUser || !activeDevice || !activeDevice.id) {
      console.warn("No active user or device, skipping socket setup.");
    }

    if (socket && typeof socket.connect === 'function' && !socket.connected) {
      socket.connect();
    }

    const handleSocketSensorData = (data: SensorData) => {
      eventBus.emit('sensor_data', data);
    };

    const handleDeviceNotification = (data: { deviceName: string; message: string; }) => {
      if (activeUser?.id) eventBus.emit(activeUser.id, data);
    };

    const handleAckSensor = (data: { message: string; }) => {
      if (activeUser?.id) eventBus.emit(`${activeUser.id}-sensor_ack`, data);
    };

    if (socket && typeof socket.on === 'function') {
      socket.on('sensor_data', handleSocketSensorData);
    }

    if (activeUser?.id) {
      deviceIdRef.current = activeUser.id;
      if (socket && typeof socket.on === 'function') {
        socket.on(activeUser.id, handleDeviceNotification);
        socket.on(`${activeUser.id}-sensor_ack`, handleAckSensor);
      }
    }

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off('sensor_data', handleSocketSensorData);
      }
      if (deviceIdRef.current && socket && typeof socket.off === 'function') {
        socket.off(deviceIdRef.current, handleDeviceNotification);
        socket.off(`${deviceIdRef.current}-sensor_ack`, handleAckSensor);
      }
      if (socket && typeof socket.disconnect === 'function' && socket.connected) {
        socket.disconnect();
      }
    };
  }, [activeUser, activeDevice]);

  // Fallback loading
  if (!mounted || isLoading) {
    return <LoadingSpinner />;
  }

  // NOTE: jangan return null di sini — kita ingin render halaman + modal walau tidak ada device
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{mounted ? getPageName() : null}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4">
            {/* Jika tidak ada device, tampilkan fallback pesan. Kalau ada, render children */}
            {!activeDevice ? (
              <div className="flex flex-col items-center justify-center grow gap-4">
                <h2 className="text-lg font-medium">Anda belum memiliki device</h2>
                <p className="text-sm text-muted-foreground">Buat device baru untuk mulai menerima data sensor.</p>
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={() => openDeviceModal()}
                  >
                    Buat Device Baru
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                {children}
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <NotificationHandler />
      <Toaster richColors position="top-right" />
      <StoreModal />
    </>
  );
}
