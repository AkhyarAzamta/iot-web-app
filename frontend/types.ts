export interface Users {
    id: string;
    fullname: string;
    email: string;
    telegramChatId: bigint;
}

export interface UsersDevice {
    id: string;
    deviceName: string;
    // user: Users
}

export interface SensorSetting {
  id: number
  deviceId: string
  userId: string
  type: "TEMPERATURE" | "TURBIDITY" | "TDS" | "PH"
  minValue: number
  maxValue: number
  enabled: boolean
  createdAt: string
}

export interface SensorData {
  deviceId: string
  temperature: number
  turbidity: number
  tds: number
  ph: number
}
