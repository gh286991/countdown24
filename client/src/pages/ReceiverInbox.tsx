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
        <p className="text-xs text-gray-400 uppercase tracking-[0.4em]">Gift Box</p>
        <h2 className="text-3xl font-semibold">🎁 我的禮物盒</h2>
        <p className="text-sm text-gray-400 mt-2">這裡是別人分享給你的倒數專案</p>
      </div>
      
      {status === 'loading' && <p className="text-gray-400">載入中...</p>}
      
      {status === 'succeeded' && inbox.length === 0 && (
        <div className="glass-panel p-12 text-center space-y-4">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-2xl font-semibold">禮物盒空空的</h3>
          <p className="text-gray-400">
            目前還沒有人分享倒數專案給你。
            <br />
            等待朋友發送邀請連結或 QR Code 給你吧！
          </p>
        </div>
      )}
      
      {inbox.length > 0 && (
        <div className="space-y-4">
          {inbox.map((assignment: any) => (
            <ReceiverCard
              key={assignment.id}
              assignment={assignment}
              onOpen={(item: any) => navigate(`/receiver/experience/${item.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ReceiverInbox;

