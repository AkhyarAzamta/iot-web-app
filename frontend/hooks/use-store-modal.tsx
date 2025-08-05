// hooks/use-store.ts
import { create } from "zustand";

export interface DeviceOption {
  id: string;
  deviceName: string;
}

export interface User {
  id: string;
  fullname: string;
  email: string;
  devices: DeviceOption[];
  created_at: string;
}

/** ─────── User Store ─────── **/
interface UseStoreUser {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}
export const useStoreUser = create<UseStoreUser>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

/** ─────── Device Store ─────── **/
interface UseStoreDevice {
  devices: DeviceOption[];
  activeDevice: DeviceOption | null;
  setDevices: (devices: DeviceOption[]) => void;
  setActiveDevice: (id: string, deviceName: string) => void;
  clearDevice: () => void;
}
export const useStoreDevice = create<UseStoreDevice>((set) => ({
  devices: [],
  activeDevice: null,
  setDevices: (devices) => set({ devices }),
  setActiveDevice: (id, deviceName) =>
    set({ 
      activeDevice: id && deviceName ? { id, deviceName } : null 
    }),
  clearDevice: () => set({ activeDevice: null }),
}));

/** ─────── Store Modal (for creating a new Device) ─────── **/
export const useDeviceModal = create<{
  isOpen: boolean;
  isEdit: boolean;
  editDevice: DeviceOption | null;
  onOpen: () => void;
  onClose: () => void;
  onOpenEdit: (device: DeviceOption) => void;
}>((set) => ({
  isOpen: false,
  isEdit: false,
  editDevice: null,
  onOpen: () => set({ isOpen: true, isEdit: false, editDevice: null }),
  onClose: () => set({ isOpen: false, isEdit: false, editDevice: null }),
  onOpenEdit: (device) => set({ isOpen: true, isEdit: true, editDevice: device }),
}));

/** ─────── Sensor Setting Modal ─────── **/
// payload shape when opening the edit‐sensor modal
export interface SensorModalData {
  id: number;
  type: string;
  deviceId: string;
  minValue: number;
  maxValue: number;
  enabled: boolean;
}
export const useSensorModal = create<{
  isOpen: boolean;
  modalData: SensorModalData | null;
  onOpen: (data: SensorModalData) => void;
  onClose: () => void;
}>((set) => ({
  isOpen: false,
  modalData: null,
  onOpen: (data) => set({ isOpen: true, modalData: data }),
  onClose: () => set({ isOpen: false, modalData: null }),
}));
