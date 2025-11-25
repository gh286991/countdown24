import { useState, ChangeEvent } from 'react';
import { HiOutlineFilm, HiOutlineXMark } from 'react-icons/hi2';
import ImageUploadField from './ImageUploadField';

interface CgDialogue {
  speaker?: string;
  text: string;
}

interface CgChoice {
  label: string;
  next: string;
}

interface CgScene {
  id: string;
  label?: string;
  background?: string;
  dialogue?: CgDialogue[];
  choices?: CgChoice[];
  next?: string;
  accent?: string;
}

interface CgScript {
  cover?: {
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    background?: string;
    cta?: string;
  };
  startScene?: string;
  scenes?: CgScene[];
  ending?: {
    title?: string;
    message?: string;
    image?: string;
    cta?: string;
  };
}

interface CgScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  countdownId?: string;
}

function CgScriptEditor({ value, onChange, countdownId }: CgScriptEditorProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [script, setScript] = useState<CgScript>(() => {
    try {
      return JSON.parse(value);
    } catch {
      return { scenes: [] };
    }
  });

  const updateScript = (newScript: CgScript) => {
    setScript(newScript);
    onChange(JSON.stringify(newScript, null, 2));
  };

  // 快速新增完整場景
  const addQuickScene = () => {
    const sceneNum = (script.scenes?.length || 0) + 1;
    const newScene: CgScene = {
      id: `scene${sceneNum}`,
      background: '',
      dialogue: [{ text: '' }],
      next: '',
    };
    updateScript({
      ...script,
      scenes: [...(script.scenes || []), newScene],
    });
  };

  const updateScene = (index: number, field: keyof CgScene, value: any) => {
    const scenes = [...(script.scenes || [])];
    scenes[index] = { ...scenes[index], [field]: value };
    updateScript({ ...script, scenes });
  };

  const deleteScene = (index: number) => {
    const scenes = [...(script.scenes || [])];
    scenes.splice(index, 1);
    updateScript({ ...script, scenes });
  };

  const updateDialogue = (sceneIndex: number, dialogueIndex: number, field: keyof CgDialogue, val: string) => {
    const scenes = [...(script.scenes || [])];
    const dialogue = [...(scenes[sceneIndex].dialogue || [])];
    dialogue[dialogueIndex] = { ...dialogue[dialogueIndex], [field]: val };
    scenes[sceneIndex] = { ...scenes[sceneIndex], dialogue };
    updateScript({ ...script, scenes });
  };

  const addDialogue = (sceneIndex: number) => {
    const scenes = [...(script.scenes || [])];
    const dialogue = [...(scenes[sceneIndex].dialogue || []), { text: '' }];
    scenes[sceneIndex] = { ...scenes[sceneIndex], dialogue };
    updateScript({ ...script, scenes });
  };

  const deleteDialogue = (sceneIndex: number, dialogueIndex: number) => {
    const scenes = [...(script.scenes || [])];
    const dialogue = [...(scenes[sceneIndex].dialogue || [])];
    dialogue.splice(dialogueIndex, 1);
    scenes[sceneIndex] = { ...scenes[sceneIndex], dialogue };
    updateScript({ ...script, scenes });
  };

  const updateChoice = (sceneIndex: number, choiceIndex: number, field: keyof CgChoice, val: string) => {
    const scenes = [...(script.scenes || [])];
    const choices = [...(scenes[sceneIndex].choices || [])];
    choices[choiceIndex] = { ...choices[choiceIndex], [field]: val };
    scenes[sceneIndex] = { ...scenes[sceneIndex], choices };
    updateScript({ ...script, scenes });
  };

  const addChoice = (sceneIndex: number) => {
    const scenes = [...(script.scenes || [])];
    const choices = [...(scenes[sceneIndex].choices || []), { label: '', next: '' }];
    scenes[sceneIndex] = { ...scenes[sceneIndex], choices };
    updateScript({ ...script, scenes });
  };

  const deleteChoice = (sceneIndex: number, choiceIndex: number) => {
    const scenes = [...(script.scenes || [])];
    const choices = [...(scenes[sceneIndex].choices || [])];
    choices.splice(choiceIndex, 1);
    scenes[sceneIndex] = { ...scenes[sceneIndex], choices };
    updateScript({ ...script, scenes });
  };

  return (
    <div className="space-y-3">
      {/* 模式切換 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">CG 劇本編輯器</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'visual'
                ? 'bg-aurora text-slate-900 font-semibold'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <HiOutlineFilm className="w-4 h-4" />
              場景編輯
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('json')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'json'
                ? 'bg-aurora text-slate-900 font-semibold'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {} JSON
          </button>
        </div>
      </div>

      {mode === 'json' ? (
        // JSON 編輯模式
        <div>
          <textarea
            value={value}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              onChange(e.target.value);
              try {
                setScript(JSON.parse(e.target.value));
              } catch {
                // 保持原有的 script
              }
            }}
            className="w-full bg-black/40 font-mono text-xs rounded-xl px-4 py-3 min-h-[400px] border border-white/10 focus:border-aurora focus:outline-none"
            placeholder="直接編輯 JSON..."
          />
          <p className="text-xs text-gray-400 mt-2">
            進階模式：直接編輯 JSON。切換到場景編輯使用視覺化介面。
          </p>
        </div>
      ) : (
        // 場景卡片式編輯
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {/* 封面卡片 */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <HiOutlineFilm className="w-5 h-5" />
              <h4 className="text-sm font-bold text-blue-300">開場封面</h4>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="標題 (例: DAY 1 / 24)"
                value={script.cover?.title || ''}
                onChange={(e) => updateScript({ ...script, cover: { ...script.cover, title: e.target.value } })}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="副標題 (例: 序章・命運的邂逅)"
                value={script.cover?.subtitle || ''}
                onChange={(e) => updateScript({ ...script, cover: { ...script.cover, subtitle: e.target.value } })}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
              />
              <ImageUploadField
                placeholder="🖼️ 封面圖片網址"
                value={script.cover?.image || ''}
                onChange={(url) => updateScript({ ...script, cover: { ...script.cover, image: url } })}
                folder={countdownId ? `countdowns/${countdownId}/cg/cover` : undefined}
              />
            </div>
          </div>

          {/* 場景卡片列表 */}
          <div className="space-y-3">
            {(script.scenes || []).map((scene, sceneIndex) => (
              <div
                key={scene.id}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:border-aurora/30 transition-colors"
              >
                {/* 場景標題列 */}
                <div className="bg-white/5 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                      #{sceneIndex + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="場景 ID (例: roofEntry)"
                      value={scene.id}
                      onChange={(e) => updateScene(sceneIndex, 'id', e.target.value)}
                      className="flex-1 bg-transparent text-sm font-semibold focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteScene(sceneIndex)}
                    className="text-xs text-red-400 hover:text-red-300 px-2"
                  >
                    🗑️
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {/* 背景圖 */}
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">🌄 背景</span>
                    <ImageUploadField
                      value={scene.background || ''}
                      onChange={(url) => updateScene(sceneIndex, 'background', url)}
                      placeholder="背景圖片網址"
                      folder={
                        countdownId ? `countdowns/${countdownId}/cg/scenes/${scene.id || `scene-${sceneIndex + 1}`}` : undefined
                      }
                      inputClassName="bg-white/5 rounded-lg px-3 py-1.5 text-sm"
                      previewClassName="h-32 w-full mt-2 rounded-lg border border-white/10"
                    />
                  </div>

                  {/* 對話列表 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">💬 對話</span>
                      <button
                        type="button"
                        onClick={() => addDialogue(sceneIndex)}
                        className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                      >
                        + 對話
                      </button>
                    </div>
                    {(scene.dialogue || []).map((dialogue, dialogueIndex) => (
                      <div key={dialogueIndex} className="flex gap-2 items-start">
                        <input
                          type="text"
                          placeholder="角色"
                          value={dialogue.speaker || ''}
                          onChange={(e) => updateDialogue(sceneIndex, dialogueIndex, 'speaker', e.target.value)}
                          className="w-20 bg-black/20 rounded px-2 py-1.5 text-xs"
                        />
                        <textarea
                          placeholder="對話內容"
                          value={dialogue.text}
                          onChange={(e) => updateDialogue(sceneIndex, dialogueIndex, 'text', e.target.value)}
                          className="flex-1 bg-black/20 rounded px-2 py-1.5 text-xs min-h-[40px] resize-none"
                          rows={2}
                        />
                        <button
                          type="button"
                          onClick={() => deleteDialogue(sceneIndex, dialogueIndex)}
                          className="text-red-400 hover:text-red-300 text-xs px-1"
                        >
                          <HiOutlineXMark className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 選項分支 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">🎯 選項分支</span>
                      <button
                        type="button"
                        onClick={() => addChoice(sceneIndex)}
                        className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30"
                      >
                        + 選項
                      </button>
                    </div>
                    {(scene.choices || []).map((choice, choiceIndex) => (
                      <div key={choiceIndex} className="flex gap-2 items-center bg-green-500/5 rounded-lg p-2">
                        <input
                          type="text"
                          placeholder="選項文字"
                          value={choice.label}
                          onChange={(e) => updateChoice(sceneIndex, choiceIndex, 'label', e.target.value)}
                          className="flex-1 bg-white/10 rounded px-2 py-1 text-xs"
                        />
                        <span className="text-xs text-gray-500">→</span>
                        <input
                          type="text"
                          placeholder="跳轉場景 ID"
                          value={choice.next}
                          onChange={(e) => updateChoice(sceneIndex, choiceIndex, 'next', e.target.value)}
                          className="w-32 bg-white/10 rounded px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => deleteChoice(sceneIndex, choiceIndex)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          <HiOutlineXMark className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 下一個場景 */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <span className="text-xs text-gray-400">↪️ 下一場景</span>
                    <input
                      type="text"
                      placeholder="場景 ID 或留空自動跳轉"
                      value={scene.next || ''}
                      onChange={(e) => updateScene(sceneIndex, 'next', e.target.value)}
                      className="flex-1 bg-white/5 rounded px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 新增場景按鈕 */}
          <button
            type="button"
            onClick={addQuickScene}
            className="w-full py-3 border-2 border-dashed border-white/20 rounded-xl text-sm text-gray-400 hover:border-aurora hover:text-aurora transition-colors"
          >
            ＋ 新增場景
          </button>

          {/* 結局卡片 */}
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-4 border border-pink-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎉</span>
              <h4 className="text-sm font-bold text-pink-300">結局畫面</h4>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="結局標題 (例: DAY CLEAR)"
                value={script.ending?.title || ''}
                onChange={(e) => updateScript({ ...script, ending: { ...script.ending, title: e.target.value } })}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
              />
              <textarea
                placeholder="結局訊息 (例: 完成今日劇情，明天見。)"
                value={script.ending?.message || ''}
                onChange={(e) => updateScript({ ...script, ending: { ...script.ending, message: e.target.value } })}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm placeholder-gray-500 min-h-[60px]"
              />
              <ImageUploadField
                placeholder="🖼️ 結局圖片網址"
                value={script.ending?.image || ''}
                onChange={(url) => updateScript({ ...script, ending: { ...script.ending, image: url } })}
                folder={countdownId ? `countdowns/${countdownId}/cg/ending` : undefined}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-blue-500/5 rounded-lg p-3">
        <span>💡</span>
        <p>
          <strong>提示：</strong>
          {mode === 'visual' 
            ? '使用場景卡片快速建立故事流程。場景 ID 用於選項跳轉，例如「前往屋頂」選項可跳到 ID 為 roofScene 的場景。'
            : '進階用戶可直接編輯 JSON。修改後切換回場景編輯查看結果。'
          }
        </p>
      </div>
    </div>
  );
}

export default CgScriptEditor;
