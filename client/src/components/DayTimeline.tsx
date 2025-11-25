interface DayTimelineProps {
  total?: number;
  current?: number;
}

function DayTimeline({ total = 24, current = 0 }: DayTimelineProps) {
  const percentage = Math.round((current / total) * 100);
  return (
    <div className="glass-panel">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-[0.3em]">24-Day Countdown</p>
          <h4 className="text-2xl font-semibold">Day {current} / {total}</h4>
        </div>
        <span className="text-lg text-aurora">{percentage}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-aurora to-blush"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default DayTimeline;

