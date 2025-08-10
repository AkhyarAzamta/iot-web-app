'use client';
import { AppSidebar } from "@/components/app-sidebar";
import { StoreModal } from "@/components/modals/device-modal";
import { NotificationHandler } from "@/components/notifications";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useStoreDevice, useStoreUser } from "@/hooks/use-store-modal";
import eventBus from "@/lib/eventBus";
import { SensorData } from "@/types";
import socket from "@/utils/socket";
import { Separator } from "@radix-ui/react-separator";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { getCurrentUser } from "@/actions/get-current-user";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading";
import { getDevices } from "@/actions/get-devices"; // Impor fungsi getDevices

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const activeUser = useStoreUser((state) => state.user);
  const setUser = useStoreUser((state) => state.setUser);
  const activeDevice = useStoreDevice((state) => state.activeDevice);
  const setActiveDevice = useStoreDevice((state) => state.setActiveDevice);
  const setDevices = useStoreDevice((state) => state.setDevices);
  const deviceIdRef = useRef<string | null>(null);

  // Fungsi untuk mendapatkan nama halaman dari URL
  const getPageName = () => {
    const segments = pathname.split('/').filter(segment => segment);
    
    // Jika hanya ada 2 segmen, kita di halaman Dashboard
    if (segments.length === 2) return "Dashboard";
    
    // Ambil segmen terakhir sebagai nama halaman
    const pageSegment = segments[segments.length - 1];
    const pageNames: Record<string, string> = {
      'sensor-data': 'Sensor Data',
      'sensor-settings': 'Sensor Settings',
      // Tambahkan mapping untuk halaman lain di sini
    };
    
    return pageNames[pageSegment] || 
      pageSegment.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  };

  // Fetch current user and devices
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Dapatkan user
        const userData = await getCurrentUser();
        setUser(userData);
        
        // 2. Dapatkan devices
        if (userData) {
          const devices = await getDevices();
          setDevices(devices); // Simpan semua devices ke store
          
          // 3. Ambil device pertama sebagai active device
          if (devices.length > 0) {
            const firstDevice = devices[0];
            setActiveDevice(firstDevice.id, firstDevice.deviceName);
          } else {
            // Jika tidak ada device, set ke null
            setActiveDevice("", "");
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
  }, [setUser, setActiveDevice, setDevices, router]);

  // Setup socket connections
  useEffect(() => {
    if (!activeUser || !activeDevice || !activeDevice.id) return;

    // Connect to socket.io
    socket.connect();
    
    const handleSocketSensorData = (data: SensorData) => {
      eventBus.emit('sensor_data', data);
    };
    
    const handleDeviceNotification = (data: { 
      deviceName: string; 
      message: string;
      status?: 'success' | 'info' | 'warning' | 'error' | 'default';
    }) => {
      eventBus.emit('device_notification', data);
    };
    
    const handleAckSensor = (data: { 
      message: string;
      status?: 'success' | 'info' | 'warning' | 'error' | 'default';
    }) => {
      eventBus.emit(`${activeUser.id}-sensor_ack`, data);
    };
    
    socket.on('sensor_data', handleSocketSensorData);
    
    if (activeUser.id) {
      deviceIdRef.current = activeUser.id;
      socket.on(activeUser.id, handleDeviceNotification);
      socket.on(`${activeUser.id}-sensor_ack`, handleAckSensor);
    }
    
    return () => {
      socket.off('sensor_data', handleSocketSensorData);
      
      if (deviceIdRef.current) {
        socket.off(deviceIdRef.current, handleDeviceNotification);
        socket.off(`${deviceIdRef.current}-sensor_ack`, handleAckSensor);
      }
      socket.disconnect();
    };
  }, [activeUser, activeDevice]); 
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!activeUser || !activeDevice || !activeDevice.id) {
    return null;
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  {/* TAMPILKAN HANYA NAMA HALAMAN SAAT INI */}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getPageName()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <NotificationHandler />
      <Toaster richColors position="top-right"/>
      <StoreModal />
    </>
  );
}