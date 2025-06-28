type SensorProps = {
  temperature: number;
  turbidity: number;
};

export default function SensorCard({ temperature, turbidity }: SensorProps) {
  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="font-bold text-lg">Sensor Data</h2>
      <p>Distance Cm: {temperature}°C</p>
      <p>Distance Inch: {turbidity}%</p>
    </div>
  );
}
