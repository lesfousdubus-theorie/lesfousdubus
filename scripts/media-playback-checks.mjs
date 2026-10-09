import assert from "node:assert/strict";

// Exercise the real React players and controls, replacing only YouTube's
// external API so buffering, autoplay failures and late events are repeatable.
function installTestYouTube() {
  window.mediaTestPlayers = {};
  window.YT = { Player: class {
    constructor(element, options) {
      this.options = options;
      this.state = -1;
      this.volume = 50;
      this.destroyed = false;
      this.playCalls = 0;
      this.pauseCalls = 0;
      this.source = element.closest("[data-theory-video]") ? "theory"
        : options.videoId === "63RzVcR1qHg" ? "music" : "bus";
      this.iframe = document.createElement("iframe");
      this.iframe.src = "about:blank";
      element.replaceWith(this.iframe);
      window.mediaTestPlayers[this.source] = this;
      queueMicrotask(() => { if (!this.destroyed) options.events.onReady({ target: this }); });
    }
    emitState(state) {
      this.state = state;
      this.options.events.onStateChange?.({ target: this, data: state });
    }
    playVideo() { this.playCalls++; if (this.state !== 1) this.emitState(1); }
    pauseVideo() { this.pauseCalls++; if (this.state !== 2) this.emitState(2); }
    mute() { this.muted = true; }
    unMute() { this.muted = false; }
    setVolume(value) { this.volume = value; }
    getVolume() { return this.volume; }
    getCurrentTime() { return 0; }
    getDuration() { return 600; }
    getPlayerState() { return this.state; }
    getIframe() { return this.iframe; }
    seekTo() {}
    destroy() { this.destroyed = true; this.iframe.remove(); }
  } };
}

export async function runMediaPlaybackChecks({ send, evaluate, waitForPageCondition, baseUrl }) {
  const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(${installTestYouTube.toString()})()`,
  });
  await send("Page.navigate", { url: `${baseUrl}/?phase=inside&count=2` });
  const wait = (expression, label) => waitForPageCondition(send, expression, label, 30_000);
  const run = expression => evaluate(send, expression);
  const musicPlaying = "window.mediaTestPlayers.music?.state === 1";
  const musicPaused = "window.mediaTestPlayers.music?.state === 2";
  const musicEnabled = "Boolean(document.querySelector('button[aria-label=\"Couper la musique de fond\"]'))";
  const openTheory = async () => {
    await run(`document.querySelector('button[title="Découvrir la théorie des Fous du Bus"]').click()`);
    await wait("Boolean(document.getElementById('theory-tab-video'))", "Theory opens for music checks");
  };
  const openVideo = async () => {
    await run("document.getElementById('theory-tab-video').click()");
    await wait("Boolean(window.mediaTestPlayers.theory) && !window.mediaTestPlayers.theory.destroyed", "Theory player ready");
  };
  const emit = state => run(`window.mediaTestPlayers.theory.emitState(${state})`);

  await wait("Boolean(window.mediaTestPlayers.music) && Boolean(window.mediaTestPlayers.bus)", "Music and bus players ready");
  await run(`document.querySelector('button[aria-label^="Activer la musique de fond"]').click()`);
  await wait(musicPlaying, "Music starts from its button");
  const pausesBeforeModal = await run("window.mediaTestPlayers.music.pauseCalls");
  await openTheory();
  assert.equal(await run(musicPlaying), true, "Reading the theory must keep music playing.");
  await openVideo();
  await emit(5);
  await emit(3);
  assert.equal(await run("window.mediaTestPlayers.music.pauseCalls"), pausesBeforeModal, "Opening/cueing/buffering before play must not pause music.");
  await emit(1);
  await wait(musicPaused, "Starting the theory video suspends music");
  assert.equal(await run(musicEnabled), true, "A temporary video pause must preserve the user's music choice.");
  await emit(3);
  assert.equal(await run(musicPaused), true, "Buffering during playback must keep music suspended.");
  await emit(2);
  await wait(musicPlaying, "Pausing the video resumes music");
  await emit(1);
  await wait(musicPaused, "Resuming the video suspends music");
  await emit(0);
  await wait(musicPlaying, "The end of the video resumes music");
  await emit(1);
  await wait(musicPaused, "Video active before switching tabs");
  await run("document.getElementById('theory-tab-thesis').click()");
  await wait(musicPlaying, "Switching back to reading releases the video's audio channel");
  await openVideo();
  await emit(1);
  await wait(musicPaused, "Video active before closing modal");
  await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
  await wait(musicPlaying, "Closing the modal restores music");

  await run(`document.querySelector('button[aria-label="Couper la musique de fond"]').click()`);
  await wait(musicPaused, "User disables the music");
  await openTheory();
  await openVideo();
  await emit(1);
  await emit(2);
  assert.equal(await run(musicPaused), true, "Video pause must not reactivate music disabled by the user.");
  await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
  assert.equal(await run(musicEnabled), false, "Music must remain disabled after closing.");

  await run(`document.querySelector('button[aria-label^="Activer la musique de fond"]').click()`);
  await wait(musicPlaying, "Music enabled again");
  await openTheory();
  await openVideo();
  await emit(1);
  await wait(musicPaused, "Theory playback before error");
  await run("window.mediaTestPlayers.theory.options.events.onError({target: window.mediaTestPlayers.theory})");
  await wait(musicPlaying, "A video error releases music");
  await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);

  await run(`document.querySelector('button[aria-label="Allumer la télévision"]').click()`);
  await wait(musicPaused, "Actual bus TV playback suspends music");
  await run("window.mediaTestPlayers.bus.emitState(2)");
  await wait(musicPlaying, "Pausing the bus TV restores music");
  await run("window.mediaTestPlayers.bus.emitState(1)");
  await wait(musicPaused, "Bus TV resumes");
  await openTheory();
  await wait(musicPlaying, "Reading pauses bus TV and lets music continue");
  await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
  await wait(musicPaused, "Closing reading restores the active bus TV");
  await run(`document.querySelector('button[aria-label="Éteindre la télévision"]').click()`);
  await wait(musicPlaying, "Turning the TV off restores music");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  console.log("Music/video interaction checks passed (reading, play, buffering, pause, end, tabs, close, errors, user choice and bus TV).");
}
