// 英語 / 日本語。最初は英語で、?lang=ja で日本語、タイトルのボタンで切り替え、選んだ言語は覚えておく。
(function () {
  const q = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) { /* 使えない環境もある */ }
  // 最初は英語。?lang=ja か、タイトルのボタンで日本語にできる
  window.LANG = q === 'en' || q === 'ja' ? q : saved === 'en' || saved === 'ja' ? saved : 'en';

  const th = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  const DICT = {
    ja: {
      hint: '画面をタップ',
      candlesTitle: 'ろうそくを ぜんぶ けそう',
      candlesSub: '画面を <b>長押し</b> して 息をためて、はなす',
      cheerMain: 'おめでとう!!',
      cheerSub: 'ろうそく ぜんぶ けせた!',
      quizQ: 'きょうで なんさい?',
      again: 'もういちど',
      langBtn: 'ENGLISH',
      candlesLeft: (n) => `のこり ${n}`,
      candlesDone: 'ぜんぶ きえた!',
      wrong: (a) => ['ざんねん!', 'もういちど。', 'よく かんがえて。', `ヒント: ${a - 1} の つぎ`, `${a} さい!`],
      correct: (n) => `せいかい! ${n} さい おめでとう!`,
      zone: { mtb: 'マウンテンバイク!', surf: 'サーフィン!', snow: 'スノーボード!', golf: 'ゴルフ!' },
      bone: (dog) => `ほね を ゲット!\n${dog}が コインを あつめてくる!`,
      joined: (name, line) => `${name} が なかまに なった!\n「${line}」`,
      complete: (n) => `コイン ${n}まい コンプリート!`,
      green: 'グリーンに とうちゃく!',
      putt: 'さいごは パット!\nタップで ショット',
      short: 'もうすこし!',
      long: 'つよすぎ!',
      wider: 'つぎは カップが ちょっと ひろがるよ',
      hio: 'ホールインワン!!',
      cupIn: 'カップイン!!',
      cardCoins: (n) => `コインを ${n}まい あつめよう`,
      cardRoute: 'バイク → サーフィン → スノボ → ゴルフ',
      cardBlocks: '？ブロックには かぞくが いるよ',
      tapJump: 'タップで ジャンプ',
      holdHigh: 'ながおしで たかく とぶ',
      woof: 'ワン!',
      tapGreen: 'みどりで タップ!',
    },
    en: {
      hint: 'TAP THE SCREEN',
      candlesTitle: 'Blow out all the candles',
      candlesSub: '<b>Hold</b> the screen to take a breath, then let go',
      cheerMain: 'HOORAY!!',
      cheerSub: 'All the candles are out!',
      quizQ: 'How old today?',
      again: 'PLAY AGAIN',
      langBtn: '日本語',
      candlesLeft: (n) => `${n} LEFT`,
      candlesDone: 'ALL OUT!',
      wrong: (a) => ['Nope!', 'Try again.', 'Think carefully.', `Hint: right after ${a - 1}`, `${a}!`],
      correct: (n) => `Correct! Happy ${th(n)}!`,
      zone: { mtb: 'Mountain biking!', surf: 'Surfing!', snow: 'Snowboarding!', golf: 'Golf!' },
      bone: (dog) => `Got a bone!\n${dog} is fetching coins!`,
      joined: (name, line) => `${name} joined the party!\n"${line}"`,
      complete: (n) => `All ${n} coins collected!`,
      green: 'Made it to the green!',
      putt: 'Last up: the putt!\nTap to shoot',
      short: 'Almost!',
      long: 'Too strong!',
      wider: 'The cup gets a bit bigger next time',
      hio: 'HOLE IN ONE!!',
      cupIn: 'In the hole!!',
      cardCoins: (n) => `Collect ${n} coins`,
      cardRoute: 'Bike → Surf → Snowboard → Golf',
      cardBlocks: 'Your family is hiding in ? blocks',
      tapJump: 'TAP TO JUMP',
      holdHigh: 'Hold to jump higher',
      woof: 'WOOF!',
      tapGreen: 'Tap on the green!',
    },
  };

  // T('key') または T('key', 引数...)
  window.T = (key, ...args) => {
    const v = DICT[window.LANG][key];
    return typeof v === 'function' ? v(...args) : v;
  };
  // 設定の { ja, en } をいまの言語で取り出す。ただの値ならそのまま
  window.LOC = (v) => (v && typeof v === 'object' && !Array.isArray(v) && ('ja' in v || 'en' in v) ? v[window.LANG] ?? v.ja : v);
  window.nameOf = (sp) => (window.LANG === 'en' && sp.nameEn ? sp.nameEn : sp.name);

  // HTMLの data-i18n を埋める
  window.applyI18n = () => {
    document.documentElement.lang = window.LANG;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = T(el.dataset.i18n); });
  };
  window.setLang = (l) => {
    window.LANG = l;
    try { localStorage.setItem('lang', l); } catch (e) { /* 覚えられなくても動く */ }
    window.applyI18n();
  };
})();
