/* Bruma Café · apertura ilustrada
   Un barista dibujado en SVG prepara un café mientras se scrollea:
   0–0.30 muele · 0.30–0.46 lleva el portafiltro a la máquina · 0.48–0.66 cae el espresso
   0.66–0.86 vierte la leche y aparece la rosetta · 0.86–1 te acerca la taza.
   Con config.abertura = "video" se usa el video de siempre (app.js). */
(() => {
  const S = window.SITE || {};
  const cine = document.querySelector(".cine");
  const svg = cine && cine.querySelector(".escena");
  if (!cine || !svg) return;
  if (S.abertura !== "ilustracion") { cine.dataset.abertura = "video"; return; }

  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => svg.getElementById(id);
  const el = {
    porta: $("e-porta"), monte: $("e-monte"), granos: $("e-granos"), dial: $("e-dial"),
    chorros: $("e-chorros"), taza: $("e-taza"), cafe: $("e-cafe"), latte: $("e-latte"), arte: $("e-arte"),
    jarra: $("e-jarra"), leche: $("e-leche"), vapor: $("e-vapor"), boca: $("e-boca"), cabeza: $("e-cabeza"),
    brazoI: $("e-brazo-izq"), brazoD: $("e-brazo-der"), manoI: $("e-mano-izq"), manoD: $("e-mano-der"),
  };

  /* ── utilidades ─────────────────────────────────────────────────────── */
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // ease-in-out para lo que se mueve en escena
  const mezcla = (a, b, k) => a + (b - a) * k;
  const punto = (a, b, k) => [mezcla(a[0], b[0], k), mezcla(a[1], b[1], k)];
  const rotar = ([x, y], g) => { const r = (g * Math.PI) / 180; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; };

  // Brazo de dos tramos (hombro → codo → mano): el codo se calcula para que la mano llegue al objetivo
  const L1 = 112, L2 = 112;
  // De las dos soluciones posibles para el codo, elige la que queda más abajo y hacia afuera (nunca cruza el pecho)
  const brazo = (path, mano, hombro, objetivo, afuera) => {
    let dx = objetivo[0] - hombro[0], dy = objetivo[1] - hombro[1];
    let d = Math.hypot(dx, dy);
    const max = L1 + L2 - 2;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    const base = Math.atan2(dy, dx);
    const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d || 1))));
    const opciones = [base + a, base - a].map((g) => [hombro[0] + L1 * Math.cos(g), hombro[1] + L1 * Math.sin(g)]);
    const nota = ([x, y]) => y * 0.6 + (x - hombro[0]) * afuera;
    const codo = nota(opciones[0]) >= nota(opciones[1]) ? opciones[0] : opciones[1];
    const m = [hombro[0] + dx, hombro[1] + dy];
    path.setAttribute("d", `M${hombro[0]} ${hombro[1]} L${codo[0].toFixed(1)} ${codo[1].toFixed(1)} L${m[0].toFixed(1)} ${m[1].toFixed(1)}`);
    mano.setAttribute("cx", m[0].toFixed(1)); mano.setAttribute("cy", m[1].toFixed(1));
  };

  /* ── posiciones de la escena (coordenadas del SVG 1600×900) ──────────── */
  const HOMBRO_I = [1165, 486], HOMBRO_D = [1315, 486];
  const DESCANSO_I = [1128, 636], DESCANSO_D = [1352, 636];
  const PORTA_MOLINO = [955, 566], PORTA_MAQUINA = [1410, 516];
  const TAZA_BANDEJA = [1410, 618], TAZA_FRENTE = [1240, 664];
  const JARRA_DESCANSO = [1072, 548], JARRA_SIRVE = [1436, 548];

  /* ── una pose para cada punto del recorrido ─────────────────────────── */
  function pose(p, t) {
    // 1 · Molienda
    const moliendo = p > 0.03 && p < 0.28;
    el.monte.setAttribute("transform", `scale(1 ${tramo(p, 0.04, 0.26).toFixed(3)})`);
    el.granos.setAttribute("opacity", moliendo ? 1 : 0);
    if (moliendo) [...el.granos.children].forEach((g, i) => g.setAttribute("transform", `translate(0 ${(((t / 7 + i * 5) % 14) - 6).toFixed(1)})`));
    el.dial.setAttribute("transform", `rotate(${(p * 1440 + (moliendo ? t * 0.4 : 0)).toFixed(1)} 985 486)`);
    el.cabeza.setAttribute("transform", moliendo ? `rotate(${(Math.sin(t / 220) * 2).toFixed(2)} 1240 400)` : "");

    // 2 · El portafiltro viaja del molino a la máquina (gira para que el mango apunte al barista)
    const k = suave(tramo(p, 0.3, 0.44));
    const px = mezcla(PORTA_MOLINO[0], PORTA_MAQUINA[0], k);
    const py = mezcla(PORTA_MOLINO[1], PORTA_MAQUINA[1], k) - 18 * Math.sin(Math.PI * k);
    const sx = Math.cos(Math.PI * k);
    el.porta.setAttribute("transform", `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${sx.toFixed(3)} 1)`);
    const enMango = [px + 104 * sx, py + 9];
    brazo(el.brazoI, el.manoI, HOMBRO_I, punto(enMango, DESCANSO_I, suave(tramo(p, 0.45, 0.52))), -1);

    // 3 · Espresso
    const chorro = tramo(p, 0.48, 0.52) * (1 - tramo(p, 0.63, 0.66));
    el.chorros.setAttribute("transform", `translate(0 540) scale(1 ${chorro.toFixed(3)}) translate(0 -540)`);
    el.cafe.setAttribute("opacity", tramo(p, 0.5, 0.64).toFixed(3));

    // 4 · Leche: la jarra llega, se inclina, vierte; aparece la rosetta
    const ida = suave(tramo(p, 0.66, 0.72)), vuelta = suave(tramo(p, 0.82, 0.86));
    const jp = punto(JARRA_DESCANSO, JARRA_SIRVE, ida * (1 - vuelta));
    const giro = -38 * suave(tramo(p, 0.71, 0.74)) * (1 - suave(tramo(p, 0.8, 0.83)));
    el.jarra.setAttribute("transform", `translate(${jp[0].toFixed(1)} ${jp[1].toFixed(1)}) rotate(${giro.toFixed(2)}) scale(1.25)`);
    const asa = rotar([84 * 1.25, 34 * 1.25], giro); const enAsa = [jp[0] + asa[0], jp[1] + asa[1]];
    const sirviendo = tramo(p, 0.73, 0.74) * (1 - tramo(p, 0.79, 0.8));
    el.leche.setAttribute("opacity", sirviendo.toFixed(2));
    if (sirviendo > 0) el.leche.setAttribute("d", `M${jp[0].toFixed(1)} ${jp[1].toFixed(1)} Q${(jp[0] - 8).toFixed(1)} ${(jp[1] + 10).toFixed(1)} ${TAZA_BANDEJA[0] + 6} ${TAZA_BANDEJA[1] - 40}`);
    el.latte.setAttribute("opacity", tramo(p, 0.73, 0.8).toFixed(3));
    const arte = tramo(p, 0.75, 0.83);
    el.arte.setAttribute("opacity", arte.toFixed(3));
    el.arte.setAttribute("transform", `translate(0 -40) scale(${(0.6 + 0.4 * arte).toFixed(3)}) translate(0 40)`);

    // 5 · Te acerca la taza
    const c = suave(tramo(p, 0.87, 0.98));
    const tx = mezcla(TAZA_BANDEJA[0], TAZA_FRENTE[0], c);
    const ty = mezcla(TAZA_BANDEJA[1], TAZA_FRENTE[1], c) - 34 * Math.sin(Math.PI * c);
    const ts = mezcla(1, 1.9, c);
    el.taza.setAttribute("transform", `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${ts.toFixed(3)})`);
    el.vapor.setAttribute("transform", `translate(${tx.toFixed(1)} ${(ty - 48 * ts).toFixed(1)}) scale(${ts.toFixed(3)})`);
    el.vapor.setAttribute("opacity", (tramo(p, 0.76, 0.84) * 0.85).toFixed(2));
    const enTaza = [tx + 44 * ts, ty - 22 * ts];

    let objetivoD = punto(DESCANSO_D, enAsa, suave(tramo(p, 0.62, 0.67)));
    if (p > 0.84) objetivoD = punto(enAsa, enTaza, suave(tramo(p, 0.84, 0.88)));
    brazo(el.brazoD, el.manoD, HOMBRO_D, objetivoD, 1);

    // Sonríe cuando te da la taza
    const s = tramo(p, 0.9, 1);
    el.boca.setAttribute("d", `M${1228 - 4 * s} 382 Q1240 ${(390 + 8 * s).toFixed(1)} ${1252 + 4 * s} 382`);
  }

  /* ── textos de la apertura (mismos tramos que con el video) ─────────── */
  const momentos = [...cine.querySelectorAll(".momento")];
  const textos = (p) => {
    for (const m of momentos) {
      const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
      m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
    }
    cine.classList.toggle("andou", p > 0.02);
  };

  /* ── encuadre: en el celular la escena se apoya abajo y deja arriba para los textos ── */
  const encuadrar = () => {
    const celu = innerWidth <= 760;
    svg.setAttribute("viewBox", celu ? "880 300 720 600" : "0 110 1600 790");
    svg.setAttribute("preserveAspectRatio", celu ? "xMidYMax meet" : "xMaxYMid slice");
  };
  encuadrar();
  addEventListener("resize", encuadrar);

  if (reducir) { pose(1, 0); textos(0); return; } // escena quieta, ya terminada

  const progreso = () => {
    const r = cine.getBoundingClientRect();
    return clamp(-r.top / (cine.offsetHeight - innerHeight || 1));
  };
  let actual = progreso();
  const cuadro = (t) => {
    const alvo = progreso();
    actual += (alvo - actual) * 0.14; // suaviza el scroll sin quedar atrasado
    if (Math.abs(alvo - actual) < 0.0005) actual = alvo;
    const r = cine.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) { pose(actual, t); textos(actual); }
    requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
})();
