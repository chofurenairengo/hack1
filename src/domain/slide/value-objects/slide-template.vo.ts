export type SlideTemplateKey = 'standard' | 'adventure' | 'creative';

export type SlideQuestions = Readonly<{
  slideNumber: 0 | 1 | 2 | 3 | 4;
  questions: readonly string[];
}>;

export type SlideTemplate = Readonly<{
  key: SlideTemplateKey;
  displayName: string;
  description: string;
  slideQuestions: readonly SlideQuestions[];
}>;

export const SLIDE_TEMPLATES: readonly SlideTemplate[] = [
  {
    key: 'standard',
    displayName: 'スタンダード',
    description: 'エピソードを中心に、友人の魅力を自然に伝えるテンプレートです',
    slideQuestions: [
      {
        slideNumber: 0,
        questions: [
          'この友人と出会ったとき、最初に印象に残ったことは何ですか？',
          'この友人を一言で表すとしたら？（抽象語NG）',
          'この友人の「らしさ」が出た最近のエピソードを教えてください',
        ],
      },
      {
        slideNumber: 1,
        questions: [
          '一緒に過ごした思い出深いエピソードを具体的に教えてください',
          'このエピソードで、友人のどんな一面が見えましたか？',
          'その場面を振り返ると、どんな気持ちになりますか？',
        ],
      },
      {
        slideNumber: 2,
        questions: [
          'この友人の趣味・得意なことを教えてください',
          'その趣味にはまったきっかけのエピソードはありますか？',
          '友人の「好きなこと」が周りにどんな影響を与えていますか？',
        ],
      },
      {
        slideNumber: 3,
        questions: [
          '意外だと思われるこの友人の一面を教えてください',
          'そのギャップを最初に知ったとき、どんな反応をしましたか？',
          'その一面を知って、友人のことがもっと好きになったエピソードは？',
        ],
      },
      {
        slideNumber: 4,
        questions: [
          'この友人と一緒にいると、どんな時間を過ごせますか？',
          'この友人と新しくやってみたいことは何ですか？',
          '参加者へのメッセージを一言お願いします',
        ],
      },
    ],
  },
  {
    key: 'adventure',
    displayName: 'アドベンチャー',
    description: '旅行・アウトドア・冒険好きな友人を紹介するテンプレートです',
    slideQuestions: [
      {
        slideNumber: 0,
        questions: [
          'この友人と一緒に行った一番印象的な場所・体験は？',
          'その体験で友人はどんなリアクションをしていましたか？',
          '友人を「冒険仲間」として一言で紹介するなら？',
        ],
      },
      {
        slideNumber: 1,
        questions: [
          '思い出に残る旅や体験のエピソードを教えてください',
          'その体験で友人が見せた行動で、印象に残ったことは？',
          'そのエピソードから友人の何を学びましたか？',
        ],
      },
      {
        slideNumber: 2,
        questions: [
          '友人が好きな活動・趣味（アウトドア系）を教えてください',
          'その活動を始めたきっかけのストーリーは？',
          'その趣味を通じて友人が大切にしていることは何ですか？',
        ],
      },
      {
        slideNumber: 3,
        questions: [
          '冒険好きな見た目とは裏腹な、意外な一面を教えてください',
          'そのギャップを初めて知ったときのエピソードは？',
          'そのギャップがあなたにはどう映っていますか？',
        ],
      },
      {
        slideNumber: 4,
        questions: [
          '友人と次に挑戦してみたいことは何ですか？',
          '参加者と友人が一緒にできそうなことは？',
          '参加者へのメッセージを一言お願いします',
        ],
      },
    ],
  },
  {
    key: 'creative',
    displayName: 'クリエイティブ',
    description: '創作・アート・音楽など、クリエイティブな友人を紹介するテンプレートです',
    slideQuestions: [
      {
        slideNumber: 0,
        questions: [
          '友人の作品・活動を初めて見たとき、どんな印象を受けましたか？',
          'その作品・活動の「ここがすごい」と思う点は？',
          '友人のクリエイティブな一面を一言で表すなら？',
        ],
      },
      {
        slideNumber: 1,
        questions: [
          '友人が何かを作り上げていく過程で見た印象的なエピソードは？',
          'そのエピソードで友人はどんな姿を見せていましたか？',
          'そのエピソードがあなたに影響を与えたことはありますか？',
        ],
      },
      {
        slideNumber: 2,
        questions: [
          '友人がクリエイティブ活動を始めたきっかけのストーリーは？',
          'その活動を続ける中で大切にしていることは何ですか？',
          '最近の作品・活動で特に印象に残ったものは？',
        ],
      },
      {
        slideNumber: 3,
        questions: [
          'クリエイティブ一辺倒かと思いきや、意外な一面はありますか？',
          'そのギャップを知ったときのエピソードを教えてください',
          'そのギャップは友人の魅力をどう引き立てていますか？',
        ],
      },
      {
        slideNumber: 4,
        questions: [
          '友人の表現と参加者が一緒に楽しめそうなことは？',
          '参加者へ「この友人と話してみてほしい理由」を一言お願いします',
          '友人の今後の活動や夢を紹介してください',
        ],
      },
    ],
  },
] as const;

export function findTemplate(key: SlideTemplateKey): SlideTemplate | undefined {
  return SLIDE_TEMPLATES.find((t) => t.key === key);
}
