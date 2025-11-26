import { useState, ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineGift, HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2';
import { useToast } from '../components/ToastProvider';
import { upgradeToCreator, updateProfile } from '../store/authSlice';
import type { RootState, AppDispatch } from '../store';

function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  if (!user) {
    return null;
  }

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await dispatch(upgradeToCreator()).unwrap();
      showToast('成功開通編輯者權限！', 'success');
      setShowUpgradeModal(false);
      // 重新載入頁面以更新導航
      window.location.href = '/creator';
    } catch (error: any) {
        showToast(error || '升級失敗', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await dispatch(updateProfile(editForm)).unwrap();
        showToast('個人資料已更新！', 'success');
      setIsEditing(false);
    } catch (error: any) {
        showToast(error || '更新失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: user.name,
      avatar: user.avatar || '',
      bio: user.bio || '',
    });
    setIsEditing(false);
  };

  return (
    <section className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-[0.4em]">Profile</p>
        <h2 className="text-3xl font-semibold">個人資料</h2>
      </div>

      {/* 基本資訊 */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">基本資訊</h3>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm px-4 py-2 bg-aurora/20 text-aurora hover:bg-aurora/30 rounded-lg transition-colors"
            >
              ✏️ 編輯
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="text-sm px-4 py-2 bg-aurora hover:bg-aurora/90 text-slate-900 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">名稱</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full mt-1 bg-white/5 rounded-xl px-4 py-2 border border-white/10 focus:border-aurora focus:outline-none"
              />
            ) : (
              <p className="text-lg mt-1">{user.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400">Email</label>
            <p className="text-lg mt-1 text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-600 mt-1">Email 無法修改</p>
          </div>

          <div>
            <label className="text-sm text-gray-400">頭像網址</label>
            {isEditing ? (
              <input
                type="url"
                value={editForm.avatar}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, avatar: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
                className="w-full mt-1 bg-white/5 rounded-xl px-4 py-2 border border-white/10 focus:border-aurora focus:outline-none"
              />
            ) : (
              <div className="mt-2">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <p className="text-sm text-gray-500">尚未設定</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400">個人簡介</label>
            {isEditing ? (
              <textarea
                value={editForm.bio}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="寫點關於自己的介紹..."
                rows={3}
                className="w-full mt-1 bg-white/5 rounded-xl px-4 py-2 border border-white/10 focus:border-aurora focus:outline-none"
              />
            ) : (
              <p className="text-lg mt-1">{user.bio || '尚未填寫'}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400">角色</label>
            <p className="text-lg mt-1">
              {user.role === 'creator' ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-aurora/20 text-aurora rounded-full text-sm">
                  ✏️ 編輯者
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                  <span className="flex items-center gap-1">
                    <HiOutlineGift className="w-4 h-4" />
                    禮物接收者
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 升級選項 - 僅接收者可見 */}
        {user.role === 'receiver' && (
          <div className="pt-6 border-t border-white/10">
            <h3 className="text-lg font-semibold mb-2">角色升級</h3>
            <p className="text-sm text-gray-400 mb-4">
              想要創建自己的倒數專案嗎？開通編輯者權限即可開始創建！
            </p>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-aurora to-blush rounded-xl text-slate-900 font-semibold hover:scale-105 transition-transform"
            >
              <span className="flex items-center gap-2">
                <HiOutlineSparkles className="w-4 h-4" />
                開通編輯者
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 升級確認模態視窗 */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl">
            <button
              type="button"
              className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white"
              onClick={() => setShowUpgradeModal(false)}
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-semibold mb-4">開通編輯者</h3>
            <div className="space-y-4 mb-6">
              <p className="text-gray-300">
                開通編輯者後，你將能夠：
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-aurora">✓</span>
                  <span>創建自己的倒數專案</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-aurora">✓</span>
                  <span>編輯每日小卡內容（CG 故事或禮品體驗）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-aurora">✓</span>
                  <span>生成邀請禮品卡分享給他人</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-aurora">✓</span>
                  <span>管理接收者列表</span>
                </li>
              </ul>
              <p className="text-xs text-gray-500 pt-2">
                注意：你仍然可以作為接收者查看別人分享給你的倒數專案。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-semibold transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="py-2 bg-aurora hover:bg-aurora/90 rounded-xl text-slate-900 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {upgrading ? '處理中...' : '確認開通'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfilePage;
