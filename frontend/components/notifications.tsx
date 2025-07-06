"use client"

import { useEffect } from "react";
import eventBus from "@/lib/eventBus";
import { toast } from "sonner";

export function NotificationHandler() {
  useEffect(() => {
    const handleDeviceNotification = (data: { 
      deviceName: string; 
      message: string;
      status?: 'success' | 'info' | 'warning' | 'error' | 'default';
    }) => {
      const notificationType = data.status || 'default';
      switch (notificationType) {
        case 'success':
          toast.success(data.deviceName, {
            description: data.message,
            duration: 5000,
          });
          break;
        case 'info':
          toast.info(data.deviceName, {
            description: data.message,
            duration: 5000,
          });
          break;
        case 'warning':
          toast.warning(data.deviceName, {
            description: data.message,
            duration: 5000,
          });
          break;
        case 'error':
          toast.error(data.deviceName, {
            description: data.message,
            duration: 5000,
        })
        default:
      }
    };

    // Daftarkan listener untuk event umum
    eventBus.on('device_notification', handleDeviceNotification);

    return () => {
      eventBus.off('device_notification', handleDeviceNotification);
    };
  }, []);

  return null;
}