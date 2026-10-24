// ==========================================
// DOOM (1993 Shareware) via js-dos 6.22
// ==========================================

let doomScriptLoaded = false;
let doomScriptLoading = false;
let doomCiPromise = null;
let doomDosInstance = null;
let doomTitleGuardInstalled = false;
let doomProgramStarted = false;
let doomClosing = false;

function installDoomTitleGuard() {
  if (doomTitleGuardInstalled) return;
  doomTitleGuardInstalled = true;

  const originalTitle = document.title || "Que horas o Luiz chega?";
  const titleEl = document.querySelector("title");

  try {
    Object.defineProperty(document, "title", {
      configurable: true,
      get() {
        return titleEl ? titleEl.textContent : originalTitle;
      },
      set(val) {
        const str = String(val || "");
        if (/dosbox/i.test(str)) {
          if (/Program:\s*DOOM/i.test(str)) {
            doomProgramStarted = true;
          } else if (doomProgramStarted && /Program:\s*(DOSBOX|COMMAND)/i.test(str)) {
            handleDoomQuit();
          }
          return;
        }
        if (titleEl) titleEl.textContent = str;
      },
    });
  } catch {}
}

function handleDoomQuit() {
  if (doomClosing) return;
  doomClosing = true;
  doomProgramStarted = false;
  const win = document.getElementById("win-doom");
  if (win && win.style.display !== "none") {
    closeWindow("win-doom");
  }
  stopDoomGame();
}

function loadJsDosScript() {
  if (doomScriptLoaded || window.Dos) {
    doomScriptLoaded = true;
    return Promise.resolve();
  }
  if (doomScriptLoading) {
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (window.Dos) {
          clearInterval(check);
          doomScriptLoaded = true;
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error("Tempo esgotado ao carregar o emulador DOS."));
      }, 15000);
    });
  }

  doomScriptLoading = true;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js-dos.com/6.22/current/js-dos.js";
    s.onload = () => {
      doomScriptLoaded = true;
      doomScriptLoading = false;
      resolve();
    };
    s.onerror = () => {
      doomScriptLoading = false;
      reject(new Error("Falha ao carregar js-dos.js"));
    };
    document.head.appendChild(s);
  });
}

async function openDoomWindow() {
  openWindow("win-doom");
  await initDoomGame();
}

async function initDoomGame() {
  const statusEl = document.getElementById("doom-status");
  const canvas = document.getElementById("doom-canvas");
  if (!canvas) return;

  if (doomDosInstance) {
    canvas.focus();
    return;
  }

  try {
    installDoomTitleGuard();
    doomClosing = false;
    doomProgramStarted = false;

    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.textContent = "⏳ Carregando emulador MS-DOS e DOOM (1993)...";
    }

    await loadJsDosScript();

    window.Dos(canvas, {
      wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js",
      cycles: "max",
      autolock: false,
    }).ready((fs, main) => {
      if (statusEl) statusEl.textContent = "📦 Extraindo DOOM Shareware...";
      fs.extract("/assets/doom/doom.zip")
        .then(() => {
          if (statusEl) statusEl.style.display = "none";
          doomCiPromise = main(["-c", "DOOM.EXE", "-c", "ECHO __DOOM_EXIT__"]);
          doomCiPromise.then((ci) => {
            doomDosInstance = ci;
            if (ci && typeof ci.listenStdout === "function") {
              let stdoutBuf = "";
              ci.listenStdout((data) => {
                stdoutBuf += String(data || "");
                if (stdoutBuf.includes("__DOOM_EXIT__")) {
                  handleDoomQuit();
                }
              });
            }
            if (ci && typeof ci.onping === "function") {
              const origOnPing = ci.onping.bind(ci);
              ci.onping = (event, args) => {
                if (event === "shell_input" && doomProgramStarted) {
                  handleDoomQuit();
                  return;
                }
                return origOnPing(event, args);
              };
            }
            canvas.focus();
          });
        })
        .catch((err) => {
          console.error("Erro ao extrair DOOM:", err);
          if (statusEl) statusEl.textContent = "❌ Erro ao extrair pacote do DOOM.";
        });
    });
  } catch (err) {
    console.error("initDoomGame:", err);
    if (statusEl) statusEl.textContent = "❌ " + err.message;
  }
}

function stopDoomGame() {
  const inst = doomDosInstance;
  doomDosInstance = null;
  doomCiPromise = null;

  if (inst && typeof inst.exit === "function") {
    try {
      inst.exit();
    } catch {}
  }

  const wrap = document.getElementById("doom-container");
  if (wrap) {
    wrap.innerHTML = '<canvas id="doom-canvas" width="640" height="400" tabindex="0"></canvas>';
  }
  const statusEl = document.getElementById("doom-status");
  if (statusEl) {
    statusEl.style.display = "none";
    statusEl.textContent = "";
  }
}
