type SensorProps = {
  distance_cm: number;
  distance_inch: number;
};

export default function SensorCard({ distance_cm, distance_inch }: SensorProps) {
  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="font-bold text-lg">Sensor Data</h2>
      <p>Distance Cm: {distance_cm}°C</p>
      <p>Distance Inch: {distance_inch}%</p>
    </div>
  );
}
