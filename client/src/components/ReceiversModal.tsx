import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReceivers, removeReceiver } from '../store/countdownSlice';
import type { RootState, AppDispatch } from '../store';

interface ReceiversModalProps {
  countdownId: string;
  isOpen: boolean;
  onClose: () => void;
}

function ReceiversModal({ countdownId, isOpen, onClose }: ReceiversModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { receivers, receiversStatus } = useSelector((state: RootState) => state.countdowns);

  useEffect(() => {
    if (isOpen && countdownId) {
      dispatch(fetchReceivers(countdownId));
    }
  }, [isOpen, countdownId, dispatch]);

  const handleRemove = async (receiverId: string) => {
    if (!window.confirm('確定要移除此接收者嗎？')) return;
    await dispatch(removeReceiver({ id: countdownId, receiverId }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 p-6 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
        >
          ✕
        </button>

        <h3 className="text-2xl font-semibold mb-4">接收者管理</h3>

        {receiversStatus === 'loading' && (
          <p className="text-gray-300 text-center py-8">載入中...</p>
        )}

        {receiversStatus === 'succeeded' && receivers.length === 0 && (
          <p className="text-gray-400 text-center py-8">尚未指派任何接收者</p>
        )}

        {receiversStatus === 'succeeded' && receivers.length > 0 && (
          <div className="overflow-y-auto flex-1">
            <div className="space-y-3">
              {receivers.map((receiver) => (
                <div
                  key={receiver.id}
                  className="glass-panel p-4 flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                  {/* 頭像 */}
                  <div className="flex-shrink-0">
                    {receiver.user?.avatar ? (
                      <img
                        src={receiver.user.avatar}
                        alt={receiver.user.name || receiver.user.email}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-aurora to-purple-500 flex items-center justify-center text-white font-bold">
                        {(receiver.user?.name || receiver.user?.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 用戶資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {receiver.user?.name && (
                        <span className="text-sm font-semibold truncate">{receiver.user.name}</span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          receiver.status === 'active'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {receiver.status === 'active' ? '啟用中' : receiver.status}
                      </span>
                    </div>
                    {receiver.user?.email && (
                      <p className="text-xs text-gray-400 truncate">{receiver.user.email}</p>
                    )}
                    {receiver.unlockedOn && (
                      <p className="text-xs text-gray-500 mt-1">
                        解鎖：{new Date(receiver.unlockedOn).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* 刪除按鈕 */}
                  <button
                    type="button"
                    onClick={() => handleRemove(receiver.receiverId)}
                    className="flex-shrink-0 px-3 py-2 text-sm rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                  >
                    🗑️ 移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiversModal;

