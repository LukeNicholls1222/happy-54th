// ここだけ書き換えれば中身が変わる。
window.CONFIG = {
  // 主役（js/world.js の FAMILY の key）と呼び方
  star: 'dad',
  name: { ja: 'お父さん', en: 'Dad' },
  // うちのラブラドールの名前
  dogName: { ja: 'ライダー', en: 'Rider' },
  // 誕生日と、今年の年齢
  date: '10.2',
  age: 54,
  // 最後に出すメッセージ。1要素が1行。
  message: {
    ja: [
      'いつも家族のために ありがとう。',
      'ライダーと一緒に、山も海も雪も、',
      'ゴルフも、これからも全力で。',
      '',
      '54歳、おめでとう。',
    ],
    en: [
      'Thanks for always being there for us.',
      'Mountains, waves, snow and golf,',
      'with Rider by your side.',
      'Keep going all out.',
      '',
      'Happy 54th birthday!',
    ],
  },
  // ？ブロックから家族が出てきたときのひとこと
  familyLines: {
    ja: { mom: 'いつも ありがとう', bro: 'おめでとう!', boy: 'これからも よろしく', sis: 'おめでとう!' },
    en: { mom: 'Thanks for everything', bro: 'Happy birthday!', boy: 'Here\'s to many more', sis: 'Happy birthday!' },
  },
  // 差出人
  from: { ja: '家族一同', en: 'Love, the family' },
};
