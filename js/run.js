// 横スクロールのステージ「WORLD 10-2」。
// お父さんが自動で走り、タップでジャンプ。マウンテンバイク → サーフィン → スノーボード → ゴルフと
// 乗り物と景色が変わる。ラブラドールはずっと一緒に走る。？ブロックから家族が出てきて後ろにつく。
// 最後はゴルフのグリーンでパット（タイミングでショット）してカップインしたらクリア。
// 物理は60Hzで回す（12fpsだとジャンプがカクつく）。
(function () {
  const { r, line, circle, figure, lab } = SPR;

  window.makeRun = function (o) {
    const { ctx, Wd, SFX, CFG, BGM } = o;
    const GY = Wd.GY, W = Wd.W, H = Wd.H;
    const AGE = CFG.age || 54;
    const DADX = 112;                // お父さんの画面上のx
    const DOGX = DADX - 40;
    const GREEN = 3000;              // ここに着いたらゴルフ
    const BODY = 50;                 // 足元から頭のてっぺんまで（乗り物なし）
    const FAM = Object.fromEntries(Wd.FAMILY.map((s) => [s.key, s]));
    const LINES = Object.assign({ mom: 'いつも ありがとう', bro: 'おめでとう!', boy: 'おめでとう!', sis: 'おめでとう!' }, CFG.familyLines || {});

    // ---------- エリア ----------
    const ZONES = [
      { x: 0, k: 'mtb', title: 'MOUNTAIN BIKE', jp: 'マウンテンバイク', speed: 2.0, vh: 10 },
      { x: 900, k: 'surf', title: 'SURFING', jp: 'サーフィン', speed: 1.8, vh: 3 },
      { x: 1800, k: 'snow', title: 'SNOWBOARD', jp: 'スノーボード', speed: 2.2, vh: 3 },
      { x: 2700, k: 'golf', title: 'GOLF', jp: 'ゴルフ', speed: 1.5, vh: 0 },
    ];
    const zoneAt = (wx) => { let z = ZONES[0]; ZONES.forEach((q) => { if (wx >= q.x) z = q; }); return z; };
    const LOOK = {
      mtb: {},
      surf: { hair: 'short', top: '#1a1a1a', pants: '#1a1a1a', shoes: '#f8c090' },
      snow: { helmetColor: '#303030', goggles: true, top: '#f87800', pants: '#2a3a6a' },
      golf: { hair: 'cap', top: '#f8f8f8', pants: '#c8b890', shoes: '#fff' },
    };
    const dadLook = (k) => ({ ...FAM.dad, prop: null, ...LOOK[k] });

    let S, L;

    function level() {
      const coins = [], obstacles = [], enemies = [];
      const lineC = (x, y, n) => { for (let i = 0; i < n; i++) coins.push({ x: x + i * 14, y }); };
      const arc = (cx) => { for (let i = 0; i < 5; i++) { const t = i / 4; coins.push({ x: cx - 36 + t * 72, y: GY - 44 - Math.sin(t * Math.PI) * 44 }); } };
      ZONES.slice(0, 3).forEach((z) => {
        const o = z.x;
        [300, 620].forEach((d) => { obstacles.push({ x: o + d, k: z.k, top: GY - 26 }); arc(o + d + 12); });
        [200, 480, 760].forEach((d) => enemies.push({ x: o + d, k: z.k, vx: -0.45, alive: true, active: false, dead: 0 }));
        lineC(o + 110, GY - 18, 5);
      });
      lineC(2760, GY - 18, 9);
      // 年齢を変えたときは端数をゴルフエリアで合わせる
      while (coins.length < AGE) coins.push({ x: 2890 + (coins.length % 6) * 14, y: GY - 32 - Math.floor((coins.length - 54) / 6) * 14 });
      coins.length = Math.min(coins.length, AGE);
      const blockY = (x) => GY - BODY - zoneAt(x).vh - 36;
      return {
        coins: coins.map((c) => ({ ...c, got: false })),
        obstacles, enemies,
        blocks: [
          { x: 430, key: 'mom' }, { x: 730, key: 'bone' }, { x: 1340, key: 'bro' },
          { x: 2230, key: 'boy' }, { x: 2520, key: 'sis' },
        ].map((b) => ({ ...b, y: blockY(b.x), used: false, bump: 0 })),
      };
    }

    function start() {
      L = level();
      S = {
        phase: 'card', t: 0, camX: 0, y: GY, vy: 0, ground: true, holding: false, coyote: 0, buf: 0,
        coins: 0, score: 0, time: 300, tAcc: 0, inv: 0, magnet: 0, shake: 0, zone: ZONES[0], banner: 0,
        hist: [], followers: [], dogY: GY, sx: DADX, tally: 0,
        golf: null, holeInOne: false,
      };
    }

    // ---------- 入力 ----------
    function doJump() { S.vy = -7; S.ground = false; S.coyote = 0; S.buf = 0; SFX.jump(); }
    function press() {
      if (S.phase === 'card') { if (S.t > 20) begin(); return; }
      if (S.phase === 'golf') { golfPress(); return; }
      if (S.phase !== 'play') return;
      S.holding = true;
      if (S.ground || S.coyote > 0) doJump(); else S.buf = 8;
    }
    function release() { S.holding = false; if (S.phase === 'play' && S.vy < -2.5) S.vy = -2.5; }
    function begin() { S.phase = 'play'; S.t = 0; S.banner = 100; BGM.start(); }

    // ---------- 出来事 ----------
    function hitBlock(b) {
      b.bump = 8;
      if (b.used) { SFX.bump(); return; }
      b.used = true;
      if (b.key === 'bone') {
        S.magnet = 540; SFX.up(); SFX.bark();
        o.say('ほね をゲット!\nラブが コインを あつめてくる!');
        return;
      }
      const sp = FAM[b.key];
      SFX.up();
      S.score += 1000;
      Wd.coin(b.x - S.camX, b.y - 6, '1000');
      S.followers.push({ key: b.key, sp, x: b.x - S.camX + 8, y: b.y, vy: -3, landed: false });
      o.say(`${sp.name} が なかまに なった!\n「${LINES[b.key]}」`);
    }
    function hurt() {
      const lose = Math.min(2, S.coins);
      S.coins -= lose; S.inv = 90; S.shake = 10;
      SFX.hurt();
      for (let i = 0; i < lose; i++) Wd.coin(DADX - 4 + i * 8, S.y - 30);
      o.say(lose ? `いたっ! コイン -${lose}` : 'いたっ!');
    }
    function kill(e) {
      e.alive = false; e.dead = 24;
      S.score += 100;
      Wd.coin(e.x - S.camX, GY - 20, '100');
      Wd.burst(e.x - S.camX + 6, GY - 6, 10);
      SFX.stomp();
    }
    function getCoin(c) {
      c.got = true; S.coins++; S.score += 200; SFX.coin();
      if (S.coins === AGE) { o.say(`コイン ${AGE}まい コンプリート!`); Wd.confetti(40); }
    }

    // ---------- 1ステップ（60Hz） ----------
    function step() {
      S.t++;
      if (S.shake > 0) S.shake--;
      if (S.banner > 0) S.banner--;
      if (S.phase === 'card') { if (S.t > 180) begin(); return; }
      if (S.phase === 'play') stepPlay();
      else if (S.phase === 'arrive') stepArrive();
      else if (S.phase === 'golf') stepGolf();
      stepFollowers();
      L.blocks.forEach((b) => { if (b.bump > 0) b.bump--; });
      L.enemies.forEach((e) => { if (e.dead > 0) e.dead--; });
    }

    function stepPlay() {
      const wx0 = S.camX + DADX;
      const z = zoneAt(wx0);
      if (z !== S.zone) {
        S.zone = z; S.banner = 100; SFX.up();
        Wd.burst(DADX, S.y - 20, 24);
        o.say(`${z.jp}!`);
      }
      const HEAD = BODY + z.vh;
      let nx = S.camX + z.speed;
      // 岩・ブイ・雪だるまに横からぶつかったら止まる
      L.obstacles.forEach((p) => {
        const wx = nx + DADX;
        if (S.y > p.top + 1 && wx + 8 > p.x && wx - 8 < p.x + 24) nx = Math.min(nx, p.x - 8 - DADX);
      });
      S.camX = Math.max(S.camX, nx);
      const wx = S.camX + DADX;

      S.vy = Math.min(7, S.vy + (S.holding && S.vy < 0 ? 0.28 : 0.42));
      const prevFeet = S.y, prevHead = S.y - HEAD;
      S.y += S.vy;
      let g = GY;
      L.obstacles.forEach((p) => { if (wx + 8 > p.x + 1 && wx - 8 < p.x + 23 && prevFeet <= p.top + 0.5) g = Math.min(g, p.top); });
      if (S.y >= g) {
        S.y = g; S.vy = 0; S.ground = true;
        if (S.buf > 0) doJump();
      } else {
        if (S.ground) S.coyote = 6;
        S.ground = false;
      }

      if (S.vy < 0) {
        L.blocks.forEach((b) => {
          const bb = b.y + 16;
          if (wx + 8 > b.x && wx - 8 < b.x + 16 && S.y - HEAD <= bb && prevHead > bb) {
            S.y = bb + HEAD; S.vy = 1.5; hitBlock(b);
          }
        });
      }

      // コイン。ほねを取ったあとはラブが近くのコインを引き寄せる
      L.coins.forEach((c) => {
        if (c.got) return;
        if (S.magnet > 0) {
          const dx = wx - c.x, dy = S.y - 24 - c.y;
          if (dx > -90 && dx < 60 && Math.abs(dy) < 110) { c.x += dx * 0.12 + 1; c.y += dy * 0.12; }
        }
        if (c.x + 6 > wx - 9 && c.x < wx + 9 && c.y + 8 > S.y - HEAD && c.y < S.y) getCoin(c);
      });

      L.enemies.forEach((e) => {
        if (!e.alive) return;
        if (!e.active && e.x - S.camX < W + 20) e.active = true;
        if (!e.active) return;
        e.x += e.vx;
        L.obstacles.forEach((p) => { if (e.x + 12 > p.x && e.x < p.x + 24) { e.vx = -e.vx; e.x += e.vx * 3; } });
        if (wx + 8 > e.x && wx - 8 < e.x + 12 && S.y > GY - 10 && S.y - HEAD < GY) {
          if (S.vy > 0 && prevFeet <= GY - 6) { kill(e); S.vy = S.holding ? -6 : -4.5; S.shake = 4; }
          else if (S.inv <= 0) hurt();
        }
      });

      if (S.inv > 0) S.inv--;
      if (S.magnet > 0) { S.magnet--; if (S.magnet % 90 === 0 && S.magnet) SFX.bark(); }
      if (S.coyote > 0) S.coyote--;
      if (S.buf > 0) S.buf--;
      if (++S.tAcc >= 24) { S.tAcc = 0; if (S.time > 0) S.time--; }
      S.hist.push(S.y); if (S.hist.length > 120) S.hist.shift();

      if (wx >= GREEN) { S.phase = 'arrive'; S.t = 0; S.magnet = 0; S.inv = 0; BGM.stop(); SFX.clear(); o.say('グリーンに とうちゃく!'); }
    }

    // グリーンに着いたら残りタイムを点数に変えて、ゴルフへ
    function stepArrive() {
      if (S.y < GY) { S.vy += 0.42; S.y = Math.min(GY, S.y + S.vy); }
      if (S.time > 0) {
        const k = Math.min(S.time, 3); S.time -= k; S.score += k * 50;
        if (S.t % 3 === 0) SFX.tick();
      } else if (S.t > 40) startGolf();
      if (S.time === 0 && S.t > 200) startGolf();
    }

    // ---------- ゴルフ ----------
    const TEE = 58, HOLE = 200;
    // メーターのこの範囲で打つとカップイン（計算で出している。表示にも使う）
    const FRIC = 0.05, VMAX = 5;
    function sweet(tries) {
      const lim = tries >= 2 ? 3.2 : 2.2;
      const d = HOLE - (TEE + 6);
      return [Math.sqrt(2 * FRIC * d) / VMAX, Math.sqrt(2 * FRIC * d + lim * lim) / VMAX];
    }
    function startGolf() {
      S.phase = 'golf'; S.t = 0; S.y = GY;
      S.golf = { st: 'aim', t: 0, p: 0, tries: 0, bx: TEE + 6, v: 0, drop: 0, msg: '' };
      o.say('さいごは パット!\nタップで ショット');
    }
    function golfPress() {
      const G = S.golf;
      if (G.st !== 'aim' || S.t < 20) return;
      G.st = 'swing'; G.t = 0; G.v = G.p * VMAX;
    }
    function stepGolf() {
      const G = S.golf; G.t++;
      if (G.st === 'aim') {
        const ph = (G.t % 80) / 40; G.p = ph < 1 ? ph : 2 - ph;
      } else if (G.st === 'swing') {
        if (G.t === 12) { G.st = 'roll'; SFX.swing(); G.tries++; }
      } else if (G.st === 'roll') {
        const prev = G.bx;
        G.bx += G.v; G.v = Math.max(0, G.v - FRIC);
        const lim = G.tries >= 3 ? 3.2 : 2.2;
        if (prev < HOLE && G.bx >= HOLE - 1 && G.v < lim) return cupIn();
        if (G.v <= 0) {
          if (Math.abs(G.bx - HOLE) < 4) return cupIn();
          miss('もうすこし!');
        } else if (G.bx > W + 10) miss('つよすぎ!');
      } else if (G.st === 'miss') {
        if (G.t > 70) { G.st = 'aim'; G.t = 0; G.bx = TEE + 6; }
      } else if (G.st === 'in') {
        G.drop++;
        if (G.t % 10 === 0) Wd.burst(40 + Math.random() * 160, 40 + Math.random() * 90, 20);
        if (G.t === 170) o.onClear({ coins: S.coins, score: S.score, joined: S.followers.map((f) => f.key), holeInOne: S.holeInOne });
      }
    }
    function miss(text) {
      const G = S.golf; G.st = 'miss'; G.t = 0;
      SFX.wrong(); o.say(G.tries >= 2 ? `${text}\nつぎは カップが ちょっと ひろがるよ` : text);
    }
    function cupIn() {
      const G = S.golf; G.st = 'in'; G.t = 0; G.bx = HOLE;
      S.holeInOne = G.tries === 1;
      const pts = S.holeInOne ? 10000 : 3000;
      S.score += pts; Wd.coin(HOLE - 10, GY - 40, String(pts));
      SFX.fanfare(); Wd.confetti(90); S.shake = 8;
      o.say(S.holeInOne ? 'ホールインワン!!' : 'カップイン!!');
    }

    function stepFollowers() {
      const inGolf = S.phase === 'golf';
      S.followers.forEach((fw, i) => {
        // ゴルフのときは奥に並んで見ている
        const tx = inGolf ? 92 + i * 24 : DOGX - 22 * (i + 1) + 8;
        if (!fw.landed) {
          fw.vy += 0.3; fw.y += fw.vy;
          if (S.phase === 'play') fw.x -= S.zone.speed * 0.5;
          if (fw.y >= GY && fw.vy > 0) { fw.y = GY; fw.landed = true; }
        } else {
          fw.x += (tx - fw.x) * (inGolf ? 0.2 : 0.06);
          const h = S.phase === 'play' ? S.hist[S.hist.length - 1 - (i + 2) * 8] : GY;
          fw.y += ((h == null ? GY : h) - fw.y) * 0.5;
        }
      });
      const hd = S.phase === 'play' ? S.hist[S.hist.length - 1 - 6] : GY;
      S.dogY += ((hd == null ? GY : hd) - S.dogY) * 0.5;
    }

    // ---------- 描画：景色 ----------
    function cloud(x, y) {
      r(ctx, x + 4, y, 8, 3, '#fff'); r(ctx, x + 2, y + 3, 12, 3, '#fff'); r(ctx, x, y + 6, 16, 3, '#fff');
    }
    function sky(k, f) {
      const top = { mtb: '#5c94fc', surf: '#58b8f8', snow: '#9cc4f0', golf: '#6cacfc' }[k];
      r(ctx, 0, 0, W, H, top);
      const cx = (f * 0.15) % 320;
      [[20, 40], [150, 70], [90, 110], [230, 30]].forEach(([x, y]) => cloud(((x - cx) % 320 + 320) % 320 - 40, y));
      const par = (x, m, span) => ((x - S.camX * m) % span + span) % span - 40;
      if (k === 'mtb') {
        [[0, 60, '#308030'], [110, 80, '#207020'], [220, 55, '#308030']].forEach(([x, h, c]) => {
          const px = par(x, 0.2, 330);
          for (let yy = 0; yy < h; yy++) r(ctx, px + 50 - yy * 0.9, GY - h + yy, yy * 1.8, 1, c);
        });
        [[30, 0], [95, 0], [160, 0], [220, 0]].forEach(([x]) => { const px = par(x, 0.5, 280); r(ctx, px + 3, GY - 14, 3, 14, '#6a4020'); r(ctx, px - 3, GY - 30, 15, 18, '#006800'); r(ctx, px, GY - 34, 9, 4, '#006800'); });
      }
      if (k === 'surf') {
        circle(ctx, 190, 50, 12, '#f8e060'); for (let rr = 0; rr < 11; rr++) circle(ctx, 190, 50, rr, '#f8d030');
        r(ctx, 0, 190, W, GY - 190, '#2878f8');
        for (let yy = 196; yy < GY; yy += 9) for (let xx = 0; xx < W; xx += 24) r(ctx, ((xx + yy * 3 - S.camX * 0.3 + f) % 260 + 260) % 260 - 20, yy, 8, 1, '#80c0ff');
        const px = par(60, 0.15, 300); r(ctx, px, 184, 40, 6, '#e8d8a0'); r(ctx, px + 8, 176, 3, 8, '#8a6a30'); r(ctx, px + 2, 172, 14, 4, '#00a000');
      }
      if (k === 'snow') {
        [[0, 90], [120, 110], [230, 80]].forEach(([x, h]) => {
          const px = par(x, 0.2, 350);
          for (let yy = 0; yy < h; yy++) r(ctx, px + 55 - yy * 0.8, GY - h + yy, yy * 1.6, 1, yy < h * 0.35 ? '#fff' : '#b8c8e0');
        });
        [[20], [80], [150], [210]].forEach(([x]) => {
          const px = par(x, 0.5, 260);
          r(ctx, px + 5, GY - 8, 3, 8, '#5a3a20');
          for (let k2 = 0; k2 < 4; k2++) r(ctx, px + 6 - (k2 + 1) * 2.5, GY - 34 + k2 * 6, (k2 + 1) * 5 + 1, 6, '#1a5a30');
          r(ctx, px + 3, GY - 36, 7, 2, '#fff'); r(ctx, px, GY - 24, 4, 1, '#fff'); r(ctx, px + 10, GY - 18, 4, 1, '#fff');
        });
        for (let k2 = 0; k2 < 40; k2++) { const x = (k2 * 53 + f * (1 + k2 % 3) * 0.7) % W, y = (k2 * 97 + f * 2.5 * (1 + k2 % 2)) % GY; r(ctx, x, y, k2 % 3 ? 1 : 2, k2 % 3 ? 1 : 2, '#fff'); }
      }
      if (k === 'golf') {
        [[10], [70], [140], [200]].forEach(([x]) => { const px = par(x, 0.4, 280); r(ctx, px + 7, GY - 20, 3, 20, '#6a4020'); circle(ctx, px + 8, GY - 30, 11, '#1a7a30'); for (let rr = 0; rr < 11; rr++) circle(ctx, px + 8, GY - 30, rr, '#208838'); });
        r(ctx, 0, GY - 8, W, 8, '#48b048');
      }
    }
    function groundSeg(k, x0, w, f) {
      if (w <= 0) return;
      if (k === 'mtb') {
        r(ctx, x0, GY, w, H - GY, '#8a5a2a'); r(ctx, x0, GY, w, 4, '#00a800'); r(ctx, x0, GY + 4, w, 1, '#006000');
        for (let x = Math.floor((x0 + S.camX) / 12) * 12 - S.camX; x < x0 + w; x += 12) { if (x >= x0) { r(ctx, x + 3, GY + 12 + ((x + S.camX) % 5) * 5, 2, 1, '#c8905a'); r(ctx, x + 8, GY + 30 + ((x + S.camX) % 7) * 3, 3, 2, '#6a4020'); } }
      }
      if (k === 'surf') {
        r(ctx, x0, GY, w, H - GY, '#1850c0');
        for (let yy = GY + 8; yy < H; yy += 10) for (let x = x0 - ((S.camX + f * 2) % 20); x < x0 + w; x += 20) if (x >= x0) r(ctx, x, yy, 7, 1, '#4080e0');
        for (let x = x0 - ((S.camX + f * 3) % 16); x < x0 + w; x += 16) { if (x >= x0) { r(ctx, x, GY - 1, 9, 2, '#fff'); r(ctx, x + 3, GY - 3, 4, 2, '#e0f0ff'); } }
      }
      if (k === 'snow') {
        r(ctx, x0, GY, w, H - GY, '#f4f8ff'); r(ctx, x0, GY, w, 2, '#fff');
        for (let yy = GY + 10; yy < H; yy += 12) for (let x = x0 - (S.camX % 30); x < x0 + w; x += 30) if (x >= x0) r(ctx, x + (yy % 7), yy, 12, 1, '#c8d8f0');
      }
      if (k === 'golf') {
        for (let x = x0 - (S.camX % 16); x < x0 + w; x += 16) r(ctx, Math.max(x0, x), GY, Math.min(8, x + 8 - Math.max(x0, x)), H - GY, '#58c858'), r(ctx, Math.max(x0, x + 8), GY, 8, H - GY, '#48b048');
        r(ctx, x0, GY, w, 2, '#80e080');
      }
    }
    function ground(f) {
      ZONES.forEach((z, i) => {
        const a = z.x - S.camX, b = i + 1 < ZONES.length ? ZONES[i + 1].x - S.camX : 99999;
        const x0 = Math.max(0, Math.round(a)), x1 = Math.min(W, Math.round(b));
        groundSeg(z.k, x0, x1 - x0, f);
      });
    }

    // ---------- 描画：もの ----------
    function coinSpr(x, y, f) {
      const w = [6, 4, 2, 4][f % 4];
      r(ctx, x + (6 - w) / 2, y, w, 8, '#f8b800');
      if (w > 2) r(ctx, x + (6 - w) / 2 + 1, y + 1, 1, 6, '#fff0a0');
    }
    function obstacle(p, f) {
      const x = Math.round(p.x - S.camX), t = p.top;
      if (x < -30 || x > W + 6) return;
      if (p.k === 'mtb') { // 岩
        r(ctx, x + 2, t + 4, 20, 22, '#8a8a8a'); r(ctx, x, t + 10, 24, 16, '#8a8a8a'); r(ctx, x + 6, t, 12, 4, '#8a8a8a');
        r(ctx, x + 6, t, 10, 2, '#c0c0c0'); r(ctx, x + 2, t + 4, 6, 2, '#c0c0c0'); r(ctx, x + 16, t + 12, 6, 12, '#606060'); r(ctx, x + 8, t + 14, 2, 2, '#606060');
        r(ctx, x + 4, t + 2, 4, 2, '#00a800');
      }
      if (p.k === 'surf') { // ブイ
        const b = (f % 8) < 4 ? 0 : 1;
        for (let k = 0; k < 4; k++) r(ctx, x + 2, t + b + k * 6, 20, 6, k % 2 ? '#fff' : '#e83818');
        r(ctx, x, t + b + 22, 24, 4, '#e83818'); r(ctx, x + 11, t + b - 6, 2, 6, '#333'); r(ctx, x + 9, t + b - 8, 6, 2, '#f8b800');
        r(ctx, x + 3, t + b, 2, 20, '#ff8870');
      }
      if (p.k === 'snow') { // 雪だるま
        circle(ctx, x + 12, t + 18, 8, '#c8d8f0'); for (let rr = 0; rr < 8; rr++) circle(ctx, x + 12, t + 18, rr, '#fff');
        circle(ctx, x + 12, t + 6, 5, '#c8d8f0'); for (let rr = 0; rr < 5; rr++) circle(ctx, x + 12, t + 6, rr, '#fff');
        r(ctx, x + 9, t - 3, 7, 4, '#d82800'); r(ctx, x + 7, t + 1, 11, 1, '#d82800');
        r(ctx, x + 10, t + 5, 1, 1, '#000'); r(ctx, x + 14, t + 5, 1, 1, '#000'); r(ctx, x + 12, t + 7, 3, 1, '#f87800');
        r(ctx, x + 12, t + 15, 1, 1, '#000'); r(ctx, x + 12, t + 19, 1, 1, '#000');
      }
    }
    function enemy(e, f) {
      const x = Math.round(e.x - S.camX); if (x < -20 || x > W + 6) return;
      if (!e.alive) { if (e.dead > 0) r(ctx, x, GY - 3, 12, 3, { mtb: '#6a3a1a', surf: '#d82800', snow: '#fff' }[e.k]); return; }
      const w = (f % 4) < 2, L2 = e.vx < 0;
      if (e.k === 'mtb') { // いのしし
        r(ctx, x + 2, GY - 9, 10, 6, '#6a3a1a'); r(ctx, x + 3, GY - 10, 8, 1, '#4a2a10');
        const hx = L2 ? x - 2 : x + 10; r(ctx, hx, GY - 8, 4, 4, '#6a3a1a'); r(ctx, L2 ? hx - 1 : hx + 4, GY - 6, 1, 2, '#caa080'); r(ctx, L2 ? hx : hx + 3, GY - 5, 1, 1, '#fff');
        r(ctx, L2 ? hx + 1 : hx + 2, GY - 8, 1, 1, '#000');
        r(ctx, x + (w ? 3 : 4), GY - 3, 2, 3, '#3a2010'); r(ctx, x + (w ? 9 : 8), GY - 3, 2, 3, '#3a2010');
      }
      if (e.k === 'surf') { // かに
        r(ctx, x + 1, GY - 7, 10, 5, '#e83818'); r(ctx, x + 2, GY - 8, 8, 1, '#e83818');
        r(ctx, x + 3, GY - 11, 1, 3, '#e83818'); r(ctx, x + 8, GY - 11, 1, 3, '#e83818');
        r(ctx, x + 3, GY - 12, 1, 1, '#000'); r(ctx, x + 8, GY - 12, 1, 1, '#000');
        const cl = w ? 0 : 1;
        r(ctx, x - 2, GY - 10 + cl, 3, 3, '#e83818'); r(ctx, x + 11, GY - 10 + cl, 3, 3, '#e83818');
        [1, 4, 7, 10].forEach((o2, k) => r(ctx, x + o2, GY - 2, 1, 2 - ((k + (w ? 1 : 0)) % 2), '#a02000'));
      }
      if (e.k === 'snow') { // ころがる雪玉
        circle(ctx, x + 6, GY - 6, 5, '#a8b8d0'); for (let rr = 0; rr < 5; rr++) circle(ctx, x + 6, GY - 6, rr, '#fff');
        const a = f * 0.5; r(ctx, x + 6 + Math.cos(a) * 3, GY - 6 + Math.sin(a) * 3, 2, 1, '#c8d8f0');
        r(ctx, x + 3, GY - 8, 2, 1, '#000'); r(ctx, x + 7, GY - 8, 2, 1, '#000'); r(ctx, x + 4, GY - 4, 4, 1, '#333');
        if (w) r(ctx, x + (L2 ? 12 : -2), GY - 2, 2, 1, '#fff');
      }
    }
    // 乗り物。足をのせる高さを返す
    function vehicle(k, x, y, f, air) {
      if (k === 'mtb') {
        const by = y - 6, bx = x - 11, fx = x + 11;
        [bx, fx].forEach((wx2) => {
          circle(ctx, wx2, by, 6, '#000'); circle(ctx, wx2, by, 5, '#000'); circle(ctx, wx2, by, 4, '#c8c8c8');
          const a = f * 0.7; line(ctx, wx2 - Math.cos(a) * 4, by - Math.sin(a) * 4, wx2 + Math.cos(a) * 4, by + Math.sin(a) * 4, '#909090');
          r(ctx, wx2 - 1, by - 1, 2, 2, '#eee');
        });
        line(ctx, bx, by, x, y - 9, '#d82800', true); line(ctx, x, y - 9, fx - 2, y - 16, '#d82800', true);
        line(ctx, fx, by, fx - 2, y - 16, '#d82800', true); line(ctx, bx, by, x - 4, y - 14, '#d82800');
        r(ctx, x - 7, y - 16, 6, 2, '#111'); r(ctx, fx - 5, y - 20, 7, 1, '#111'); line(ctx, fx - 2, y - 16, fx - 1, y - 20, '#111');
        r(ctx, x - 4, y - 10, 8, 1, '#333');
        return y - 10;
      }
      if (k === 'surf') {
        r(ctx, x - 16, y - 3, 30, 3, '#f8f8f8'); r(ctx, x + 14, y - 3, 3, 2, '#f8f8f8'); r(ctx, x + 17, y - 3, 1, 1, '#f8f8f8');
        r(ctx, x - 16, y - 2, 30, 1, '#f87800'); r(ctx, x - 17, y - 2, 1, 2, '#e0e0e0');
        if (!air && f % 2) { r(ctx, x - 20, y - 4, 2, 2, '#fff'); r(ctx, x - 23, y - 7, 2, 2, '#e0f0ff'); r(ctx, x - 26, y - 3, 1, 1, '#fff'); }
        return y - 3;
      }
      if (k === 'snow') {
        r(ctx, x - 12, y - 3, 24, 3, '#d82800'); r(ctx, x - 13, y - 2, 1, 1, '#d82800'); r(ctx, x + 12, y - 2, 1, 1, '#d82800');
        r(ctx, x - 8, y - 3, 16, 1, '#f8b800'); r(ctx, x - 6, y - 4, 3, 1, '#222'); r(ctx, x + 3, y - 4, 3, 1, '#222');
        if (!air) for (let k2 = 0; k2 < 3; k2++) r(ctx, x - 14 - k2 * 3 - (f % 3), y - 3 - k2 * 2 - ((f + k2) % 2), 2, 2, '#fff');
        return y - 3;
      }
      return y;
    }
    function flagHole(x, f) {
      r(ctx, x - 3, GY, 8, 2, '#000');
      r(ctx, x, GY - 64, 1, 64, '#f8f8f8');
      const wv = (f >> 1) % 2;
      for (let k = 0; k < 14; k++) r(ctx, x + 1 + k, GY - 64 + ((k + wv) % 4 === 0 ? 1 : 0), 1, 10 - Math.floor(k * 0.6), '#d82800');
      ctx.font = '6px "Press Start 2P"'; ctx.fillStyle = '#fff'; ctx.fillText(String(AGE), x + 2, GY - 56);
    }
    function hud() {
      ctx.font = '8px "Press Start 2P"'; ctx.textAlign = 'left';
      const txt = (s, x, y, c = '#fff') => { ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = c; ctx.fillText(s, x, y); };
      txt('PAPA', 8, 14); txt(String(S.score).padStart(6, '0'), 8, 24);
      coinSpr(78, 16, 0); txt('COIN', 88, 14); txt(`${S.coins}/${AGE}`, 88, 24, S.coins === AGE ? '#f8b800' : '#fff');
      if (S.phase === 'golf') { txt('SHOT', 150, 14); txt(String(Math.max(1, S.golf.tries + (S.golf.st === 'aim' ? 1 : 0))), 158, 24); }
      else { txt('TIME', 150, 14); txt(String(S.time).padStart(3, '0'), 158, 24); }
    }
    function card(f) {
      r(ctx, 0, 0, W, H, '#000');
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = '10px "Press Start 2P"'; ctx.fillText('WORLD 10-2', 120, 80);
      const fy = vehicle('mtb', 96, 150, f, false);
      figure(ctx, 96, fy, dadLook('mtb'), 0);
      lab(ctx, 50, 150, f, false);
      ctx.font = '10px "Press Start 2P"'; ctx.fillText(`× ${AGE}`, 150, 132);
      ctx.font = '11px "DotGothic16"'; ctx.fillStyle = '#f8b800';
      ctx.fillText(`コインを ${AGE}まい あつめよう`, 120, 186);
      ctx.fillStyle = '#fff'; ctx.font = '10px "DotGothic16"';
      ctx.fillText('バイク → サーフィン → スノボ → ゴルフ', 120, 204);
      ctx.fillText('？ブロックには かぞくが いるよ', 120, 220);
      if ((f >> 2) % 2 === 0) { ctx.font = '11px "DotGothic16"'; ctx.fillText('タップで ジャンプ', 120, 262); }
      ctx.font = '9px "DotGothic16"'; ctx.fillStyle = '#888'; ctx.fillText('ながおしで たかく とぶ', 120, 278);
      ctx.textAlign = 'left';
    }
    function banner(f) {
      if (S.banner <= 0 || S.phase !== 'play') return;
      ctx.textAlign = 'center'; ctx.font = '12px "Press Start 2P"';
      const y = 80 + (S.banner > 90 ? (S.banner - 90) * 4 : 0);
      ctx.fillStyle = '#000'; ctx.fillText(S.zone.title, 122, y + 2);
      ctx.fillStyle = (f >> 1) % 2 ? '#f8b800' : '#fff'; ctx.fillText(S.zone.title, 120, y);
      ctx.textAlign = 'left';
    }

    function drawDad(k, x, f) {
      if (S.inv > 0 && (S.inv >> 2) % 2) return null;
      const air = !S.ground && S.phase === 'play';
      const fy = vehicle(k, x, Math.round(S.y), f, air);
      const walking = k === 'golf' && S.phase === 'play' && S.ground;
      return figure(ctx, x, fy, dadLook(k), f, { walking });
    }
    function drawDog(k, x, f) {
      const y = Math.round(S.dogY);
      if (k === 'surf') { r(ctx, x - 2, y - 2, 34, 2, '#f8e040'); r(ctx, x + 31, y - 2, 2, 1, '#f8e040'); }
      lab(ctx, x, y - (k === 'surf' ? 2 : 0), f, S.phase === 'play' && k !== 'surf');
      if (S.magnet > 0 && (f % 8) < 4) { ctx.font = '8px "DotGothic16"'; ctx.fillStyle = '#fff'; ctx.fillText('ワン!', x + 20, y - 22); }
    }

    function draw(f) {
      if (S.phase === 'card') { card(f); return; }
      ctx.save();
      if (S.shake) ctx.translate(((S.shake * 7) % 5) - 2, ((S.shake * 3) % 3) - 1);
      if (S.phase === 'golf') { drawGolf(f); ctx.restore(); hud(); return; }
      sky(zoneAt(S.camX + DADX).k, f);
      ground(f);
      L.obstacles.forEach((p) => obstacle(p, f));
      L.blocks.forEach((b) => {
        const x = Math.round(b.x - S.camX); if (x < -20 || x > W + 4) return;
        Wd.qblock(ctx, x, b.y - (b.bump > 4 ? 8 - b.bump : b.bump > 0 ? b.bump : 0), f, b.used);
      });
      L.coins.forEach((c) => { if (!c.got) { const x = c.x - S.camX; if (x > -10 && x < W + 4) coinSpr(Math.round(x), Math.round(c.y), f); } });
      L.enemies.forEach((e) => enemy(e, f));
      flagHole(GREEN + 90 - S.camX, f);
      // 家族（後ろから）→ ラブ → お父さん
      [...S.followers].reverse().forEach((fw) => {
        const zk = zoneAt(S.camX + fw.x).k;
        const fy = fw.landed ? vehicle(zk, Math.round(fw.x), Math.round(fw.y), f, Math.abs(fw.y - GY) > 1) : Math.round(fw.y);
        figure(ctx, Math.round(fw.x), fy, fw.sp, f, { walking: fw.landed && zk === 'golf' && S.phase === 'play' });
      });
      drawDog(zoneAt(S.camX + DOGX).k, DOGX - 14, f);
      drawDad(zoneAt(S.camX + DADX).k, DADX, f);
      ctx.restore();
      hud();
      banner(f);
      if (S.phase === 'play' && S.t < 220 && S.t > 100 && (f >> 2) % 2 === 0) {
        ctx.textAlign = 'center'; ctx.font = '11px "DotGothic16"';
        ctx.fillStyle = '#000'; ctx.fillText('タップで ジャンプ!', 121, 61); ctx.fillStyle = '#fff'; ctx.fillText('タップで ジャンプ!', 120, 60);
        ctx.textAlign = 'left';
      }
    }

    function drawGolf(f) {
      const G = S.golf;
      sky('golf', f);
      S.camX = 0; groundSeg('golf', 0, W, f);
      r(ctx, 0, GY - 34, W, 34, '#50b850'); r(ctx, 0, GY - 34, W, 1, '#70d070');
      // グリーン
      r(ctx, 120, GY - 3, 120, 3, '#90f090'); r(ctx, 110, GY - 1, 10, 1, '#90f090');
      // 家族は奥で見ている
      const hop = G.st === 'in';
      S.followers.forEach((fw, i) => {
        const h = hop ? [0, 3, 5, 6, 5, 3, 0][(f + i * 2) % 7] : 0;
        figure(ctx, Math.round(fw.x), GY - 30 - h, fw.sp, f);
      });
      flagHole(HOLE, f);
      // ラブ
      lab(ctx, 6, GY, f, false);
      if (hop && (f % 6) < 3) { ctx.font = '8px "DotGothic16"'; ctx.fillStyle = '#fff'; ctx.fillText('ワン!', 18, GY - 22); }
      // お父さん（キャップにポロシャツ）とクラブ
      const g = figure(ctx, TEE - 8, GY, dadLook('golf'), f);
      const hx = g.tx + g.torsoW + 1, hy = g.torsoTop + g.torsoH - 3;
      let ang = 1.15;
      if (G.st === 'swing') ang = G.t < 8 ? 1.15 - (G.t / 8) * 2.6 : -1.45 + ((G.t - 8) / 4) * 3.0;
      if (G.st === 'roll' || G.st === 'miss' || G.st === 'in') ang = -0.4; // フォロースルー
      const len = 26, ex = hx + Math.cos(ang) * len * 0.45, ey = hy + Math.sin(ang) * len;
      line(ctx, hx, hy, ex, ey, '#bbb');
      r(ctx, ex - 1, ey, 3, 2, '#666');
      r(ctx, hx - 1, hy - 1, 2, 2, '#f8c090');
      // ボール
      if (!(G.st === 'in' && G.drop > 6)) { r(ctx, Math.round(G.bx), GY - 3 + (G.st === 'in' ? Math.min(3, G.drop >> 1) : 0), 3, 3, '#fff'); r(ctx, Math.round(G.bx) + 1, GY - 1, 2, 1, '#ccc'); }
      // メーター
      if (G.st === 'aim' || G.st === 'swing') {
        const [a, b] = sweet(G.tries);
        r(ctx, 38, 282, 164, 12, '#000'); r(ctx, 40, 284, 160, 8, '#333');
        r(ctx, 40 + a * 160, 284, (b - a) * 160, 8, '#00a800');
        r(ctx, 40, 284, G.p * 160, 8, G.p >= a && G.p <= b ? '#f8f800' : '#f87800');
        r(ctx, 40 + G.p * 160 - 1, 280, 2, 16, '#fff');
        ctx.textAlign = 'center'; ctx.font = '10px "DotGothic16"';
        if (G.st === 'aim' && (f >> 2) % 2 === 0) { ctx.fillStyle = '#000'; ctx.fillText('みどりで タップ!', 121, 275); ctx.fillStyle = '#fff'; ctx.fillText('みどりで タップ!', 120, 274); }
        ctx.textAlign = 'left';
      }
      if (G.st === 'in') {
        ctx.textAlign = 'center'; ctx.font = '14px "Press Start 2P"';
        const t1 = S.holeInOne ? 'HOLE IN ONE!' : 'NICE SHOT!';
        ctx.fillStyle = '#000'; ctx.fillText(t1, 122, 122); ctx.fillStyle = (f >> 1) % 2 ? '#f8b800' : '#fff'; ctx.fillText(t1, 120, 120);
        ctx.textAlign = 'left';
      }
    }

    return { start, step, draw, press, release };
  };
})();
