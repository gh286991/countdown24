// 列印小卡模板定義
// Canvas 尺寸: 900 x 500

import christmasClassicJson from './templates/christmas-classic.json';
import winterSnowJson from './templates/winter-snow.json';
import cuteGiftBoxJson from './templates/cute-gift-box.json';
import starryNightJson from './templates/starry-night.json';
import minimalTreeJson from './templates/minimal-tree.json';
import luxGoldenHollyJson from './templates/lux-golden-holly.json';
import midnightVelvetJson from './templates/midnight-velvet.json';
import blankJson from './templates/blank.json';

export interface PrintCardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // SVG data URL for preview
  canvasJson: any;
}

// 從 JSON 檔案載入模板
export const printCardTemplates: PrintCardTemplate[] = [
  christmasClassicJson as PrintCardTemplate,
  winterSnowJson as PrintCardTemplate,
  cuteGiftBoxJson as PrintCardTemplate,
  starryNightJson as PrintCardTemplate,
  minimalTreeJson as PrintCardTemplate,
  luxGoldenHollyJson as PrintCardTemplate,
  midnightVelvetJson as PrintCardTemplate,
];

// 空白模板（用於「從空白開始」）
export const blankTemplate: PrintCardTemplate = blankJson as PrintCardTemplate;
