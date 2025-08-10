// actions/get-sensor-data.ts
import { authorizedFetch } from "@/lib/get-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
const URL = `${API_BASE}/sensordata`;

// Ekspor semua tipe yang diperlukan
export interface SensorData {
  id: number;
  deviceId: string;
  temperature: number;
  turbidity: number;
  tds: number;
  ph: number;
  createdAt: string;
}

export interface SensorDataFilters {
  time_filter?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  device_id?: string;
}

export interface SensorDataResponse {
  data: SensorData[];
  paging: {
    page: number;
    page_size: number;
    total_item: number;
    total_page: number;
  };
  filters?: {
    time_filter?: string;
    date_from?: string;
    date_to?: string;
  };
}

export async function getSensorData(filters: SensorDataFilters = {}): Promise<SensorDataResponse> {
  const params = new URLSearchParams();
  
  // Add pagination parameters
  params.append('page', (filters.page || 1).toString());
  params.append('page_size', (filters.page_size || 10).toString());
  
  // Add filter parameters if they exist
  if (filters.time_filter) {
    params.append('time_filter', filters.time_filter);
  }
  if (filters.date_from) {
    params.append('date_from', filters.date_from);
  }
  if (filters.date_to) {
    params.append('date_to', filters.date_to);
  }
  if (filters.device_id) {
    params.append('device_id', filters.device_id);
  }

  const requestUrl = `${URL}?${params.toString()}`;
  const res = await authorizedFetch(requestUrl);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`getSensorData failed [${res.status}]: ${body}`);
  }

  const payload = (await res.json()) as SensorDataResponse;
  
  return {
    data: payload.data || [],
    paging: payload.paging,
    filters: payload.filters,
  };
}