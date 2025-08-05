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
import { ReactNode, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { getCurrentUser } from "@/actions/get-current-user";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const activeUser = useStoreUser((state) => state.user);
  const setUser = useStoreUser((state) => state.setUser);
  const deviceIdRef = useRef<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [setUser, router]);

  // Setup socket connections
  useEffect(() => {
    if (!activeUser) return;

    // Connect to socket.io
    socket.connect();
    
    // Handler for sensor data from socket.io
    const handleSocketSensorData = (data: SensorData) => {
      eventBus.emit('sensor_data', data);
    };
    
    // Handler for device notifications
    const handleDeviceNotification = (data: { 
      deviceName: string; 
      message: string;
      status?: 'success' | 'info' | 'warning' | 'error' | 'default';
    }) => {
      eventBus.emit('device_notification', data);
    };
    
    // Handler for sensor acknowledgments
    const handleAckSensor = (data: { 
      message: string;
      status?: 'success' | 'info' | 'warning' | 'error' | 'default';
    }) => {
      eventBus.emit(`${activeUser.id}-sensor_ack`, data);
    };
    
    // Register socket listeners
    socket.on('sensor_data', handleSocketSensorData);
    
    if (activeUser.id) {
      deviceIdRef.current = activeUser.id;
      socket.on(activeUser.id, handleDeviceNotification);
      socket.on(`${activeUser.id}-sensor_ack`, handleAckSensor);
    }
    
    return () => {
      // Clean up listeners
      socket.off('sensor_data', handleSocketSensorData);
      
      if (deviceIdRef.current) {
        socket.off(deviceIdRef.current, handleDeviceNotification);
        socket.off(`${deviceIdRef.current}-sensor_ack`, handleAckSensor);
      }
      socket.disconnect();
    };
  }, [activeUser?.id]); 
  
  // Show loading state while fetching user
  if (isLoading) {
    return (
      <LoadingSpinner />
    );
  }

  // Redirect to login if no user
  if (!activeUser) {
    return null; // Already redirected by useEffect
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href={`/${activeUser.id}`}>
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