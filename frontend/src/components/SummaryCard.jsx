export default function SummaryCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value ?? '—'}</div>
    </div>
  );
}
