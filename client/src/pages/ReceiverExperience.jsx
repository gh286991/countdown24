import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import CgPlayer from '../components/CgPlayer';
import DayTimeline from '../components/DayTimeline';
import RewardGrid from '../components/RewardGrid';
import { fetchReceiverExperience } from '../store/receiverSlice';

function ReceiverExperience() {
  const { assignmentId } = useParams();
  const dispatch = useDispatch();
  const { selected, experienceStatus } = useSelector((state) => state.receiver);

  useEffect(() => {
    if (assignmentId) {
      dispatch(fetchReceiverExperience(assignmentId));
    }
  }, [assignmentId, dispatch]);

  if (experienceStatus === 'loading' || !selected) {
    return <p className="text-gray-400 text-center py-12">載入禮物內容中...</p>;
  }

  const { countdown } = selected;

  const isStoryCountdown = countdown.type === 'story';

  return (
    <section className="max-w-5xl mx-auto py-10 px-6 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-400">你收到的倒數</p>
        <h2 className="text-4xl font-semibold">{countdown.title}</h2>
        <p className="text-gray-300">{countdown.description}</p>
      </div>
      {isStoryCountdown ? (
        <CgPlayer script={countdown.cgScript} />
      ) : (
        <>
          <img src={countdown.coverImage} alt={countdown.title} className="w-full h-80 object-cover rounded-3xl" />
          <DayTimeline total={countdown.totalDays} current={countdown.availableDay} />
          <RewardGrid rewards={countdown.qrRewards} />
        </>
      )}
    </section>
  );
}

export default ReceiverExperience;
