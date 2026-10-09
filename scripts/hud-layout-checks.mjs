import assert from "node:assert/strict";

// Check active controls and transient panels in both camera modes. The basic
// smoke test also covers the theory dialog and its reading/video tabs.
export async function runHudLayoutChecks({ send, evaluate, waitForPageCondition, viewports }) {
  const run = expression => evaluate(send, expression);
  const inspect = () => run(`(() => {
    const visible = el => {
      if (el.closest('[aria-hidden="true"]')) return false;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none'
        && style.visibility !== 'hidden' && Number(style.opacity) > 0.01;
    };
    const name = el => el.getAttribute('aria-label') || el.textContent.trim();
    const rect = el => {
      const {left, right, top, bottom, width, height} = el.getBoundingClientRect();
      return {left, right, top, bottom, width, height};
    };
    const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
    const buttons = [...document.querySelectorAll('button')].filter(visible);
    const collisions = buttons.flatMap((a, i) => buttons.slice(i + 1)
      .filter(b => overlap(rect(a), rect(b))).map(b => [name(a), name(b)]));
    const outside = buttons.filter(el => {
      const r = rect(el);
      return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1;
    }).map(name);
    const small = buttons.filter(el => rect(el).width < 42 || rect(el).height < 42).map(name);
    const clippedLabels = buttons.flatMap(button => [...button.querySelectorAll('span')]
      .filter(visible).filter(span => {
        const a = rect(span), b = rect(button);
        return a.left < b.left - 1 || a.right > b.right + 1;
      }).map(span => [name(button), span.textContent.trim()]));
    const popup = document.querySelector('.bus-volume-popup');
    const popupOverflow = popup && visible(popup) ? [...popup.querySelectorAll('button,input')]
      .filter(el => { const a = rect(el), b = rect(popup); return a.left < b.left || a.right > b.right; }).map(name) : [];
    const toast = document.querySelector('.bus-toast-content');
    const headers = [...document.querySelectorAll('.bus-title-panel,.bus-top-stats,.bus-row-nav')].filter(visible);
    const headerCollisions = headers.flatMap((a, i) => headers.slice(i + 1)
      .filter(b => overlap(rect(a), rect(b))).map(b => [a.className, b.className]));
    const title = document.querySelector('.bus-title-panel');
    const stats = document.querySelector('.bus-top-stats');
    const titleHasRoom = title && stats && rect(title).right + 12 <= rect(stats).left;
    const titleLowered = Boolean(titleHasRoom && Math.abs(rect(title).top - rect(stats).top) > 1);
    const utilities = document.querySelector('.bus-day-night');
    const speed = document.querySelector('.bus-speed');
    const actions = [...document.querySelectorAll('.bus-exterior-controls,.bus-interior-controls')].find(visible);
    const a = actions && rect(actions), u = utilities && rect(utilities), s = speed && rect(speed);
    const actionsHaveRoom = a && u && s && u.right + a.width + 24 <= s.left;
    const actionsRaised = Boolean(actionsHaveRoom && Math.abs(a.bottom - s.bottom) > 1);
    const dockGap = a && u && s && a.bottom <= Math.min(u.top, s.top)
      ? Math.min(u.top, s.top) - a.bottom : 0;
    const obstacles = [...document.querySelectorAll('.bus-title-panel,.bus-top-stats,.bus-row-nav,.bus-exterior-controls,.bus-interior-controls,.bus-day-night,.bus-speed')].filter(visible);
    const toastCollisions = toast ? obstacles.filter(el => overlap(rect(toast), rect(el))).map(el => el.className) : [];
    return { collisions, headerCollisions, outside, small, clippedLabels, popupOverflow, toastCollisions,
      titleLowered, actionsRaised, dockGap,
      toastVisible: Boolean(toast && rect(toast).width > 0 && rect(toast).height > 0),
      toastClipped: Boolean(toast && toast.scrollHeight > toast.clientHeight + 1),
      overflow: document.documentElement.scrollWidth - innerWidth };
  })()`);
  const check = async label => {
    const result = await inspect();
    for (const key of ['collisions', 'headerCollisions', 'outside', 'small', 'clippedLabels', 'popupOverflow', 'toastCollisions']) {
      assert.equal(result[key].length, 0, `${label}: ${key}: ${JSON.stringify(result[key])}`);
    }
    assert(result.overflow <= 2, `${label}: horizontal overflow ${result.overflow}px`);
    assert(!result.titleLowered, `${label}: the title was lowered despite available horizontal space`);
    assert(!result.actionsRaised, `${label}: the actions were raised despite available horizontal space`);
    assert(result.dockGap <= 13, `${label}: unused vertical space between controls: ${result.dockGap}px`);
    return result;
  };

  // The media regression has installed a deterministic YouTube API on this page.
  // This keeps the widest music-ON state stable even without network/autoplay.
  assert(await run(`Boolean(window.mediaTestPlayers?.music)`), "Media mock missing for active HUD checks.");
  if (await run(`Boolean(document.querySelector('button[aria-label^="Activer la musique de fond"]'))`)) {
    await run(`document.querySelector('button[aria-label^="Activer la musique de fond"]').click()`);
  }
  for (const phase of ['inside', 'outside']) {
    if (phase === 'outside') {
      await run(`document.querySelector('button[aria-label="Sortir du bus"]').click()`);
      await waitForPageCondition(send, `document.querySelector('[data-phase]').dataset.phase === 'outside'`, "Exit before exterior layout checks", 10_000);
    }
    for (const viewport of viewports) {
      await send("Emulation.setDeviceMetricsOverride", {
        ...viewport, deviceScaleFactor: viewport.mobile ? 2 : 1,
        screenOrientation: viewport.width > viewport.height
          ? { type: "landscapePrimary", angle: 90 } : { type: "portraitPrimary", angle: 0 },
      });
      // Wait for ResizeObserver and the HUD's batched layout measurement.
      await run(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      const label = `${phase} ${viewport.width}x${viewport.height}`;
      await check(`${label}, music ON`);
      await run(`document.querySelector('.bus-day-night > button').click()`);
      await run(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      await check(`${label}, manual day/night`);
      await run(`document.querySelector('.bus-day-night > button').click()`);

      const hasPopup = await run(`getComputedStyle(document.querySelector('.bus-volume-toggle')).display !== 'none'`);
      if (hasPopup) {
        await run(`document.querySelector('.bus-volume-toggle').click()`);
        await waitForPageCondition(send, `Boolean(document.querySelector('.bus-volume-popup'))`, `${label}, volume panel`);
        await check(`${label}, volume open`);
        await run(`document.querySelector('.bus-volume-toggle').click()`);
      }
      await run(`window.dispatchEvent(new CustomEvent('bus-show-toast', {detail: {
        badge: '🧭 KYTA', sub: 'Le Mont Corvo',
        text: "« Le Log Pose s'affole ! La théorie du Mont Corvo se vérifie sous nos yeux ! »"
      }}))`);
      await waitForPageCondition(send, `Boolean(document.querySelector('.bus-toast-content'))`, `${label}, character notification`);
      const notification = await check(`${label}, notification`);
      assert(notification.toastVisible, `${label}: notification has no visible space`);
      assert(!notification.toastClipped, `${label}: character notification needs scrolling`);
      if (phase === 'inside') {
        for (const selector of [
          '.bus-top-stats button[aria-label]',
          '.bus-top-stats button:first-child',
          'button[aria-label="Ajouter un prénom"]',
          'button[aria-label="Mettre un commentaire"]',
        ]) {
          await run(`document.querySelector(${JSON.stringify(selector)}).click()`);
          await waitForPageCondition(send, `Boolean(document.querySelector('[role="dialog"]'))`, `${label}, dialog ${selector}`);
          const dialog = await run(`(() => {
            const card = document.querySelector('[role="dialog"]');
            const r = card.getBoundingClientRect();
            const close = card.querySelector('button[aria-label="Fermer la fenêtre"]').getBoundingClientRect();
            return { left:r.left, right:r.right, top:r.top, bottom:r.bottom,
              overflow:card.scrollWidth - card.clientWidth, closeTop:close.top, closeBottom:close.bottom };
          })()`);
          assert(dialog.left >= -1 && dialog.right <= viewport.width + 1
            && dialog.top >= -1 && dialog.bottom <= viewport.height + 1
            && dialog.overflow <= 2 && dialog.closeTop >= 0 && dialog.closeBottom <= viewport.height,
          `${label}, ${selector}: dialog is clipped: ${JSON.stringify(dialog)}`);
          await run(`document.querySelector('button[aria-label="Fermer la fenêtre"]').click()`);
          await waitForPageCondition(send, `!document.querySelector('[role="dialog"]') && !document.getElementById('site-content').inert`, `${label}, dialog closes`);
        }
      }
      console.log(`HUD checked: ${label}.`);
    }
  }
  console.log(`Active HUD/notification checks passed at ${viewports.length} sizes, inside and outside.`);
}
