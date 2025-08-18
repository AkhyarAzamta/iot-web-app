"use client"

import { useEffect } from "react";
import eventBus from "@/lib/eventBus";
import { toast } from "sonner";
import { useStoreUser } from "@/hooks/use-store-modal";

export function NotificationHandler() {
  const activeUser = useStoreUser((state) => state.user);

  useEffect(() => {
    console.log("NotificationHandler mounted for user:", activeUser?.id);
    if (!activeUser || !activeUser.id) return;

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
          });
          break;
        default:
      }
    };

    eventBus.on(activeUser.id, handleDeviceNotification);
    return () => {
      eventBus.off(activeUser.id, handleDeviceNotification);
    };
  }, [activeUser]);

  return null;
}