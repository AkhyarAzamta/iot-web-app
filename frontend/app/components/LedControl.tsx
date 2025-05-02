type LedControlProps = {
  deviceId: string;
  ledState: string;
  onToggle: (state: boolean) => void;
};

export default function LedControl({ deviceId, ledState, onToggle }: LedControlProps) {
  return (
    <div className="p-4 border rounded-lg shadow mt-4">
      <h2 className="font-bold text-lg">LED Control - {deviceId}</h2>
      <p>Status: <span className="font-semibold">{ledState}</span></p>
      <button
        onClick={() => onToggle(ledState === 'ON')}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-800"
      >
        {ledState === 'ON' ? 'Turn OFF' : 'Turn ON'}
      </button>
    </div>
  );
}
