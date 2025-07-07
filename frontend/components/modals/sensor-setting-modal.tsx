"use client";

import * as React from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/modal";
import { useSensorModal, useStoreUser } from "@/hooks/use-store-modal";
import { updateSensorSetting } from "@/actions/update-sensor-setting";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import eventBus from "@/lib/eventBus";

const editSchema = z.object({
  minValue: z.number(),
  maxValue: z.number(),
  enabled: z.boolean(),
});
type EditSchema = z.infer<typeof editSchema>;

interface Props {
  onSaved: () => void;
}

export const SensorSettingModal: React.FC<Props> = ({ onSaved }) => {
  const { isOpen, onClose, modalData } = useSensorModal();
  const [loading, setLoading] = React.useState(false);
  const activeUser = useStoreUser((state) => state.user);
  
  const ackResolverRef = React.useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const form = useForm<EditSchema>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      minValue: modalData?.minValue ?? 0,
      maxValue: modalData?.maxValue ?? 0,
      enabled: modalData?.enabled ?? false,
    },
  });

  React.useEffect(() => {
    if (modalData && isOpen) {
      form.reset({
        minValue: modalData.minValue,
        maxValue: modalData.maxValue,
        enabled: modalData.enabled,
      });
    }
  }, [modalData, isOpen, form]);

  // Dengarkan ACK meskipun modal sudah ditutup
  React.useEffect(() => {
    if (!activeUser?.id) return;

    const eventName = `${activeUser.id}-sensor_ack`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSensorAck = (data: any) => {      
      // Normalisasi data
      const status = data.status || (data.success ? 'success' : 'error');
      const message = data.message || data.text || '';
      
      if (ackResolverRef.current) {
        console.log(`[Modal] Memproses ACK: ${status}`);
        
        if (status === 'success') {
          ackResolverRef.current.resolve();
        } else {
          ackResolverRef.current.reject(new Error(message));
        }
        
        ackResolverRef.current = null;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    eventBus.on(eventName, handleSensorAck);
    
    return () => {
      console.log(`[Modal] Menghapus listener untuk: ${eventName}`);
      eventBus.off(eventName, handleSensorAck);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeUser?.id]);

  if (!isOpen || !modalData) return null;

  const onSubmit = async (vals: EditSchema) => {
    setLoading(true);
    onClose(); // Tutup modal segera
    
    try {
      // Kirim pembaruan ke server
      await updateSensorSetting({
        id: modalData.id,
        type: modalData.type,
        deviceId: modalData.deviceId,
        minValue: vals.minValue,
        maxValue: vals.maxValue,
        enabled: vals.enabled,
      });

      // Buat promise untuk ACK
      const ackPromise = new Promise<void>((resolve, reject) => {
        ackResolverRef.current = { resolve, reject };
        
        timeoutRef.current = setTimeout(() => {
          if (ackResolverRef.current) {
            console.warn('ACK Timeout');
            reject(new Error("Timeout: Tidak ada respon dari perangkat"));
            ackResolverRef.current = null;
          }
        }, 15000);
      });

      // Tampilkan toast yang menunggu ACK
      toast.promise(ackPromise, {
        loading: 'Menunggu konfirmasi dari perangkat...',
        success: () => {
          onSaved();
          return 'Pengaturan berhasil dikonfirmasi!';
        },
        error: (error) => {
          console.error('ACK Error:', error);
          return 'Gagal menerima konfirmasi';
        },
      });

      await ackPromise;
    } catch (error) {
      console.error('Submit Error:', error);
      toast.error('Gagal menyimpan pengaturan', {
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
      });
    } finally {
      setLoading(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      ackResolverRef.current = null;
    }
  };
  // 6) JSX
  return (
    <Modal
      title="Edit Sensor Setting"
      description={`Type: ${modalData.type}`}
      isOpen={isOpen}
      onClose={onClose}
    >
      <Form<EditSchema> {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="minValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Value</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Value</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Enabled</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};