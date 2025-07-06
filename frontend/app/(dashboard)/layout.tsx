'use client';
import { AppSidebar } from "@/components/app-sidebar";
import { StoreModal } from "@/components/modals/device-modal";
import { NotificationHandler } from "@/components/notifications";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useStoreUser } from "@/hooks/use-store-modal";
import eventBus from "@/lib/eventBus";
import { SensorData } from "@/types";
import socket from "@/utils/socket";
import { Separator } from "@radix-ui/react-separator";
import { ReactNode, useEffect, useRef } from "react";
import { Toaster } from "sonner";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const activeUser = useStoreUser((state) => state.user);
  const deviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Connect to socket.io
    socket.connect();
    
    // Handler for sensor data from socket.io
    const handleSocketSensorData = (data: SensorData) => {
      eventBus.emit('sensor_data', data);
    };
    
    // Handler untuk notifikasi perangkat
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
      eventBus.emit(`${activeUser?.id}-sensor_ack`, data);
    };
    
    // Daftarkan listener socket.io
    socket.on('sensor_data', handleSocketSensorData);
    // Jika ada perangkat aktif, daftarkan listener untuk perangkat tersebut
    if (activeUser?.id) {
      deviceIdRef.current = activeUser.id;
      socket.on(activeUser.id, handleDeviceNotification);
    socket.on(`${activeUser?.id}-sensor_ack`, handleAckSensor);
    }
    
    return () => {
      // Clean up
      socket.off('sensor_data', handleSocketSensorData);
      
      // Hapus listener untuk perangkat sebelumnya jika ada
      if (deviceIdRef.current) {
        socket.off(deviceIdRef.current, handleDeviceNotification);
      }
      
      socket.disconnect();
    };
  }, [activeUser?.id]); // Jalankan ulang hanya jika activeDevice.id berubah
  
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Sensor Settings</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 pt-4">
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