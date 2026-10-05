(() => {
  "use strict";

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  const resetBtn = document.getElementById("resetBtn");

  let W = 0,
    H = 0,
    DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildTerrain();
    layoutSites();
  }

  const PALETTE = [
    { top: "#efe3f1", bot: "#c9a4bd", fleck: "#a9678c" },
    { top: "#eef1e6", bot: "#b7cfae", fleck: "#73966e" },
    { top: "#fbeee0", bot: "#e0b580", fleck: "#b17f41" },
    { top: "#e8eef7", bot: "#a6c0e0", fleck: "#5c84b3" },
    { top: "#f6e4ea", bot: "#d6a0b6", fleck: "#a0536f" },
    { top: "#eee6f6", bot: "#b7a0d6", fleck: "#73519e" },
  ];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function buildIcicleChain(
    x,
    anchorY,
    length,
    thickness,
    dir,
    wiggleSeed,
    beadPeriod,
    flat,
  ) {
    if (length <= 2) return [];
    flat = flat != null ? flat : 0.5;
    const nodeSpacing = Math.max(3, thickness * 0.3);
    const count = Math.max(2, Math.round(length / nodeSpacing));
    const nodes = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const distFromAnchor = length * t;
      const y = anchorY + dir * distFromAnchor;
      const wiggle = Math.sin(t * 3.1 + wiggleSeed) * thickness * 0.08;
      let taper;
      if (t < 0.045) {
        taper = lerp(0.82, 1, t / 0.045);
      } else {
        const tt = (t - 0.045) / 0.955;
        taper = lerp(1, 0.14, Math.pow(tt, 1.1));
      }
      let beadMul = 1;
      if (t > 0.025) {
        const phase = (distFromAnchor / beadPeriod) * Math.PI * 2;
        beadMul = 0.8 + 0.22 * Math.pow(0.5 + 0.5 * Math.cos(phase), 2);
      }
      let rx = thickness * 0.86 * taper * beadMul;
      if (t > 0.96) rx = Math.max(rx, thickness * 0.26);
      const ry = Math.max(2.2, rx * flat);
      nodes.push({ x: x + wiggle, y, rx, ry });
    }
    return nodes;
  }

  let terrain = { seed: Math.random() * 10 };
  let cracks = [];

  function buildTerrain() {
    const s = terrain.seed;
    terrain.ceilFn = (xf) =>
      H * 0.15 +
      H * 0.045 * Math.sin(xf * 6.1 + s) +
      H * 0.022 * Math.sin(xf * 14.3 + s * 1.9) +
      H * 0.012 * Math.sin(xf * 27 + s * 3.1);
    terrain.floorFn = (xf) =>
      H * 0.87 +
      H * 0.045 * Math.sin(xf * 5.2 + s * 1.3) +
      H * 0.022 * Math.sin(xf * 12.1 + s * 0.7) +
      H * 0.012 * Math.sin(xf * 23 + s * 2.4);
    buildCracks();
  }

  function ceilingYAt(xf) {
    return terrain.ceilFn(xf);
  }
  function floorYAt(xf) {
    return terrain.floorFn(xf);
  }

  function buildCracks() {
    cracks = [];
    for (let i = 0; i < 16; i++) {
      const onCeil = Math.random() < 0.5;
      const startX = Math.random() * W;
      const startY = onCeil
        ? rand(0, ceilingYAt(startX / W) * 0.85)
        : rand(floorYAt(startX / W) + H * 0.02, H);
      const pts = [{ x: startX, y: startY }];
      let cx = startX,
        cy = startY;
      const segs = Math.round(rand(3, 7));
      for (let s = 0; s < segs; s++) {
        cx += rand(-26, 26);
        cy += onCeil ? rand(5, 16) : rand(-16, -5);
        pts.push({ x: cx, y: cy });
      }
      cracks.push(pts);
    }
  }

  function drawCracks() {
    ctx.save();
    ctx.strokeStyle = "rgba(8,5,12,0.28)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const pts of cracks) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const fogLayers = [];
  const motes = [];

  function buildAtmosphere() {
    fogLayers.length = 0;
    for (let i = 0; i < 6; i++) {
      fogLayers.push({
        x: Math.random(),
        y: rand(0.15, 0.9),
        r: rand(0.12, 0.26),
        speed: rand(0.004, 0.012) * (Math.random() < 0.5 ? 1 : -1),
        alpha: rand(0.035, 0.08),
        hueIdx: Math.floor(Math.random() * PALETTE.length),
      });
    }
    motes.length = 0;
    for (let i = 0; i < 46; i++) {
      motes.push({
        x: Math.random(),
        y: Math.random(),
        r: rand(0.6, 2.1),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.15, 0.4),
        drift: rand(-0.02, 0.02),
      });
    }
  }
  buildAtmosphere();

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1e1729");
    g.addColorStop(0.45, "#39304a");
    g.addColorStop(0.75, "#584b5e");
    g.addColorStop(1, "#786a73");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const shaft of [
      [0.22, 0.55],
      [0.74, 0.4],
    ]) {
      const rg = ctx.createRadialGradient(
        W * shaft[0],
        H * 0.05,
        0,
        W * shaft[0],
        H * 0.05,
        H * shaft[1],
      );
      rg.addColorStop(0, "rgba(255,230,245,0.09)");
      rg.addColorStop(1, "rgba(255,230,245,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    ctx.save();
    for (const f of fogLayers) {
      f.x += f.speed * 0.01;
      if (f.x > 1.15) f.x = -0.15;
      if (f.x < -0.15) f.x = 1.15;
      const col = PALETTE[f.hueIdx];
      const rg = ctx.createRadialGradient(
        f.x * W,
        f.y * H,
        0,
        f.x * W,
        f.y * H,
        f.r * W,
      );
      rg.addColorStop(0, hexAlpha(col.top, f.alpha));
      rg.addColorStop(1, hexAlpha(col.top, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    drawWallSilhouette(true);
    drawWallSilhouette(false);
    drawTerrainShape();
    drawCracks();
    drawMotes(t, 0.5);
  }

  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function drawWallSilhouette(left) {
    const w = W * 0.1;
    ctx.save();
    ctx.beginPath();
    if (left) {
      ctx.moveTo(0, 0);
      for (let y = 0; y <= H; y += H / 10) {
        const bump = w * (0.6 + 0.4 * Math.sin(y * 0.02 + terrain.seed));
        ctx.lineTo(bump, y);
      }
      ctx.lineTo(0, H);
    } else {
      ctx.moveTo(W, 0);
      for (let y = 0; y <= H; y += H / 10) {
        const bump = w * (0.6 + 0.4 * Math.sin(y * 0.021 + terrain.seed + 2));
        ctx.lineTo(W - bump, y);
      }
      ctx.lineTo(W, H);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(24,16,30,0.4)";
    ctx.fill();
    ctx.restore();
  }

  function drawTerrainShape() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, ceilingYAt(0));
    for (let x = 0; x <= W; x += W / 60) {
      ctx.lineTo(x, ceilingYAt(x / W));
    }
    ctx.lineTo(W, 0);
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, 0, 0, H * 0.22);
    cg.addColorStop(0, "#18101f");
    cg.addColorStop(1, "#2d2238");
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, floorYAt(0));
    for (let x = 0; x <= W; x += W / 60) {
      ctx.lineTo(x, floorYAt(x / W));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const fg = ctx.createLinearGradient(0, H * 0.78, 0, H);
    fg.addColorStop(0, "#3d3341");
    fg.addColorStop(1, "#231b29");
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }

  function drawMotes(t, alphaMul) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const m of motes) {
      m.x += m.drift * 0.004;
      if (m.x > 1.05) m.x = -0.05;
      if (m.x < -0.05) m.x = 1.05;
      const twinkle = 0.5 + 0.5 * Math.sin(t * m.speed + m.phase);
      const yy = (m.y + Math.sin(t * 0.08 + m.phase) * 0.01) * H;
      const xx = m.x * W;
      const r = m.r * (1 + twinkle * 0.6);
      const rg = ctx.createRadialGradient(xx, yy, 0, xx, yy, r * 4);
      rg.addColorStop(0, `rgba(255,244,250,${0.55 * twinkle * alphaMul})`);
      rg.addColorStop(1, "rgba(255,244,250,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(xx, yy, r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawVignette() {
    const rg = ctx.createRadialGradient(
      W / 2,
      H * 0.52,
      H * 0.22,
      W / 2,
      H * 0.52,
      H * 0.95,
    );
    rg.addColorStop(0, "rgba(0,0,0,0)");
    rg.addColorStop(1, "rgba(8,5,12,0.4)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  function makeBlobLayer() {
    const raw = document.createElement("canvas");
    const field = document.createElement("canvas");
    return {
      raw,
      rawCtx: raw.getContext("2d"),
      field,
      fieldCtx: field.getContext("2d"),
      w: 0,
      h: 0,
    };
  }

  function thresholdAlpha(imgData, edge0, edge1) {
    const d = imgData.data;
    const range = Math.max(1, edge1 - edge0);
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i];
      if (a <= edge0) {
        d[i] = 0;
        continue;
      }
      if (a >= edge1) {
        d[i] = 255;
        continue;
      }
      let t = (a - edge0) / range;
      t = t * t * (3 - 2 * t);
      d[i] = Math.round(t * 255);
    }
  }

  function makeFlutes(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const dark = i % 2 === 0;
      arr.push({
        ux: (i + 0.5) / count + rand(-0.04, 0.04),
        width: rand(0.055, 0.09),
        dark,
        alpha: dark ? rand(0.22, 0.36) : rand(0.16, 0.26),
      });
    }
    return arr;
  }

  function makeSpeckles(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        ux: Math.random(),
        uy: Math.random(),
        r: rand(1, 3.2),
        alpha: rand(0.1, 0.26),
      });
    }
    return arr;
  }

  function paintBlobCluster(layer, nodes, palette, speckles, opts) {
    if (!nodes.length) return;
    opts = opts || {};
    const pad = opts.pad || 30;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      const rx = n.rx != null ? n.rx : n.r;
      const ry = n.ry != null ? n.ry : n.r;
      minX = Math.min(minX, n.x - rx);
      minY = Math.min(minY, n.y - ry);
      maxX = Math.max(maxX, n.x + rx);
      maxY = Math.max(maxY, n.y + ry);
    }
    const nodeMinX = minX,
      nodeMaxX = maxX;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const w = Math.max(4, Math.ceil(maxX - minX));
    const h = Math.max(4, Math.ceil(maxY - minY));
    if (layer.w !== w || layer.h !== h) {
      layer.raw.width = w;
      layer.raw.height = h;
      layer.field.width = w;
      layer.field.height = h;
      layer.w = w;
      layer.h = h;
    } else {
      layer.rawCtx.clearRect(0, 0, w, h);
      layer.fieldCtx.clearRect(0, 0, w, h);
    }

    const rc = layer.rawCtx;
    rc.fillStyle = "#fff";
    const shrink = opts.shrink != null ? opts.shrink : 0.74;
    for (const n of nodes) {
      const rx = Math.max(1, (n.rx != null ? n.rx : n.r) * shrink);
      const ry = Math.max(1, (n.ry != null ? n.ry : n.r) * shrink);
      rc.beginPath();
      rc.ellipse(n.x - minX, n.y - minY, rx, ry, 0, 0, Math.PI * 2);
      rc.fill();
    }

    const fc = layer.fieldCtx;
    const blur = opts.blur != null ? opts.blur : 14;
    fc.filter = `blur(${blur}px)`;
    fc.drawImage(layer.raw, 0, 0);
    fc.filter = "none";

    const imgData = fc.getImageData(0, 0, w, h);
    const edge0 = opts.edge0 != null ? opts.edge0 : 70;
    const edge1 = opts.edge1 != null ? opts.edge1 : 128;
    thresholdAlpha(imgData, edge0, edge1);
    fc.putImageData(imgData, 0, 0);

    fc.globalCompositeOperation = "source-in";
    const grad = fc.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, palette.top);
    grad.addColorStop(1, palette.bot);
    fc.fillStyle = grad;
    fc.fillRect(0, 0, w, h);

    fc.globalCompositeOperation = "source-atop";
    const shade = fc.createLinearGradient(0, 0, w, 0);
    shade.addColorStop(0, "rgba(20,10,24,0.16)");
    shade.addColorStop(0.5, "rgba(20,10,24,0)");
    shade.addColorStop(1, "rgba(20,10,24,0.1)");
    fc.fillStyle = shade;
    fc.fillRect(0, 0, w, h);

    fc.globalCompositeOperation = "source-atop";
    const sheen = fc.createRadialGradient(
      w * 0.3,
      h * 0.14,
      0,
      w * 0.3,
      h * 0.14,
      w * 0.85,
    );
    sheen.addColorStop(0, "rgba(255,255,255,0.4)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    fc.fillStyle = sheen;
    fc.fillRect(0, 0, w, h);

    if (opts.flutes && opts.flutes.length) {
      const innerX0 = nodeMinX - minX;
      const innerW = Math.max(2, nodeMaxX - nodeMinX);
      fc.globalCompositeOperation = "source-atop";
      for (const fl of opts.flutes) {
        const cx = innerX0 + fl.ux * innerW;
        const fw = Math.max(1.4, fl.width * innerW);
        const lg = fc.createLinearGradient(cx - fw, 0, cx + fw, 0);
        const c = fl.dark ? "10,6,14" : "255,255,255";
        lg.addColorStop(0, `rgba(${c},0)`);
        lg.addColorStop(0.5, `rgba(${c},${fl.alpha})`);
        lg.addColorStop(1, `rgba(${c},0)`);
        fc.fillStyle = lg;
        fc.fillRect(cx - fw, 0, fw * 2, h);
      }
    }

    if (speckles && speckles.length) {
      fc.globalCompositeOperation = "source-atop";
      fc.fillStyle = palette.fleck;
      for (const s of speckles) {
        fc.globalAlpha = s.alpha;
        fc.beginPath();
        fc.arc(s.ux * w, s.uy * h, s.r, 0, Math.PI * 2);
        fc.fill();
      }
      fc.globalAlpha = 1;
    }

    fc.globalCompositeOperation = "source-over";

    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.drawImage(layer.field, minX, minY);
    if (opts.alpha != null) ctx.globalAlpha = 1;
    return { minX, minY, w, h };
  }

  const CHIP_RANGE = [10, 18];
  const JOIN_GAP = 20;
  const GRAVITY = 0.62;
  const AIR_DRAG = 0.996;
  const JOINT_GRAB_R = 40;
  const COLLAPSE_THRESHOLD = 58;
  const TUG_MAX = 20;

  let sparkles = [];

  function spawnSparkles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      sparkles.push({
        x,
        y,
        vx: rand(-1.4, 1.4),
        vy: rand(-2.2, -0.4),
        r: rand(1.2, 2.8),
        life: 1,
        color,
      });
    }
  }

  function updateSparkles(dt) {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.x += s.vx * dt * 0.06;
      s.y += s.vy * dt * 0.06;
      s.vy += 0.03 * dt * 0.06;
      s.life -= 0.02 * dt * 0.06;
      if (s.life <= 0) sparkles.splice(i, 1);
    }
  }

  function drawSparkles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of sparkles) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  let dust = [];

  function spawnDust(x, y, color, count, awayX, awayY) {
    for (let i = 0; i < count; i++) {
      let ang;
      if (awayX != null) {
        ang = Math.atan2(y - awayY, x - awayX) + rand(-0.9, 0.9);
      } else {
        ang = rand(0, Math.PI * 2);
      }
      const spd = rand(0.22, 0.68);
      dust.push({
        x: x + rand(-6, 6),
        y: y + rand(-6, 6),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(0.1, 0.28),
        r: rand(1.1, 2.5),
        age: 0,
        maxLife: rand(2600, 4200),
        life: 1,
        color,
      });
    }
  }

  function updateDust(dt) {
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.age += dt;
      d.x += d.vx * dt * 0.05;
      d.y += d.vy * dt * 0.05;
      d.vx *= 0.996;
      d.vy -= 0.00045 * dt;
      d.life = 1 - d.age / d.maxLife;
      if (d.life <= 0) dust.splice(i, 1);
    }
  }

  function drawDust() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const d of dust) {
      const a = Math.max(0, Math.sin(Math.min(1, d.life) * Math.PI)) * 0.2;
      const rg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 2.6);
      rg.addColorStop(0, hexAlpha(d.color, a));
      rg.addColorStop(1, hexAlpha(d.color, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  class Site {
    constructor(xf, paletteIdx) {
      this.xf = xf;
      this.palette = PALETTE[paletteIdx];
      this.layerMain = makeBlobLayer();
      this.layerDebris = makeBlobLayer();
      this.speckles = makeSpeckles(10);
      this.flutes = makeFlutes(Math.max(3, Math.round(rand(4, 7))));
      this.reset(true);
    }

    reset(first) {
      this.x = this.xf * W;
      this.ceilingY = ceilingYAt(this.xf);
      this.floorY = floorYAt(this.xf);
      this.gap = this.floorY - this.ceilingY;
      this.thickness = rand(0.016, 0.062) * Math.min(W, H) + 14;
      this.flat = rand(0.4, 0.6);
      this.minStub = this.gap * rand(0.22, 0.3);
      this.stalLen = Math.max(
        this.minStub + this.gap * 0.14,
        this.gap * rand(0.3, 0.74),
      );
      this.pileNodes = [];
      this.falling = [];
      this.debrisChunks = [];
      this.state = "forming";
      this.joint = null;
      this.tug = { x: 0, y: 0 };
      this.dragging = false;
      this.rubble = first ? [] : this.rubble || [];
      this.wiggleSeed = Math.random() * 10;
      this.beadPeriod = this.thickness * rand(1.4, 1.9);
    }

    get tipY() {
      return this.ceilingY + this.stalLen;
    }

    pileTopY() {
      if (!this.pileNodes.length) return this.floorY;
      let top = Infinity;
      for (const n of this.pileNodes) {
        top = Math.min(top, n.y - Math.max(n.rx, n.ry));
      }
      return top;
    }

    topmostPileNode() {
      if (!this.pileNodes.length) return null;
      let best = this.pileNodes[0];
      let bestTop = best.y - Math.max(best.rx, best.ry);
      for (const n of this.pileNodes) {
        const t = n.y - Math.max(n.rx, n.ry);
        if (t < bestTop) {
          bestTop = t;
          best = n;
        }
      }
      return best;
    }

    stalactiteNodes() {
      return buildIcicleChain(
        this.x,
        this.ceilingY,
        this.stalLen,
        this.thickness,
        1,
        this.wiggleSeed,
        this.beadPeriod,
        this.flat,
      );
    }

    stalagmiteNodes() {
      return this.pileNodes;
    }

    hitStalactite(px, py) {
      if (this.state !== "forming") return false;
      const halfW = this.thickness * 1.15;
      return (
        px > this.x - halfW &&
        px < this.x + halfW &&
        py > this.ceilingY - 6 &&
        py < this.tipY + 14
      );
    }

    hitJoint(px, py) {
      if (this.state !== "joined" || !this.joint) return false;
      return dist(px, py, this.joint.x, this.joint.y) <= JOINT_GRAB_R;
    }

    hitRubble(px, py) {
      if (!this.rubble || !this.rubble.length) return false;
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const n of this.rubble) {
        minX = Math.min(minX, n.x - n.r);
        maxX = Math.max(maxX, n.x + n.r);
        minY = Math.min(minY, n.y - n.r);
        maxY = Math.max(maxY, n.y + n.r);
      }
      const pad = 12;
      return (
        px >= minX - pad &&
        px <= maxX + pad &&
        py >= minY - pad &&
        py <= maxY + pad
      );
    }

    disperseRubble() {
      if (!this.rubble || !this.rubble.length) return;
      let cx = 0,
        cy = 0;
      for (const n of this.rubble) {
        cx += n.x;
        cy += n.y;
      }
      cx /= this.rubble.length;
      cy /= this.rubble.length;

      const removeCount = Math.max(
        4,
        Math.min(
          this.rubble.length,
          Math.round(this.rubble.length * rand(0.3, 0.42)),
        ),
      );
      for (let i = 0; i < removeCount; i++) {
        if (!this.rubble.length) break;
        const idx = Math.floor(Math.random() * this.rubble.length);
        const n = this.rubble.splice(idx, 1)[0];
        spawnDust(n.x, n.y, this.palette.top, 2, cx, cy);
      }
      spawnSparkles(cx, cy, "#fff8fb", 4);
    }

    breakChunk() {
      if (this.state !== "forming") return;
      const gapNow = this.pileTopY() - this.tipY;
      if (gapNow <= JOIN_GAP) return;

      const oldStalLen = this.stalLen;
      const chip = rand(CHIP_RANGE[0], CHIP_RANGE[1]);
      const newStalLen = Math.max(this.minStub, oldStalLen - chip);
      const lenDrop = oldStalLen - newStalLen;
      const growAmount =
        lenDrop > 0.5 ? lenDrop : this.thickness * rand(0.4, 0.7);

      const nodesBefore = this.stalactiteNodes();
      const breakAtLen =
        lenDrop > 0.5 ? newStalLen : Math.max(0, oldStalLen - growAmount);
      const breakY = this.ceilingY + breakAtLen;
      const overlap = this.thickness * 0.3;
      let piece = nodesBefore.filter((n) => n.y >= breakY - overlap);
      if (!piece.length) piece = [nodesBefore[nodesBefore.length - 1]];

      let cx = 0,
        cy = 0;
      for (const n of piece) {
        cx += n.x;
        cy += n.y;
      }
      cx /= piece.length;
      cy /= piece.length;
      const minR = Math.max(18, this.thickness * 0.32);
      const maxR = Math.max(minR + 12, this.thickness * 0.58);
      let maxR0 = 0;
      for (const n of piece) maxR0 = Math.max(maxR0, n.rx, n.ry);
      const targetMax = rand(minR, maxR);
      const scale = maxR0 > 0.6 ? targetMax / maxR0 : 1;

      const localNodes = piece.map((n) => {
        const rx = Math.max(n.rx * scale, targetMax * 0.55);
        const ry = Math.max(n.ry * scale, targetMax * 0.55 * this.flat);
        return { dx: (n.x - cx) * 0.85, dy: -(n.y - cy) * 0.5, rx, ry };
      });

      this.falling.push({
        cx,
        cy,
        vx: rand(-0.7, 0.7),
        vy: rand(0.15, 0.5),
        angle: 0,
        angVel: rand(-0.05, 0.05),
        nodes: localNodes,
        layer: makeBlobLayer(),
        growAmount,
      });

      this.stalLen = newStalLen;
      spawnSparkles(this.x, breakY, "#fff6f2", 7);
    }

    triggerJoin() {
      this.state = "joined";
      const tip = this.tipY;
      const top = this.pileTopY();
      const jy = (tip + top) / 2;
      this.joint = { x: this.x, y: jy, baseX: this.x, baseY: jy };

      const minBridgeR = Math.max(14, this.thickness * 0.22);
      const stalNodes = this.stalactiteNodes();
      const tipNode = stalNodes.length ? stalNodes[stalNodes.length - 1] : null;
      const tipR = Math.max(
        minBridgeR,
        tipNode ? Math.max(tipNode.rx, tipNode.ry) : this.thickness * 0.3,
      );
      const topNode = this.topmostPileNode();
      const topR = topNode
        ? Math.max(topNode.rx, topNode.ry)
        : this.thickness * 0.3;

      this.bridgeNodes = [];
      const segs = Math.max(
        2,
        Math.round(Math.abs(top - tip) / (this.thickness * 0.3)),
      );
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const r = lerp(tipR, topR, t) * rand(0.94, 1.04);
        this.bridgeNodes.push({
          x: this.x + rand(-2, 2),
          y: lerp(tip, top, t),
          rx: r,
          ry: Math.max(2, r * this.flat),
        });
      }
      spawnSparkles(this.x, jy, "#ffe9f6", 16);
    }

    startCollapse(pointerX, pointerY) {
      if (this.state !== "joined") return;
      this.state = "collapsing";
      this.collapseTimer = 0;
      const dirx = pointerX - this.joint.baseX || rand(-1, 1);
      const diry = pointerY - this.joint.baseY || 1;
      const dlen = Math.hypot(dirx, diry) || 1;
      const baseAngle = Math.atan2(diry / dlen, dirx / dlen);

      const all = [
        ...this.stalactiteNodes(),
        ...this.bridgeNodes,
        ...this.stalagmiteNodes(),
      ].sort((a, b) => a.y - b.y);
      const groupSize = all.length > 60 ? 3 : 2;
      this.debrisChunks = [];
      for (let c = 0; c * groupSize < all.length; c++) {
        const group = all.slice(c * groupSize, (c + 1) * groupSize);
        if (!group.length) continue;
        let cx = 0,
          cy = 0;
        for (const n of group) {
          cx += n.x;
          cy += n.y;
        }
        cx /= group.length;
        cy /= group.length;
        const localNodes = group.map((n) => ({
          dx: n.x - cx,
          dy: n.y - cy,
          rx: n.rx != null ? n.rx : n.r,
          ry: n.ry != null ? n.ry : n.r,
        }));
        const ang = baseAngle + rand(-1.1, 1.1);
        const spd = rand(2, 4.6);
        this.debrisChunks.push({
          cx,
          cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - rand(0.4, 1.3),
          angle: 0,
          angVel: rand(-0.09, 0.09),
          nodes: localNodes,
          layer: makeBlobLayer(),
          settled: false,
        });
      }
      this.pileNodes = [];
      this.joint = null;
      this.bridgeNodes = [];
    }

    update(dt) {
      const step = dt * 0.06;

      for (let i = this.falling.length - 1; i >= 0; i--) {
        const c = this.falling[i];
        c.vy = Math.min(c.vy + GRAVITY * step, 14);
        c.vx *= AIR_DRAG;
        c.cx += c.vx * step;
        c.cy += c.vy * step;
        c.angle += c.angVel * step;
        let maxBottom = 0;
        for (const n of c.nodes) {
          maxBottom = Math.max(maxBottom, n.dy + Math.max(n.rx, n.ry));
        }
        const surface = this.pileTopY();
        if (c.cy + maxBottom >= surface) {
          const settle = Math.max(this.thickness * 0.85, 34);
          const shiftY = surface - (c.cy + maxBottom) + settle;
          const jitterX = rand(-this.thickness * 0.18, this.thickness * 0.18);
          const sizeMul = rand(0.9, 1.3);
          const cos = Math.cos(c.angle),
            sin = Math.sin(c.angle);
          for (const n of c.nodes) {
            const wx = c.cx + n.dx * cos - n.dy * sin + jitterX;
            const wy = c.cy + n.dx * sin + n.dy * cos + shiftY;
            this.pileNodes.push({
              x: wx,
              y: wy,
              rx: n.rx * sizeMul,
              ry: n.ry * sizeMul,
            });
          }
          spawnSparkles(this.x, surface, "#ffffff", 4);
          this.falling.splice(i, 1);
        } else if (c.cy - maxBottom > this.floorY + 60) {
          this.falling.splice(i, 1);
        }
      }

      if (this.state === "forming") {
        const gapNow = this.pileTopY() - this.tipY;
        if (gapNow <= JOIN_GAP) {
          this.triggerJoin();
        }
      }

      if (this.state === "joined" && this.joint) {
        if (!this.dragging) {
          this.tug.x *= 0.82;
          this.tug.y *= 0.82;
        }
        this.joint.x = this.joint.baseX + this.tug.x;
        this.joint.y = this.joint.baseY + this.tug.y;
      }

      if (this.state === "collapsing") {
        this.collapseTimer += dt;
        let allSettled = true;
        for (const ch of this.debrisChunks) {
          if (ch.settled) continue;
          allSettled = false;
          ch.vy = Math.min(ch.vy + GRAVITY * step, 16);
          ch.vx *= 0.985;
          ch.cx += ch.vx * step;
          ch.cy += ch.vy * step;
          ch.angle += ch.angVel * step;
          let maxBottom = 0;
          for (const n of ch.nodes) {
            maxBottom = Math.max(maxBottom, n.dy + Math.max(n.rx, n.ry));
          }
          const floorHere = floorYAt(clamp(ch.cx / W, 0, 1));
          if (ch.cy + maxBottom >= floorHere) {
            ch.cy = floorHere - maxBottom * 0.72;
            ch.vx *= 0.4;
            ch.vy = 0;
            ch.angVel *= 0.25;
            ch.settled = true;
          }
        }
        if (allSettled && this.collapseTimer > 900) {
          const rubbleNodes = [];
          for (const ch of this.debrisChunks) {
            const cos = Math.cos(ch.angle),
              sin = Math.sin(ch.angle);
            const floorHere = floorYAt(clamp(ch.cx / W, 0, 1));
            for (const n of ch.nodes) {
              const wx = ch.cx + n.dx * cos - n.dy * sin;
              const wy = ch.cy + n.dx * sin + n.dy * cos;
              const rr = Math.max(n.rx, n.ry);
              rubbleNodes.push({
                x: wx,
                y: Math.min(wy, floorHere - rr * 0.5),
                r: rr * 0.9,
              });
            }
          }
          this.rubble = rubbleNodes;
          this.debrisChunks = [];
          const keepRubble = this.rubble;
          this.reset(false);
          this.rubble = keepRubble;
        }
      }
    }

    render() {
      // Barely any blur at all — just enough to take the hard pixel edge
      // off each stamped circle. Each node stays clearly readable as its
      // own scalloped bump (the reference "beaded icicle" look) instead of
      // melting into one soft continuous silhouette.
      const blur = clamp(this.thickness * 0.045, 1.4, 2.6);
      if (this.rubble && this.rubble.length) {
        paintBlobCluster(
          this.layerDebris,
          this.rubble,
          this.palette,
          this.speckles,
          { blur, flutes: this.flutes },
        );
      }

      if (this.state === "forming") {
        const nodes = [...this.stalactiteNodes(), ...this.stalagmiteNodes()];
        if (nodes.length)
          paintBlobCluster(this.layerMain, nodes, this.palette, this.speckles, {
            blur,
            flutes: this.flutes,
          });
      } else if (this.state === "joined") {
        const nodes = [
          ...this.stalactiteNodes(),
          ...this.bridgeNodes,
          ...this.stalagmiteNodes(),
        ];
        paintBlobCluster(this.layerMain, nodes, this.palette, this.speckles, {
          blur,
          flutes: this.flutes,
        });
        drawJointMarker(this.joint, this.dragging);
      } else if (this.state === "collapsing") {
        if (this.debrisChunks && this.debrisChunks.length) {
          const blurD = clamp(this.thickness * 0.04, 1.2, 2.2);
          for (const ch of this.debrisChunks) {
            const cos = Math.cos(ch.angle),
              sin = Math.sin(ch.angle);
            const nodes = ch.nodes.map((n) => ({
              x: ch.cx + n.dx * cos - n.dy * sin,
              y: ch.cy + n.dx * sin + n.dy * cos,
              rx: n.rx,
              ry: n.ry,
            }));
            paintBlobCluster(ch.layer, nodes, this.palette, this.speckles, {
              blur: blurD,
              flutes: this.flutes,
            });
          }
        }
      }

      if (this.falling.length) {
        const blurF = clamp(this.thickness * 0.045, 1.4, 2.6);
        for (const c of this.falling) {
          const cos = Math.cos(c.angle),
            sin = Math.sin(c.angle);
          const nodes = c.nodes.map((n) => ({
            x: c.cx + n.dx * cos - n.dy * sin,
            y: c.cy + n.dx * sin + n.dy * cos,
            rx: n.rx,
            ry: n.ry,
          }));
          paintBlobCluster(c.layer, nodes, this.palette, this.speckles, {
            blur: blurF,
            flutes: this.flutes,
          });
        }
      }
    }
  }

  function drawJointMarker(joint, active) {
    if (!joint) return;
    const t = performance.now() * 0.004;
    const pulse = 0.6 + 0.4 * Math.sin(t);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rg = ctx.createRadialGradient(
      joint.x,
      joint.y,
      0,
      joint.x,
      joint.y,
      active ? 34 : 20,
    );
    rg.addColorStop(0, `rgba(255,236,248,${active ? 0.5 : 0.26 * pulse})`);
    rg.addColorStop(1, "rgba(255,236,248,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(joint.x, joint.y, active ? 34 : 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const decorations = [];
  function buildDecorations() {
    decorations.length = 0;
    const COUNT = 11;
    for (let i = 0; i < COUNT; i++) {
      const thickFrac = rand(0.005, 0.011);
      const thickness = thickFrac * Math.min(W || 1440, H || 900) + 4;
      decorations.push({
        xf: rand(0.015, 0.985),
        fromCeil: Math.random() < 0.58,
        paletteIdx: Math.floor(Math.random() * PALETTE.length),
        lenFrac: rand(0.07, 0.24),
        thickFrac,
        wiggleSeed: Math.random() * 10,
        beadPeriod: thickness * rand(1.4, 1.9),
        flat: rand(0.4, 0.6),
        alpha: rand(0.45, 0.78),
        layer: makeBlobLayer(),
        speckles: makeSpeckles(3),
        flutes: makeFlutes(Math.max(2, Math.round(rand(2, 4)))),
      });
    }
  }
  buildDecorations();

  function renderDecorations() {
    for (const d of decorations) {
      const x = d.xf * W;
      const len = d.lenFrac * H;
      const thickness = d.thickFrac * Math.min(W, H) + 4;
      const fromCeil = d.fromCeil;
      const baseY = fromCeil ? ceilingYAt(d.xf) : floorYAt(d.xf);
      const dir = fromCeil ? 1 : -1;
      const nodes = buildIcicleChain(
        x,
        baseY,
        len,
        thickness,
        dir,
        d.wiggleSeed,
        d.beadPeriod,
        d.flat,
      );
      if (!nodes.length) continue;
      paintBlobCluster(d.layer, nodes, PALETTE[d.paletteIdx], d.speckles, {
        blur: clamp(thickness * 0.045, 1.2, 2.4),
        flutes: d.flutes,
        alpha: d.alpha,
        pad: 12,
      });
    }
  }

  const SITE_COUNT = 17;
  let sites = [];

  function layoutSites() {
    const wasFirst = sites.length === 0;
    if (wasFirst) {
      const fracs = [];
      for (let i = 0; i < SITE_COUNT; i++) {
        const base = 0.05 + i * (0.9 / (SITE_COUNT - 1));
        fracs.push(clamp(base + rand(-0.014, 0.014), 0.02, 0.98));
      }
      sites = fracs.map((f, i) => new Site(f, i % PALETTE.length));
    } else {
      for (const s of sites) s.reset(false);
    }
  }

  let dragSite = null;
  let dragStart = { x: 0, y: 0 };
  let pointerMoved = false;

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener("pointerdown", (e) => {
    const p = canvasPos(e);
    for (const s of sites) {
      if (s.hitJoint(p.x, p.y)) {
        dragSite = s;
        s.dragging = true;
        dragStart = { x: p.x, y: p.y };
        pointerMoved = false;
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add("dragging");
        return;
      }
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPos(e);
    if (dragSite) {
      pointerMoved = true;
      const dx = p.x - dragStart.x;
      const dy = p.y - dragStart.y;
      const d = Math.hypot(dx, dy);
      const clamped = Math.min(d, TUG_MAX);
      const ang = Math.atan2(dy, dx);
      dragSite.tug.x = Math.cos(ang) * clamped;
      dragSite.tug.y = Math.sin(ang) * clamped;
      if (d > COLLAPSE_THRESHOLD) {
        const s = dragSite;
        s.dragging = false;
        dragSite = null;
        canvas.classList.remove("dragging");
        s.startCollapse(p.x, p.y);
      }
      return;
    }
    let overJoint = false;
    for (const s of sites) {
      if (s.hitJoint(p.x, p.y) || s.hitStalactite(p.x, p.y)) {
        overJoint = true;
        break;
      }
    }
    canvas.classList.toggle("hover-joint", overJoint);
  });

  function endDrag() {
    if (dragSite) {
      dragSite.dragging = false;
      dragSite = null;
      canvas.classList.remove("dragging");
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  canvas.addEventListener("click", (e) => {
    if (pointerMoved) {
      pointerMoved = false;
      return;
    }
    const p = canvasPos(e);
    let best = null,
      bestDist = Infinity;
    for (const s of sites) {
      if (!s.hitStalactite(p.x, p.y)) continue;
      const d = Math.abs(p.x - s.x);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    if (best) best.breakChunk();
  });

  canvas.addEventListener("dblclick", (e) => {
    const p = canvasPos(e);
    for (const s of sites) {
      if (s.hitRubble(p.x, p.y)) {
        s.disperseRubble();
        return;
      }
    }
  });

  resetBtn.addEventListener("click", () => {
    for (const s of sites) {
      s.reset(false);
      s.rubble = [];
    }
  });

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(now - lastT, 48);
    lastT = now;

    drawBackground(now * 0.001);
    renderDecorations();
    for (const s of sites) s.update(dt);
    for (const s of sites) s.render();
    updateSparkles(dt);
    drawSparkles();
    updateDust(dt);
    drawDust();
    drawMotes(now * 0.001, 0.9);
    drawVignette();

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  if (window.__CAVE_DEBUG__) {
    window.__scene = { sites, W: () => W, H: () => H };
  }
})();
