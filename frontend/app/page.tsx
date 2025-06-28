'use client';
import { useEffect, useState } from "react";
import SensorCard from "@/components/SensorCard";
import LedControl from "@/components/LedControl";
import socket from "@/utils/socket";

type Sensor = { temperature: number, turbidity: number};

export default function Home() {
  const [sensor,   setSensor]   = useState<Sensor>({ temperature: 0, turbidity: 0});
  const [ledState, setLedState] = useState(false);

  // ambil dari localStorage
  useEffect(() => {
    const stored = localStorage.getItem("ledState");
    if (stored) setLedState(stored === "true");
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket error:", err);
    });

    socket.on("sensor_data", (data: Sensor) => {
      console.log("🌡️ sensor_data →", data);
      setSensor(data);
    });

    socket.on("led_state", (state: "ON" | "OFF") => {
      console.log("💡 led_state →", state);
      const isOn = state === "ON";
      setLedState(isOn);
      localStorage.setItem("ledState", String(isOn));
    });

    return () => {
      socket.off("sensor_data");
      socket.off("led_state");
      socket.disconnect();
    };
  }, []);

  const handleToggle = () => {
    const next = !ledState;
    console.log("🔀 UI toggle →", next);
    setLedState(next);
    localStorage.setItem("ledState", String(next));
    socket.emit("led_control", next);
  };

  return (
    <main className="max-w-xl mx-auto mt-10 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">
        IoT Sensor & LED Control
      </h1>

      <SensorCard temperature={sensor.temperature} turbidity={sensor.turbidity} />

      <LedControl
        deviceId="device1"
        ledState={ledState ? "ON" : "OFF"}
        onToggle={handleToggle}
      />
    </main>
  );
}
