const sampleCgScript = {
  cover: {
    title: 'DAY 1 / 24',
    subtitle: '2323 · 2323',
    description: '一進入畫面先看到 CG 封面，按下開始就會播放劇情背景與對話。',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
    cta: '開始播放',
  },
  startScene: 'arrival',
  scenes: [
    {
      id: 'arrival',
      label: 'DAY 1 · 校園屋頂',
      background: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
      accent: '#67e8f9',
      dialogue: [
        { speaker: '???', text: '額…你是？這裡只有受邀的人才能上來。' },
        { speaker: '你', text: '等等，我跟著信件指示來報到的。' },
        { speaker: '???', text: '那就回答我的問題吧。' },
      ],
      choices: [
        { label: '額…你是？', next: 'curious' },
        { label: '你真的很可愛！', next: 'flirt' },
      ],
    },
    {
      id: 'curious',
      label: 'DAY 1 · 自我介紹',
      background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
      accent: '#f472b6',
      dialogue: [
        { speaker: '轉學生', text: '哈哈，我是晴，接下來 24 天都由我引導你。' },
        { speaker: '你', text: '原來如此，那封信也是你寄的？' },
        { speaker: '晴', text: '沒錯，現在先跟著我去教室。' },
      ],
      next: 'stargaze',
    },
    {
      id: 'flirt',
      label: 'DAY 1 · 調皮選項',
      background: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df',
      accent: '#c4b5fd',
      dialogue: [
        { speaker: '晴', text: '欸？你突然這樣說會讓人害羞耶。' },
        { speaker: '你', text: '我只是說出真心話。' },
        { speaker: '晴', text: '真是受不了你，快跟上腳步。' },
      ],
      next: 'stargaze',
    },
    {
      id: 'stargaze',
      label: 'DAY 1 · 夜空 CG',
      background: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c',
      accent: '#fcd34d',
      dialogue: [
        { speaker: '旁白', text: '夜幕降臨，星軌在你們頭頂延伸。' },
        { speaker: '晴', text: '從今天開始，每晚我都會帶給你新的碎片。' },
        { speaker: '你', text: '我會準備好迎接下一個選項。' },
      ],
    },
  ],
  ending: {
    title: 'DAY 1 CLEAR',
    message: '完成第一天的 CG，明天會解鎖新的分支。',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    cta: '回到封面',
  },
};

export default sampleCgScript;

