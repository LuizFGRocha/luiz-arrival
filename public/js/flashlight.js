// ==========================================
// MODO ESCURO — escurece a tela e ilumina a área ao redor do ponteiro
// ==========================================
// Não troca a paleta de cores: só cobre a tela com uma camada preta que tem um
// "furo" de luz seguindo o ponteiro. A camada tem pointer-events: none, então
// clicar/arrastar/digitar continua funcionando normalmente por baixo.

(function () {
  const FLASHLIGHT_KEY = "luizos_flashlight_mode";
  const FLASHLIGHT_RADIUS = 130; // px — raio da área iluminada

  const style = document.createElement("style");
  style.textContent = `
    #flashlight-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483000;
      display: none;
      --fl-x: 50vw;
      --fl-y: 50vh;
      --fl-r: ${FLASHLIGHT_RADIUS}px;
      background: radial-gradient(
        circle var(--fl-r) at var(--fl-x) var(--fl-y),
        rgba(255, 244, 200, 0) 0%,
        rgba(255, 244, 200, 0) 55%,
        rgba(0, 0, 0, 0.85) 85%,
        rgba(0, 0, 0, 0.985) 100%
      );
    }
    #flashlight-overlay.on { display: block; }
    #flashlight-overlay.off-screen { --fl-r: 0px; }
    #flashlight-overlay.flicker { animation: fl-flicker 0.35s steps(2) 1; }
    @keyframes fl-flicker {
      0%, 100% { opacity: 1; }
      25% { opacity: 0.4; }
      50% { opacity: 1; }
      75% { opacity: 0.2; }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "flashlight-overlay";
  document.body.appendChild(overlay);

  let enabled = false;
  let pendingFrame = null;
  // Última posição conhecida do ponteiro. É rastreada mesmo com o modo
  // desligado, pra lanterna já acender onde o mouse está (o navegador não
  // expõe a posição do mouse sem um evento). Antes do primeiro evento
  // (ex: modo salvo ligado e página recém-carregada) fica tudo escuro.
  let lastX = null;
  let lastY = null;

  function trackPointer(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (enabled) {
      overlay.classList.remove("off-screen");
      scheduleMove();
    }
  }
  document.addEventListener("pointermove", trackPointer, { passive: true });
  document.addEventListener("pointerdown", trackPointer, { passive: true, capture: true });

  // Mouse saiu da janela do navegador: lanterna "some" e fica tudo preto.
  document.addEventListener("pointerout", (e) => {
    if (enabled && !e.relatedTarget) overlay.classList.add("off-screen");
  });

  // Atualiza a posição no máximo 1x por frame (pointermove dispara bem mais).
  function scheduleMove() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      overlay.style.setProperty("--fl-x", `${lastX}px`);
      overlay.style.setProperty("--fl-y", `${lastY}px`);
    });
  }

  function setFlashlightMode(on) {
    enabled = on;
    overlay.classList.toggle("on", on);
    if (on) {
      if (lastX === null) {
        overlay.classList.add("off-screen");
      } else {
        overlay.classList.remove("off-screen");
        // Aplica direto (sem esperar o frame) pra não piscar na posição antiga.
        overlay.style.setProperty("--fl-x", `${lastX}px`);
        overlay.style.setProperty("--fl-y", `${lastY}px`);
      }
      overlay.classList.remove("flicker");
      void overlay.offsetWidth; // reinicia a animação
      overlay.classList.add("flicker");
    }
    document.querySelectorAll(".flashlight-toggle-label").forEach((el) => {
      el.textContent = on ? "🔦 Acender as luzes" : "🔦 Modo Escuro";
    });
    try {
      localStorage.setItem(FLASHLIGHT_KEY, String(on));
    } catch {}
  }

  window.toggleFlashlightMode = function () {
    setFlashlightMode(!enabled);
  };

  let saved = false;
  try {
    saved = localStorage.getItem(FLASHLIGHT_KEY) === "true";
  } catch {}
  setFlashlightMode(saved);
})();
