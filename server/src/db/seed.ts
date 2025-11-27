import { Users, Countdowns, Assignments } from './connection.js';
import { hashPassword } from '../utils/helpers.js';
import * as countdownService from '../services/countdownService.js';

export async function seedDemoData(): Promise<void> {
  if (!Users || !Countdowns || !Assignments) {
    throw new Error('Database not initialized');
  }

  const existingUsers = await Users.countDocuments();
  if (existingUsers > 0) return;

  const sampleUsers = [
    {
      id: 'usr-creator-demo',
      name: 'Aurora',
      email: 'creator@example.com',
      password: hashPassword('creatorPass!123'),
      role: 'creator',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
      bio: 'Designs cinematic CG countdowns',
    },
    {
      id: 'usr-receiver-demo',
      name: 'Noel',
      email: 'receiver@example.com',
      password: hashPassword('receiverPass!123'),
      role: 'receiver',
      avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39',
      bio: 'Collects QR gifts and story scenes',
    },
  ];

  const sampleCountdowns = [
    {
      id: 'cd-story-demo',
      ownerId: 'usr-creator-demo',
      title: 'Chronicles of Us',
      type: 'story',
      description: '24 pieces of art direction and dialogue leading up to day zero.',
      coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      theme: { primary: '#f472b6', secondary: '#22d3ee' },
      startDate: '2024-12-01T00:00:00.000Z',
      endDate: '2024-12-24T00:00:00.000Z',
      totalDays: 24,
      cgScript: {
        cover: {
          title: 'DAY 1 / 24',
          subtitle: '2323 · 2323',
          description: '一進來會先看到封面，按下開始才會播放 CG 對話。',
          image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
          cta: '開始播放',
        },
        startScene: 'arrival',
        scenes: [
          {
            id: 'arrival',
            label: 'DAY 1 · 屋頂',
            background: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
            dialogue: [
              { speaker: '???', text: '額…你是？這裡只有受邀的人。' },
              { speaker: '你', text: '我按照 CG 信件來報到的。' },
              { speaker: '???', text: '那先回答我吧。' },
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
            dialogue: [
              { speaker: '晴', text: '哈哈，我是晴，之後 24 天由我帶你。' },
              { speaker: '你', text: '原來 CG 是你寫的。' },
            ],
            next: 'stargaze',
          },
          {
            id: 'flirt',
            label: 'DAY 1 · 調皮選項',
            background: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df',
            dialogue: [
              { speaker: '晴', text: '突然這樣講會讓人害羞耶。' },
              { speaker: '你', text: '只是說出真心話。' },
            ],
            next: 'stargaze',
          },
          {
            id: 'stargaze',
            label: 'DAY 1 · 夜空',
            background: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c',
            dialogue: [
              { speaker: '旁白', text: '星光軌跡在夜幕延伸。' },
              { speaker: '晴', text: '準備好迎接下一天了嗎？' },
            ],
          },
        ],
        ending: {
          title: 'DAY 1 CLEAR',
          message: '完成第一天的 CG，等待下一次播放。',
          image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
          cta: '回到封面',
        },
      },
      storyMoments: [
        {
          day: 1,
          imageUrl: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70',
          speaker: 'Aurora',
          lineOne: 'Day 1: The signal flickers on.',
          lineTwo: 'You found the first shard.',
          availableOn: '2024-12-01T00:00:00.000Z',
        },
        {
          day: 8,
          imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
          speaker: 'Aurora',
          lineOne: 'Day 8: The neon garden blooms.',
          lineTwo: 'Unfold the next line of poetry.',
          availableOn: '2024-12-08T00:00:00.000Z',
        },
        {
          day: 24,
          imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
          speaker: 'Aurora',
          lineOne: 'Finale: Doors open to the festival.',
          lineTwo: 'Meet me where the aurora falls.',
          availableOn: '2024-12-24T00:00:00.000Z',
        },
      ],
      qrRewards: [],
      recipientIds: ['usr-receiver-demo'],
    },
    {
      id: 'cd-qr-demo',
      ownerId: 'usr-creator-demo',
      title: 'QR Gift Vault',
      type: 'qr',
      description: 'Scanable goodies and vouchers for each phase.',
      coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
      theme: { primary: '#22d3ee', secondary: '#fbbf24' },
      startDate: '2024-12-10T00:00:00.000Z',
      endDate: '2025-01-02T00:00:00.000Z',
      totalDays: 24,
      storyMoments: [],
      qrRewards: [
        {
          day: 5,
          title: 'Latte on me',
          message: 'Scan to redeem a cozy drink',
          imageUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096',
          qrCode: 'coffee-latte-2024',
          availableOn: '2024-12-14T00:00:00.000Z',
        },
        {
          day: 14,
          title: 'Arcade night',
          message: 'Tokens hidden at the neon arcade',
          imageUrl: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d',
          qrCode: 'arcade-pass-14',
          availableOn: '2024-12-23T00:00:00.000Z',
        },
      ],
      cgScript: null,
      recipientIds: ['usr-receiver-demo'],
    },
  ];

  const sampleDayCards: Record<string, any[]> = {
    'cd-story-demo': [
      {
        day: 1,
        title: 'DAY 1 · 屋頂',
        description: '第一天的 CG 序章。',
        coverImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
        type: 'story',
        cgScript: sampleCountdowns.find((item) => item.id === 'cd-story-demo')?.cgScript || null,
      },
    ],
    'cd-qr-demo': [
      {
        day: 5,
        title: 'Latte on me',
        description: '咖啡交換券解鎖日。',
        coverImage: 'https://images.unsplash.com/photo-1498804103079-a6351b050096',
        type: 'qr',
        qrReward: sampleCountdowns
          .find((item) => item.id === 'cd-qr-demo')
          ?.qrRewards?.find((reward: any) => reward.day === 5) || null,
      },
      {
        day: 14,
        title: 'Arcade night',
        description: '街機夜晚小卡',
        coverImage: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d',
        type: 'qr',
        qrReward: sampleCountdowns
          .find((item) => item.id === 'cd-qr-demo')
          ?.qrRewards?.find((reward: any) => reward.day === 14) || null,
      },
    ],
  };

  const sampleAssignments = [
    {
      id: 'asn-demo-story',
      countdownId: 'cd-story-demo',
      receiverId: 'usr-receiver-demo',
      status: 'unlocked',
      unlockedOn: '2024-12-01T00:00:00.000Z',
    },
    {
      id: 'asn-demo-qr',
      countdownId: 'cd-qr-demo',
      receiverId: 'usr-receiver-demo',
      status: 'locked',
      unlockedOn: null,
    },
  ];

  await Users.insertMany(sampleUsers);
  await Countdowns.insertMany(sampleCountdowns);
  await Assignments.insertMany(sampleAssignments);
  await Promise.all(
    sampleCountdowns.map((countdown) =>
      countdownService.persistDayCards(countdown.id, countdown.totalDays, sampleDayCards[countdown.id] || [], countdown)),
  );
}
