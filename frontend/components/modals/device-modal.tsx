/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as z from "zod";
// import axios from "axios";

import { useState } from "react";
import { useDeviceModal, useStoreDevice } from "@/hooks/use-store-modal";
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
// import toast from "react-hot-toast";

const formSchema = z.object({
  name: z.string().min(3),
});

export const StoreModal = () => {
  const [loading, setLoading] = useState(false);

  const storeModal = useDeviceModal();
  const setActiveDevice = useStoreDevice((state) => state.setActiveDevice)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

const onSubmit = async (values: z.infer<typeof formSchema>) => {
  try {
    setLoading(true);
    const deviceName = values.name;

    // ✅ Tunggu hasil device baru
    const newDevice = await createDevice(deviceName); 

    // ✅ Set sebagai active device
    setActiveDevice(newDevice.id, newDevice.deviceName);

    // ✅ Tutup modal
    storeModal.onClose();

  } catch (error: any) {
    console.log(error);
    // toast.error("Gagal Membuat Toko");
  } finally {
    setLoading(false);
  }
};


  return (
    <Modal
      title="Tambahkan Device"
      description="Tambahkan Device Baru untuk mengontrol perangkat Anda."
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
                >
                  Cancel
                </Button>
                <Button disabled={loading} type="submit">
                  Continue
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Modal>
  );
};
