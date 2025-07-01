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

interface useStoreUserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

interface useStoreModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

interface useStoreDeviceStore {
  devices: DeviceOption[];
  activeDevice: DeviceOption | null;
  setDevices: (devices: DeviceOption[]) => void;
  setActiveDevice: (id: string, deviceName: string) => void;
  clearDevice: () => void;
}

export const useStoreUser = create<useStoreUserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

export const useStoreModal = create<useStoreModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export const useStoreDevice = create<useStoreDeviceStore>((set) => ({
  devices: [],
  activeDevice: null,
  setDevices: (devices) => set({ devices }),
  setActiveDevice: (id, deviceName) => set({ activeDevice: { id, deviceName } }),
  clearDevice: () => set({ activeDevice: null }),
}));
