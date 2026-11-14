import assert from "node:assert/strict";

// Exercise the real React players and controls, replacing only YouTube's
// external API so buffering, autoplay failures and late events are repeatable.
export function installTestYouTube() {
  window.mediaTestPlayers = {};
  // The production player keeps both songs buffered. Keep the historical
  // `music` handle useful to interaction suites by resolving the selected song.
  Object.defineProperty(window.mediaTestPlayers, "music", { configurable: true,
    get: () => window.mediaTestPlayers[document.querySelector('.bus-app')?.dataset.party === 'true' ? 'party' : 'background'] });
  window.YT = { Player: class {
    constructor(element, options) {
      this.options = options;
      this.videoId = options.videoId;
      this.state = -1;
      this.volume = 50;
      this.destroyed = false;
      this.playCalls = 0;
      this.pauseCalls = 0;
      this.commands = [];
      this.currentTime = 0;
      this.startedAt = performance.now();
      this.captionModuleReady = false;
      this.captionsVisible = true; // Simulate a remembered YouTube preference.
      this.captionResets = 0;
      this.source = element.closest("[data-theory-video]") ? "theory"
        : options.videoId === "63RzVcR1qHg" ? "background"
        : options.videoId === "RbZMoeHdR3I" ? "party" : "bus";
      this.bufferReadyAt = performance.now() + (this.source === "bus" ? window.mediaTestBufferDelay ?? 0 : 0);
      this.iframe = document.createElement("iframe");
      this.iframe.src = "about:blank";
      element.replaceWith(this.iframe);
      window.mediaTestPlayers[this.source] = this;
      queueMicrotask(() => {
        if (this.destroyed) return;
        options.events.onReady({ target: this });
        this.captionModuleReady = true;
        options.events.onApiChange?.({ target: this });
      });
    }
    emitState(state) {
      this.currentTime = this.getCurrentTime();
      this.startedAt = performance.now();
      this.state = state;
      this.options.events.onStateChange?.({ target: this, data: state });
    }
    record(command, value) {
      this.commands.push({command, value, phase:document.querySelector('.bus-app')?.dataset.phase,
        elapsed:window.busJourneyTestState?.()?.elapsed, blend:window.busJourneyTestState?.()?.cameraBlend,
        muted:this.muted, volume:this.volume, videoId:this.videoId,tvState:window.mediaTestPlayers.bus?.state,musicState:window.mediaTestPlayers.music?.state,
        musicMuted:window.mediaTestPlayers.music?.muted, time:performance.now()});
    }
    playVideo() { this.playCalls++; this.record('play'); if (this.state !== 1) this.emitState(1); }
    pauseVideo() { this.pauseCalls++; this.record('pause'); if (this.state !== 2) this.emitState(2); }
    mute() { this.muted = true; }
    unMute() { this.muted = false; }
    setVolume(value) { this.volume = value; this.record('volume', value); }
    getVolume() { return this.volume; }
    getCurrentTime() { return this.currentTime + (this.state === 1 ? (performance.now() - this.startedAt) / 1000 : 0); }
    getVideoUrl() { return 'https://www.youtube.com/watch?v='+this.videoId; }
    getDuration() { return 600; }
    getVideoLoadedFraction() { return performance.now() >= this.bufferReadyAt ? .05 : 0; }
    getPlayerState() { return this.state; }
    getIframe() { return this.iframe; }
    getOptions(module) { return this.captionModuleReady ? module ? ["track"] : ["captions"] : []; }
    setOption(module, option, value) {
      if (module === "captions" && option === "track" && Object.keys(value).length === 0) {
        this.captionsVisible = false;
        this.captionResets++;
      }
    }
    seekTo(value) { this.currentTime = value; this.startedAt = performance.now(); this.record('seek', value); }
    cueVideoById(video) { this.videoId=video.videoId;this.currentTime=video.startSeconds??0;this.startedAt=performance.now();this.record('cue',video);this.emitState(5); }
    loadVideoById(video) { this.cueVideoById(video); this.record('load',video); this.playVideo(); }
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
  await wait("window.mediaTestPlayers.bus.captionsVisible === false", "Bus captions turn off when their module loads");
  await run("window.mediaTestPlayers.bus.captionsVisible = true; window.mediaTestPlayers.bus.options.events.onApiChange({target:window.mediaTestPlayers.bus})");
  assert.equal(await run("window.mediaTestPlayers.bus.captionsVisible"), true, "After initialization the viewer can enable captions manually.");
  assert.equal(await run("window.mediaTestPlayers.bus.captionResets"), 1, "Only the initial caption preference is reset.");
  await run(`document.querySelector('button[aria-label^="Activer la musique de fond"]').click()`);
  await wait(musicPlaying, "Music starts from its button");
  const pausesBeforeModal = await run("window.mediaTestPlayers.music.pauseCalls");
  await openTheory();
  assert.equal(await run(musicPlaying), true, "Reading the theory must keep music playing.");
  await openVideo();
  assert.equal(await run("window.mediaTestPlayers.music.pauseCalls"), pausesBeforeModal, "Opening the video tab keeps music playing until playback.");
  await run("window.mediaTestPlayers.theory.state = 1");
  await wait(musicPaused, "Playback state polling suspends music even without a YouTube event");
  assert.equal(await run("window.mediaTestPlayers.music.muted"), true, "Music must be muted while the cross-frame pause is processed.");
  await run("window.mediaTestPlayers.theory.state = 2");
  await wait(musicPlaying, "Polling a silent pause event restores music");
  assert.equal(await run("window.mediaTestPlayers.music.muted"), false, "Resumption restores audible music.");
  const pausesAfterPolling = await run("window.mediaTestPlayers.music.pauseCalls");
  await emit(5);
  await emit(3);
  assert.equal(await run("window.mediaTestPlayers.music.pauseCalls"), pausesAfterPolling, "Cueing/buffering before play must not pause music.");
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
  assert.equal(await run("window.mediaTestPlayers.bus.commands.filter(c=>c.command==='play' && c.phase==='inside').at(-1).musicMuted"), true, "Music must be muted before the bus TV's play command, across the two React roots.");
  await run("window.mediaTestPlayers.music.commands = []; window.mediaTestPlayers.bus.emitState(2)");
  await wait(musicPlaying, "Bus TV pause starts the music crescendo");
  await wait("window.mediaTestPlayers.music.commands.some(c=>c.command==='volume'&&c.value>10&&c.value<75)", "Music passes through intermediate crescendo levels");
  await wait("window.mediaTestPlayers.music.volume === 85", "Music reaches its saved target after the crescendo");
  const crescendo = await run("window.mediaTestPlayers.music.commands.filter(c=>c.command==='volume').map(c=>({value:c.value,time:c.time}))");
  assert.equal(crescendo[0].value, 0, "Resumption must begin silently.");
  assert(crescendo.length > 8 && crescendo.every((step,index)=>index===0||step.value>=crescendo[index-1].value), "The crescendo must have multiple increasing steps without a jump to full volume.");
  assert(crescendo.at(-1).time-crescendo[0].time>=1700,"The fade must last about two seconds.");
  await run("window.mediaTestPlayers.bus.emitState(1)");
  await wait(musicPaused, "Restarting TV interrupts a completed crescendo");
  await run("window.mediaTestPlayers.bus.state = 2");
  await wait(musicPlaying, "Bus TV polling restores music even without a pause event");
  await run("window.mediaTestPlayers.bus.state = 1");
  await wait(musicPaused, "Bus TV polling cuts music on resumed playback");
  await run("window.mediaTestPlayers.bus.emitState(2)");
  await wait(musicPlaying, "Pausing the bus TV restores music");
  await run("window.mediaTestPlayers.bus.emitState(1)");
  await wait(musicPaused, "Bus TV resumes");
  await openTheory();
  await wait(musicPaused, "Reading keeps bus TV playing and preserves its audio channel");
  assert.equal(await run("window.mediaTestPlayers.bus.state"), 1, "A reading overlay must not pause television.");
  await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
  await wait(musicPaused, "Closing reading keeps bus TV active");
  await run(`document.querySelector('button[aria-label="Éteindre la télévision"]').click()`);
  await wait(musicPlaying, "Turning the TV off restores music");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  console.log("Music/video interaction checks passed (reading, play, buffering, pause, end, tabs, close, errors, user choice and bus TV).");
}
