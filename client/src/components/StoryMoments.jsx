function StoryMoments({ moments = [] }) {
  if (!moments.length) {
    return <p className="text-gray-400">尚未設定劇情片段。</p>;
  }

  return (
    <div className="space-y-4">
      {moments.map((moment) => (
        <div key={`${moment.day}-${moment.lineOne}`} className="story-card flex flex-col md:flex-row">
          <div className="md:w-1/3 h-48">
            <img src={moment.imageUrl} alt={`Day ${moment.day}`} className="object-cover w-full h-full" loading="lazy" />
          </div>
          <div className="story-card__content flex-1">
            <p className="text-xs text-aurora uppercase tracking-[0.3em]">Day {moment.day}</p>
            <h4 className="text-lg font-semibold">
              {moment.speaker ? `${moment.speaker} · ` : ''}
              {moment.lineOne}
            </h4>
            <p className="text-gray-300">{moment.lineTwo}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StoryMoments;
