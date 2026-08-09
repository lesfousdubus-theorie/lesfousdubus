import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { theoryTimeline, timelineEras } from '../src/data/theoryTimeline';

describe('frise chronologique interactive', () => {
  it('couvre toutes les grandes époques avec des identifiants uniques', () => {
    expect(theoryTimeline.length).toBeGreaterThanOrEqual(30);
    expect(new Set(theoryTimeline.map((event) => event.id)).size).toBe(theoryTimeline.length);

    for (const era of timelineEras) {
      expect(theoryTimeline.some((event) => event.era === era.id)).toBe(true);
    }
  });

  it('distingue les faits, la théorie, les hypothèses et les projections', () => {
    const statuses = new Set(theoryTimeline.map((event) => event.status));
    expect(statuses).toEqual(new Set(['canon', 'central', 'hypothese', 'projection']));
  });

  it('fournit un contenu détaillé et au moins un lien pour chaque événement', () => {
    for (const event of theoryTimeline) {
      expect(event.summary.length).toBeGreaterThan(30);
      expect(event.detail.length).toBeGreaterThan(80);
      expect(event.links.length).toBeGreaterThan(0);
      expect(event.links.every((link) => link.href.startsWith('/'))).toBe(true);
    }
  });

  it('préserve le défilement horizontal tactile et les contrôles accessibles', () => {
    const component = readFileSync(
      resolve(process.cwd(), 'src/components/InteractiveTheoryTimeline.astro'),
      'utf8',
    );
    expect(component).toContain('overflow-x: auto');
    expect(component).toContain('touch-action: pan-x pan-y');
    expect(component).toContain('scroll-snap-type: x proximity');
    expect(component).toContain('aria-label="Position dans la frise chronologique"');
    expect(component).toContain('dialog.showModal()');
  });
});
