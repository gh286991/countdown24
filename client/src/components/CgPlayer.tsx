import { useMemo } from 'react';
import { Branch, Game, Label, Menu, Say, Scene, prepareBranches } from 'react-visual-novel';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import 'react-visual-novel/dist/index.css';

const COVER_LABEL = 'cover';
const ENDING_LABEL = 'ending';
const INITIAL_BRANCH_ID = 'Story';

interface CgScene {
  id: string;
  label?: string;
  background?: string;
  dialogue?: Array<{ speaker?: string; text: string }>;
  choices?: Array<{ label: string; next: string }>;
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
  scenes?: Array<CgScene>;
  ending?: {
    title?: string;
    message?: string;
    image?: string;
    cta?: string;
  };
}

interface CgPlayerProps {
  script: CgScript | null;
}

function CgPlayer({ script }: CgPlayerProps) {
  const config = useMemo(() => buildGameConfig(script), [script]);

  if (!config) {
    return <p className="text-gray-400">尚未設定 CG JSON 或內容解析失敗。</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/80">
      <QueryParamProvider adapter={ReactRouter6Adapter}>
        <Game assets={{}} branches={config.branches} initialBranchId={INITIAL_BRANCH_ID}>
          {(render, preloadRes, progress) => {
            if (preloadRes.status === 'loading') {
              return (
                <div className="flex h-[520px] w-full flex-col items-center justify-center text-sm text-gray-300">
                  <p>載入 CG 場景...</p>
                  <p className="text-xs text-gray-400">完成度 {Math.round(progress * 100)}%</p>
                </div>
              );
            }

            if (preloadRes.status === 'failure') {
              return (
                <div className="flex h-[520px] w-full items-center justify-center text-sm text-red-300">
                  無法載入圖片資源，請檢查 JSON 內的圖片連結。
                </div>
              );
            }

            return <div className="h-[520px] w-full">{render()}</div>;
          }}
        </Game>
      </QueryParamProvider>
    </div>
  );
}

function buildGameConfig(script: CgScript | null) {
  if (!script) return null;
  const scenes = Array.isArray(script.scenes) ? script.scenes.filter((scene) => scene?.id) : [];
  const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));
  const startLabel = script.startScene && sceneMap.has(script.startScene) ? script.startScene : scenes[0]?.id || ENDING_LABEL;

  const BranchStory = () => (
    <Branch>
      {renderCover(script.cover, startLabel, Boolean(script.ending))}
      {scenes.map((scene, index) =>
        renderScene(scene, sceneMap, scenes[index + 1]?.id, Boolean(script.ending)),
      )}
      {renderEnding(script.ending)}
    </Branch>
  );

  const branches = prepareBranches({ BranchStory });
  return { branches };
}

function renderCover(cover: CgScript['cover'], startLabel: string | null, hasEnding: boolean) {
  if (!cover && !startLabel) return null;
  const subtitle = cover?.subtitle || '24-DAY COUNTDOWN';
  const title = cover?.title || 'CG PLAYBACK';
  const description = cover?.description || '點擊開始播放這段 CG 劇情。';
  const cta = cover?.cta || '開始播放';
  const targetLabel = startLabel || (hasEnding ? ENDING_LABEL : null);

  return (
    <Label label={COVER_LABEL} key={COVER_LABEL}>
      {(cover?.image || cover?.background) && <Scene src={cover.image || cover.background || ''} durationMs={800} />}
      <Say
        placement="middle"
        scheme="dark"
        scrim
        tag={{ text: subtitle, style: { letterSpacing: '0.4em' } }}
      >
        {title}
      </Say>
      {description ? (
        <Say placement="middle" scheme="dark" scrim>
          {description}
        </Say>
      ) : null}
      {targetLabel ? (
        <Menu
          placement="bottom"
          size="lg"
          scheme="dark"
          choices={[
            {
              label: cta,
              onClick: (ctx: any) => ctx.goToStatement(targetLabel),
            },
          ]}
        />
      ) : null}
    </Label>
  );
}

function renderScene(
  scene: CgScene,
  sceneMap: Map<string, CgScene>,
  fallbackNextId: string | undefined,
  hasEnding: boolean,
) {
  const nextLabel = resolveNextLabel(scene, sceneMap, fallbackNextId, hasEnding);
  const lines = Array.isArray(scene.dialogue) ? scene.dialogue : [];
  const choices = Array.isArray(scene.choices) ? scene.choices : [];

  return (
    <Label label={scene.id} key={scene.id}>
      {scene.background && <Scene src={scene.background} durationMs={800} />}
      {lines.map((line, idx) => (
        <Say
          key={`${scene.id}-line-${idx}`}
          placement="bottom"
          scheme="dark"
          scrim
          tag={line.speaker ? { text: line.speaker, style: { letterSpacing: '0.2em', color: scene.accent } } : undefined}
          next={!choices.length && idx === lines.length - 1 ? nextLabel : undefined}
        >
          {line.text}
        </Say>
      ))}
      {choices.length > 0 && (
        <Menu
          key={`${scene.id}-menu`}
          placement="bottom"
          size="lg"
          scheme="dark"
          choices={choices.map((choice, idx) => ({
            label: choice.label || `選項 ${idx + 1}`,
            onClick: (ctx: any) => {
              const target = resolveChoiceTarget(choice.next, sceneMap, nextLabel, hasEnding);
              if (target) {
                ctx.goToStatement(target);
              }
            },
          }))}
        />
      )}
      {!lines.length && !choices.length && nextLabel && (
        <Menu
          placement="bottom"
          size="md"
          scheme="dark"
          choices={[
            {
              label: '繼續',
              onClick: (ctx: any) => ctx.goToStatement(nextLabel),
            },
          ]}
        />
      )}
    </Label>
  );
}

function renderEnding(ending: CgScript['ending']) {
  if (!ending) return null;
  return (
    <Label label={ENDING_LABEL} key={ENDING_LABEL}>
      {ending.image && <Scene src={ending.image} durationMs={800} />}
      <Say
        placement="bottom"
        scheme="dark"
        scrim
        tag={{ text: ending.title || 'DAY CLEAR', style: { letterSpacing: '0.3em' } }}
      >
        {ending.message || '完成今日劇情，明天見。'}
      </Say>
      <Menu
        placement="bottom"
        size="md"
        scheme="dark"
        choices={[
          {
            label: ending.cta || '回到封面',
            onClick: (ctx: any) => ctx.goToStatement(COVER_LABEL),
          },
        ]}
      />
    </Label>
  );
}

function resolveNextLabel(
  scene: CgScene,
  sceneMap: Map<string, CgScene>,
  fallbackNextId: string | undefined,
  hasEnding: boolean,
): string {
  if (scene?.next && (sceneMap.has(scene.next) || scene.next === COVER_LABEL || scene.next === ENDING_LABEL)) {
    return scene.next;
  }
  if (fallbackNextId && sceneMap.has(fallbackNextId)) {
    return fallbackNextId;
  }
  if (hasEnding) return ENDING_LABEL;
  return COVER_LABEL;
}

function resolveChoiceTarget(
  next: string | undefined,
  sceneMap: Map<string, CgScene>,
  defaultLabel: string | undefined,
  hasEnding: boolean,
): string | undefined {
  if (next && (sceneMap.has(next) || next === COVER_LABEL || next === ENDING_LABEL)) {
    return next;
  }
  if (defaultLabel) {
    return defaultLabel;
  }
  return hasEnding ? ENDING_LABEL : COVER_LABEL;
}

export default CgPlayer;

