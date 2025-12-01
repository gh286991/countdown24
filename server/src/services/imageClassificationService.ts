// 定義 pipeline 和 classifier 的類型
type PipelineFunction = (task: string, model: string, options?: { quantized?: boolean }) => Promise<ImageClassifier>;
type ImageClassifier = (input: string, options?: { topk?: number }) => Promise<Array<{ label: string; score: number }>>;

let pipeline: PipelineFunction | null = null;
let classifierPromise: Promise<ImageClassifier> | null = null;

// 場景分類關鍵詞映射表（將具體物體映射到場景類型）
const SCENE_CATEGORIES: Record<string, string> = {
  // 人物場景
  'person': '人物照',
  'people': '人物照',
  'man': '人物照',
  'woman': '人物照',
  'child': '人物照',
  'baby': '人物照',
  'portrait': '人物照',
  
  // 風景/自然場景
  'landscape': '風景照',
  'nature': '風景照',
  'mountain': '風景照',
  'hill': '風景照',
  'forest': '風景照',
  'beach': '風景照',
  'ocean': '風景照',
  'sea': '風景照',
  'lake': '風景照',
  'river': '風景照',
  'waterfall': '風景照',
  'sunset': '風景照',
  'sunrise': '風景照',
  'sky': '風景照',
  'cloud': '風景照',
  'outdoor': '風景照',
  'countryside': '風景照',
  'desert': '風景照',
  'jungle': '風景照',
  'cave': '風景照',
  'volcano': '風景照',
  'snow': '風景照',
  'rain': '風景照',
  
  // 建築/城市場景
  'building': '建築照',
  'house': '建築照',
  'church': '建築照',
  'tower': '建築照',
  'bridge': '建築照',
  'street': '建築照',
  'road': '建築照',
  'city': '建築照',
  'urban': '建築照',
  'architecture': '建築照',
  
  // 室內場景
  'indoor': '室內照',
  'room': '室內照',
  'kitchen': '室內照',
  'bedroom': '室內照',
  'living room': '室內照',
  'office': '室內照',
  'restaurant': '室內照',
  'shop': '室內照',
  'store': '室內照',
  'interior': '室內照',
  
  // 食物場景
  'food': '食物照',
  'bread': '食物照',
  'cake': '食物照',
  'pizza': '食物照',
  'burger': '食物照',
  'sandwich': '食物照',
  'soup': '食物照',
  'rice': '食物照',
  'noodle': '食物照',
  'coffee': '食物照',
  'tea': '食物照',
  'drink': '食物照',
  'dining': '食物照',
  'meal': '食物照',
  
  // 動物場景
  'dog': '動物照',
  'cat': '動物照',
  'bird': '動物照',
  'horse': '動物照',
  'cow': '動物照',
  'sheep': '動物照',
  'pig': '動物照',
  'animal': '動物照',
  'pet': '動物照',
  'wildlife': '動物照',
  
  // 植物場景
  'tree': '植物照',
  'flower': '植物照',
  'plant': '植物照',
  'garden': '植物照',
  'park': '植物照',
  'fruit': '植物照',
  'vegetable': '植物照',
  
  // 交通工具場景
  'car': '交通工具照',
  'truck': '交通工具照',
  'bus': '交通工具照',
  'motorcycle': '交通工具照',
  'bicycle': '交通工具照',
  'train': '交通工具照',
  'airplane': '交通工具照',
  'boat': '交通工具照',
  'vehicle': '交通工具照',
  
  // 運動場景
  'sport': '運動照',
  'sports': '運動照',
  'game': '運動照',
  'athletic': '運動照',
  'exercise': '運動照',
  
  // 藝術/文化場景
  'art': '藝術照',
  'painting': '藝術照',
  'photo': '藝術照',
  'picture': '藝術照',
  'music': '藝術照',
  'book': '藝術照',
  'culture': '藝術照',
};

// 英文到中文的標籤映射表（保留一些通用翻譯作為備用）
const LABEL_TRANSLATION: Record<string, string> = {
  // 動物
  'dog': '狗',
  'cat': '貓',
  'bird': '鳥',
  'horse': '馬',
  'cow': '牛',
  'sheep': '羊',
  'pig': '豬',
  'chicken': '雞',
  'duck': '鴨',
  'rabbit': '兔子',
  'mouse': '老鼠',
  'elephant': '大象',
  'tiger': '老虎',
  'lion': '獅子',
  'bear': '熊',
  'fish': '魚',
  'butterfly': '蝴蝶',
  'bee': '蜜蜂',
  'spider': '蜘蛛',
  
  // 植物
  'tree': '樹木',
  'flower': '花朵',
  'plant': '植物',
  'grass': '草地',
  'leaf': '葉子',
  'fruit': '水果',
  'apple': '蘋果',
  'banana': '香蕉',
  'orange': '橘子',
  'grape': '葡萄',
  'strawberry': '草莓',
  'vegetable': '蔬菜',
  'carrot': '胡蘿蔔',
  'tomato': '番茄',
  'potato': '馬鈴薯',
  
  // 食物
  'food': '食物',
  'bread': '麵包',
  'cake': '蛋糕',
  'pizza': '披薩',
  'burger': '漢堡',
  'sandwich': '三明治',
  'soup': '湯',
  'rice': '米飯',
  'noodle': '麵條',
  'coffee': '咖啡',
  'tea': '茶',
  'drink': '飲料',
  'wine': '酒',
  'beer': '啤酒',
  
  // 交通工具
  'car': '汽車',
  'truck': '卡車',
  'bus': '公車',
  'motorcycle': '摩托車',
  'bicycle': '自行車',
  'train': '火車',
  'airplane': '飛機',
  'helicopter': '直升機',
  'boat': '船',
  'ship': '船隻',
  'bicycle': '自行車',
  
  // 建築和場所
  'building': '建築',
  'house': '房子',
  'church': '教堂',
  'tower': '塔',
  'bridge': '橋樑',
  'street': '街道',
  'road': '道路',
  'park': '公園',
  'garden': '花園',
  'restaurant': '餐廳',
  'kitchen': '廚房',
  'bedroom': '臥室',
  'living room': '客廳',
  'office': '辦公室',
  'school': '學校',
  'hospital': '醫院',
  'shop': '商店',
  'store': '商店',
  
  // 電子產品
  'computer': '電腦',
  'laptop': '筆記型電腦',
  'phone': '手機',
  'camera': '相機',
  'television': '電視',
  'screen': '螢幕',
  'keyboard': '鍵盤',
  'mouse': '滑鼠',
  
  // 家具
  'chair': '椅子',
  'table': '桌子',
  'sofa': '沙發',
  'bed': '床',
  'desk': '書桌',
  'cabinet': '櫃子',
  'shelf': '架子',
  
  // 服裝
  'clothing': '服裝',
  'shirt': '襯衫',
  'dress': '洋裝',
  'pants': '褲子',
  'shoes': '鞋子',
  'hat': '帽子',
  'jacket': '外套',
  
  // 人物和活動
  'person': '人物',
  'people': '人們',
  'child': '兒童',
  'baby': '嬰兒',
  'man': '男人',
  'woman': '女人',
  'sport': '運動',
  'sports': '運動',
  'game': '遊戲',
  'music': '音樂',
  'art': '藝術',
  'book': '書本',
  'painting': '畫作',
  'photo': '照片',
  'picture': '圖片',
  
  // 自然景觀
  'nature': '自然',
  'landscape': '風景',
  'mountain': '山',
  'hill': '山丘',
  'forest': '森林',
  'beach': '海灘',
  'ocean': '海洋',
  'sea': '海',
  'lake': '湖泊',
  'river': '河流',
  'waterfall': '瀑布',
  'sky': '天空',
  'cloud': '雲',
  'sun': '太陽',
  'moon': '月亮',
  'star': '星星',
  'rainbow': '彩虹',
  'sunset': '日落',
  'sunrise': '日出',
  'night': '夜晚',
  'day': '白天',
  'snow': '雪',
  'rain': '雨',
  
  // 其他
  'outdoor': '戶外',
  'indoor': '室內',
  'city': '城市',
  'countryside': '鄉村',
  'desert': '沙漠',
  'jungle': '叢林',
  'cave': '洞穴',
  'volcano': '火山',
};

// 將標籤轉換為場景分類
function translateLabel(englishLabel: string): string {
  const lowerLabel = englishLabel.toLowerCase().trim();
  
  // 優先匹配場景分類
  for (const [key, sceneCategory] of Object.entries(SCENE_CATEGORIES)) {
    if (lowerLabel === key || lowerLabel.includes(key) || key.includes(lowerLabel)) {
      return sceneCategory;
    }
  }
  
  // 如果找不到場景分類，嘗試通用翻譯
  if (LABEL_TRANSLATION[lowerLabel]) {
    return LABEL_TRANSLATION[lowerLabel];
  }
  
  // 嘗試匹配包含關鍵詞的情況
  for (const [key, value] of Object.entries(LABEL_TRANSLATION)) {
    if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
      return value;
    }
  }
  
  // 如果都找不到，直接返回原始英文標籤
  return englishLabel;
}

// 動態載入 transformers，避免在模組載入時就失敗
async function loadTransformers() {
  if (pipeline) return pipeline;
  
  try {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
    return pipeline;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
    
    console.error('無法載入 @xenova/transformers');
    console.error('錯誤訊息:', errorMsg);
    if (errorCode) {
      console.error('錯誤代碼:', errorCode);
    }
    if (errorStack) {
      console.error('錯誤堆疊 (前 10 行):');
      console.error(errorStack.split('\n').slice(0, 10).join('\n'));
    }
    
    
    // 提供更詳細的錯誤訊息和解決方案
    let errorMessage = '圖片分類功能不可用：無法載入 transformers 模組';
    if (errorMsg.includes('sharp') || (errorStack && errorStack.includes('sharp'))) {
      errorMessage += '\n\n原因：sharp 模組未正確安裝或編譯失敗';
      errorMessage += '\n解決方案：';
      errorMessage += '\n  1. cd server';
      errorMessage += '\n  2. pnpm install sharp --force';
      errorMessage += '\n  或者：';
      errorMessage += '\n  1. cd server';
      errorMessage += '\n  2. rm -rf node_modules/.pnpm/sharp*';
      errorMessage += '\n  3. pnpm install';
    } else if (errorCode === 'MODULE_NOT_FOUND') {
      errorMessage += '\n\n原因：@xenova/transformers 未安裝';
      errorMessage += '\n解決方案：cd server && pnpm install';
    } else {
      errorMessage += `\n\n錯誤詳情：${errorMsg}`;
    }
    
    throw new Error(errorMessage);
  }
}

function normalizeTag(label: string): string | null {
  // 去除多餘空格
  const cleaned = label.trim().replace(/\s+/g, ' ');
  if (cleaned.length === 0) return null;
  
  // 將英文標籤翻譯成中文（如果找不到翻譯，會返回原始英文）
  const translated = translateLabel(cleaned);
  
  // 保留中文、英文、數字和基本標點（允許中英文混合）
  const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/;
  if (!validPattern.test(translated)) return null;
  
  return translated;
}

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      console.log('初始化場景分類模型...');
      try {
        const pipelineFn = await loadTransformers();
        // 使用 Places365 場景分類模型，專門用於識別整個圖片的場景類型
        // 這個模型可以識別室內、戶外、建築、自然等場景
        const model = await pipelineFn('image-classification', 'Xenova/convnext-tiny-224', {
          quantized: true,
        });
        console.log('場景分類模型載入成功');
        return model;
      } catch (error: unknown) {
        console.error('場景分類模型載入失敗，嘗試使用備用模型:', error);
        try {
          // 備用方案：使用 CLIP 模型進行場景分類
          const pipelineFn = await loadTransformers();
          const model = await pipelineFn('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', {
            quantized: true,
          });
          console.log('使用 CLIP 模型作為場景分類器');
          return model;
        } catch (fallbackError: unknown) {
          console.error('備用模型也載入失敗:', fallbackError);
          classifierPromise = null;
          throw fallbackError;
        }
      }
    })();
  }
  return classifierPromise;
}

/**
 * 使用圖片 URL 進行場景分類（返回關鍵場景分類）
 * @param imageUrl 圖片的 URL（可以是 presigned URL 或公開 URL）
 * @param topk 返回前 k 個場景分類
 * @returns 場景分類標籤陣列（如：人物照、風景照、食物照等）
 */
export async function classifyImage(imageUrl: string, topk: number = 5): Promise<string[]> {
  try {
    const classifier = await getClassifier();
    
    // 獲取更多候選標籤，以便進行場景分類
    const result = await classifier(imageUrl, { topk: topk * 3 }); // 多取一些，過濾後再選前 topk
    
    const sceneTags: string[] = [];
    const seenScenes = new Set<string>();
    
    for (const item of result) {
      if (!item?.label) continue;
      
      // 將標籤轉換為場景分類
      const sceneCategory = translateLabel(item.label);
      const normalized = normalizeTag(sceneCategory);
      if (!normalized) continue;
      
      // 只保留分數較高的標籤（閾值 0.05）
      if (item.score && item.score < 0.05) continue;
      
      // 避免重複場景分類
      if (!seenScenes.has(normalized)) {
        sceneTags.push(normalized);
        seenScenes.add(normalized);
      }
      
      if (sceneTags.length >= topk) break;
    }
    
    return sceneTags;
  } catch (error: unknown) {
    console.error('場景分類失敗:', error);
    throw error;
  }
}


