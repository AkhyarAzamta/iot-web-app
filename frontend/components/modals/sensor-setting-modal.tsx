"use client";

import * as React from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/modal";
import { useSensorModal } from "@/hooks/use-store-modal";
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

// schema hanya field yang di‑edit
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

  // 1) Setup form
  const form = useForm<EditSchema>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      minValue: modalData?.minValue ?? 0,
      maxValue: modalData?.maxValue ?? 0,
      enabled: modalData?.enabled ?? false,
    },
  });

  // 2) Reset setiap buka modal dengan data terbaru
  React.useEffect(() => {
    if (modalData) {
      form.reset({
        minValue: modalData.minValue,
        maxValue: modalData.maxValue,
        enabled: modalData.enabled,
      });
    }
  }, [modalData, form]);

  // 3) Jangan render kalau belum siap
  if (!isOpen || !modalData) return null;

  // 4) Submit
  const onSubmit = async (vals: EditSchema) => {
    setLoading(true);
    try {
      await updateSensorSetting({
        id: modalData.id,
        type: modalData.type,
        deviceId: modalData.deviceId,
        minValue: vals.minValue,
        maxValue: vals.maxValue,
        enabled: vals.enabled,
      });
      onClose();
      // TODO: re-fetch tabel
onSaved(); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 5) JSX
  return (
    <Modal
      title="Edit Sensor Setting"
      description={`Type: ${modalData.type}`}
      isOpen={isOpen}
      onClose={onClose}
    >
      {/* pastikan generic <Form<EditSchema>> agar control tipenya tepat */}
      <Form<EditSchema> {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Min Value */}
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
                    // PAKSA keluar number, bukan string
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Max Value */}
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

          {/* Enabled */}
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

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Save
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
