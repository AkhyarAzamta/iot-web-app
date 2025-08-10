/* eslint-disable @typescript-eslint/no-explicit-any */
// device-modal.tsx
"use client";

import * as z from "zod";
import { useState, useEffect } from "react";
import { useDeviceModal, useStoreDevice, useStoreUser } from "@/hooks/use-store-modal";
import Modal from "@/components/modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { createDevice } from "@/actions/create-device";
import { updateDevice } from "@/actions/update-device";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(3),
});

export const StoreModal = () => {
  const [loading, setLoading] = useState(false);
  const storeModal = useDeviceModal();
  const setActiveDevice = useStoreDevice((state) => state.setActiveDevice)
  const setDevices = useStoreDevice((state) => state.setDevices)
  const devices = useStoreDevice((state) => state.devices)
  const user = useStoreUser((state) => state.user)
  const router = useRouter()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  // Reset form saat modal dibuka atau device berubah
  useEffect(() => {
    if (storeModal.isOpen) {
      if (storeModal.editDevice) {
        form.reset({ name: storeModal.editDevice.deviceName });
      } else {
        form.reset({ name: "" });
      }
    }
  }, [storeModal.isOpen, storeModal.editDevice, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const deviceName = values.name;

      if (storeModal.isEdit && storeModal.editDevice) {
        // Edit existing device
        const updatedDevice = await updateDevice({
          deviceId: storeModal.editDevice.id,
          deviceName: deviceName
        });
        
        if (updatedDevice) {
          // Update Zustand store
          const updatedDevices = devices.map(d => 
            d.id === updatedDevice.id 
              ? { ...d, deviceName: updatedDevice.deviceName } 
              : d
          );
          setDevices(updatedDevices);
          
          // Update active device jika sedang aktif
          if (storeModal.editDevice.id === useStoreDevice.getState().activeDevice?.id) {
            setActiveDevice(updatedDevice.id, updatedDevice.deviceName);
          }
          
          toast.success("Device updated successfully");
        }
      } else {
        // Create new device
        const newDevice = await createDevice(deviceName);
        if (newDevice) {
          setDevices([...devices, newDevice]);
          setActiveDevice(newDevice.id, newDevice.deviceName);
          toast.success("Device created successfully");
          
          // Redirect hanya untuk device baru
          if (user?.id) {
            router.push(`/${user.id}/${newDevice.id}`);
          }
        }
      }
      
      storeModal.onClose();
    } catch (error: any) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={storeModal.isEdit ? "Edit Device" : "Tambah Perangkat Baru"}
      description={storeModal.isEdit 
        ? "Update your device information" 
        : "Tambahkan Nama perangkat baru untuk memulai"}
      isOpen={storeModal.isOpen}
      onClose={storeModal.onClose}
    >
      <div>
        <div className="space-y-4 py-2 pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Perangkat</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Kolam 1"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                <Button
                  disabled={loading}
                  variant="outline"
                  onClick={storeModal.onClose}
                  type="button" // Tambahkan type button
                >
                  Batal
                </Button>
                <Button disabled={loading} type="submit">
                  {storeModal.isEdit ? "Simpan" : "Buat"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Modal>
  );
};