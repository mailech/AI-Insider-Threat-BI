function StatCard({ title, value, color }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg hover:scale-105 transition duration-300">

      <h3 className="text-gray-400 text-sm">
        {title}
      </h3>

      <h1 className={`text-4xl font-bold mt-3 ${color}`}>
        {value}
      </h1>

    </div>
  );
}

export default StatCard;