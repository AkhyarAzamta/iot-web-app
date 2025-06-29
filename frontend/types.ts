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
    deviceId: string;
    type: string;
    minValue: number;
    maxValue: number;
    enabled: boolean;
}

export interface SensorData {
    temperature: number;
    turbidity: number;
    tds: number;
    ph: number;
    timestamp: number;
}
