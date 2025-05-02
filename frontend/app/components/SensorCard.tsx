type SensorProps = {
  temperature: number;
  humidity: number;
};

export default function SensorCard({ temperature, humidity }: SensorProps) {
  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="font-bold text-lg">Sensor Data</h2>
      <p>Temperature: {temperature}°C</p>
      <p>Humidity: {humidity}%</p>
    </div>
  );
}
