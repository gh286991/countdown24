import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ReceiverCard from '../components/ReceiverCard';
import { fetchReceiverInbox } from '../store/receiverSlice';
import type { RootState, AppDispatch } from '../store';

function ReceiverInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { inbox, status } = useSelector((state: RootState) => state.receiver);

  useEffect(() => {
    dispatch(fetchReceiverInbox());
  }, [dispatch]);

  return (
    <section className="max-w-4xl mx-auto py-12 px-6 space-y-4">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-[0.4em]">Receiver</p>
        <h2 className="text-3xl font-semibold">我的 24 天收件匣</h2>
      </div>
      {status === 'loading' && <p className="text-gray-400">載入中...</p>}
      <div className="space-y-4">
        {inbox.map((assignment: any) => (
          <ReceiverCard
            key={assignment.id}
            assignment={assignment}
            onOpen={(item: any) => navigate(`/receiver/experience/${item.id}`)}
          />
        ))}
      </div>
    </section>
  );
}

export default ReceiverInbox;

