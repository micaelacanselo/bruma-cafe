(() => {
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Progreso de scroll por sección (--p de 0 a 1) ─────────────────────
     data-progreso         → 0 cuando la sección asoma abajo, 1 cuando su borde superior llega al 15% de la pantalla
     data-progreso="pasa"  → 0 cuando asoma, 1 cuando terminó de pasar (para los movimientos continuos) */
  const conProgreso = [...document.querySelectorAll("[data-progreso]")];
  const limitar = (v) => Math.min(1, Math.max(0, v));
  const medir = () => {
    const vh = innerHeight;
    for (const el of conProgreso) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const p = el.dataset.progreso === "pasa"
        ? (vh - r.top) / (vh + r.height)
        : (vh * 0.9 - r.top) / (vh * 0.75);
      el.style.setProperty("--p", limitar(p).toFixed(4));
    }
  };
  if (!reducir) {
    let pedido = false;
    addEventListener("scroll", () => { if (!pedido) { pedido = true; requestAnimationFrame(() => { pedido = false; medir(); }); } }, { passive: true });
    addEventListener("resize", medir);
    medir();
  }

  /* ── Entradas: cada sección entra a su manera (ver bruma.css) ───────── */
  document.querySelectorAll(".items > div, .foto-tag").forEach((el) => {
    el.style.setProperty("--i", [...el.parentElement.children].indexOf(el));
  });
  const entradas = document.querySelectorAll(".carta-sec, .lugar, .visita, .postal, .puerta");
  if (reducir || !("IntersectionObserver" in window)) entradas.forEach((s) => s.classList.add("en"));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("en"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    entradas.forEach((s) => io.observe(s));
  }

  /* ── El cartel de la puerta se hamaca con la velocidad del scroll ───── */
  const cartel = document.querySelector("[data-hamaca]");
  if (cartel && !reducir) {
    let ultimo = scrollY, angulo = 0, vel = 0, activo = false;
    const paso = () => {
      const delta = scrollY - ultimo; ultimo = scrollY;
      vel += (Math.max(-9, Math.min(9, delta * 0.12)) - angulo) * 0.08; // empuje
      vel *= 0.9;                                                      // roce
      angulo += vel;
      cartel.style.setProperty("--giro", angulo.toFixed(2) + "deg");
      if (activo || Math.abs(angulo) > 0.02 || Math.abs(vel) > 0.02) requestAnimationFrame(paso);
      else cartel.style.setProperty("--giro", "0deg");
    };
    new IntersectionObserver(([e]) => { activo = e.isIntersecting; if (activo) requestAnimationFrame(paso); }).observe(cartel);
  }

  /* ── ¿Está abierto ahora? Con la hora de Buenos Aires ──────────────── */
  const ahora = document.querySelector("[data-ahora]");
  if (ahora) {
    const horario = (dia) => (dia === 0 || dia === 6 ? [9, 21] : [8, 20]); // 0 = domingo
    const partes = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.weekday);
    const hora = Number(partes.hour) + Number(partes.minute) / 60;
    const [abre, cierra] = horario(dia);
    let texto;
    if (hora >= abre && hora < cierra) texto = `Ahora está abierto. Cierra a las ${cierra}:00.`;
    else if (hora < abre) texto = `Ahora está cerrado. Abre hoy a las ${abre}:00.`;
    else texto = `Ahora está cerrado. Abre mañana a las ${horario((dia + 1) % 7)[0]}:00.`;
    ahora.textContent = texto;
    ahora.hidden = false;
  }
})();
