"use server";

import { cookies } from "next/headers";
import ExcelJS from "exceljs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export const exportSensorDataToExcel = async (filters: {
  device_id: string;
  date_from: string;
  date_to: string;
}) => {
  try {
    // Get token from cookies
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;
    
    if (!token) {
      throw new Error("Not authenticated: token is missing");
    }

    // Build URL with filters
    const params = new URLSearchParams();
    params.append("device_id", filters.device_id);
    params.append("date_from", filters.date_from);
    params.append("date_to", filters.date_to);
    params.append("page_size", "1000000");

    const url = `${API_BASE}/sensordata?${params.toString()}`;
    
    // Fetch data with token
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`getSensorData failed [${response.status}]: ${body}`);
    }

    const result = await response.json();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sensor Data");
    
    // Define columns
    worksheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 25 },
      { 
        header: "Temperature (°C)", 
        key: "temperature", 
        width: 20,
        style: { numFmt: '0.00' }
      },
      { 
        header: "Turbidity (%)", 
        key: "turbidity", 
        width: 20,
        style: { numFmt: '0.0000' }
      },
      { 
        header: "TDS (ppm)", 
        key: "tds", 
        width: 15,
        style: { numFmt: '0' }
      },
      { 
        header: "pH", 
        key: "ph", 
        width: 15,
        style: { numFmt: '0.00' }
      },
    ];
    
    // Add data rows
    result.data.forEach((item: { 
      createdAt: string;
      temperature: string | number;
      turbidity: string | number;
      tds: string | number;
      ph: string | number;
    }) => {
      worksheet.addRow({
        timestamp: new Date(item.createdAt).toLocaleString("id-ID"),
        temperature: typeof item.temperature === 'string' 
          ? parseFloat(item.temperature) 
          : item.temperature,
        turbidity: typeof item.turbidity === 'string' 
          ? parseFloat(item.turbidity) 
          : item.turbidity,
        tds: typeof item.tds === 'string' 
          ? parseInt(item.tds, 10) 
          : item.tds,
        ph: typeof item.ph === 'string' 
          ? parseFloat(item.ph) 
          : item.ph,
      });
    });
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Convert to base64 for easier client-side handling
    const base64 = Buffer.from(buffer).toString('base64');
    
    return {
      data: base64,
      fileName: `sensor-data-${filters.date_from}-to-${filters.date_to}.xlsx`
    };
  } catch (error: unknown) {
    console.error("Export failed:", error);
    
    let errorMessage = "Failed to generate Excel file";
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};