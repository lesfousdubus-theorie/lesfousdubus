import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { theoryTimeline, timelineEras, timelineThreads } from '../src/data/theoryTimeline';

describe('frise chronologique interactive', () => {
  it('couvre toutes les grandes époques avec des identifiants uniques', () => {
    expect(theoryTimeline.length).toBeGreaterThanOrEqual(50);
    expect(new Set(theoryTimeline.map((event) => event.id)).size).toBe(theoryTimeline.length);

    for (const era of timelineEras) {
      expect(theoryTimeline.some((event) => event.era === era.id)).toBe(true);
    }
  });

  it('représente tous les fils de la transcription et illustre la majorité de la frise', () => {
    for (const thread of Object.keys(timelineThreads)) {
      expect(theoryTimeline.some((event) => event.thread === thread)).toBe(true);
    }

    const illustrated = theoryTimeline.filter((event) => event.image);
    expect(illustrated.length).toBeGreaterThanOrEqual(30);
    for (const event of illustrated) {
      expect(existsSync(resolve(process.cwd(), `public${event.image}`))).toBe(true);
      expect(event.imageAlt?.length).toBeGreaterThan(15);
    }
  });

  it('distingue les faits, le noyau, les extensions, les hypothèses et les projections', () => {
    const statuses = new Set(theoryTimeline.map((event) => event.status));
    expect(statuses).toEqual(new Set(['canon', 'central', 'extension', 'hypothese', 'projection']));
  });

  it('conserve les cartes Manga factuelles et sépare leurs lectures théoriques', () => {
    const byId = new Map(theoryTimeline.map((event) => [event.id, event]));
    const expectedStatuses = {
      'gouvernement-mondial': 'canon',
      'imu-regne-secret': 'extension',
      'lili-dispersion': 'canon',
      'vivi-dispersion-future': 'extension',
      'roger-lodestar': 'canon',
      'lodestar-geographie': 'extension',
      'galley-la-company': 'canon',
      'galley-la-nom-geants': 'extension',
      'emeth-reconnait-luffy': 'canon',
      'emeth-reconnait-luffy-futur': 'extension',
      'conversation-imu-joyboy': 'canon',
      'luffy-repond-imu-laugh-tale': 'projection',
    } as const;

    for (const [id, status] of Object.entries(expectedStatuses)) {
      expect(byId.get(id)?.status, id).toBe(status);
    }

    for (const event of theoryTimeline.filter((entry) => entry.status === 'canon')) {
      const copy = `${event.title} ${event.summary} ${event.detail}`;
      expect(copy, event.id).not.toMatch(
        /\b(?:serait|pourrait|auraient|devrait|hypothèse|théorie)\b/i,
      );
    }
  });

  it('intègre les apports 1183–1188 sans les faire passer pour le noyau', () => {
    const byId = new Map(theoryTimeline.map((event) => [event.id, event]));
    const required = [
      'brook-premiers-vers',
      'brook-dozan',
      'brook-ignore-fruits',
      'fruits-apparition-recente',
      'geants-recits-contradictoires',
      'imu-confond-geants-epoque',
      'imu-appelle-luffy-joyboy',
      'joyboy-consequence-histoire',
      'conversation-imu-joyboy',
      'roger-communication-laugh-tale',
      'luffy-repond-imu-laugh-tale',
    ];

    for (const id of required) expect(byId.has(id), id).toBe(true);
    expect(byId.get('brook-dozan')?.status).toBe('extension');
    expect(byId.get('fruits-apparition-recente')?.status).toBe('hypothese');
    expect(byId.get('imu-confond-geants-epoque')?.status).toBe('hypothese');
    expect(byId.get('joyboy-consequence-histoire')?.status).toBe('central');
  });

  it('place les Ponéglyphes au centre et garde les autres transmissions en branches', () => {
    const byId = new Map(theoryTimeline.map((event) => [event.id, event]));
    expect(byId.get('transmission-vers-passe')?.status).toBe('central');
    expect(byId.get('harley-vers-passe')?.status).toBe('extension');
    expect(byId.get('transport-physique-limite')?.status).toBe('extension');
    expect(byId.get('imu-communication-future')?.status).toBe('hypothese');
    expect(byId.get('imu-prescience-alternative')?.status).toBe('hypothese');
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

  it('publie la frise reconstruite sur la page chronologie principale', () => {
    const page = readFileSync(
      resolve(process.cwd(), 'src/pages/theorie/chronologie.astro'),
      'utf8',
    );
    expect(page).toContain('<InteractiveTheoryTimeline />');
    expect(page).toContain('Reconstituée depuis la source');
    expect(page).toContain(
      "const canonCount = theoryTimeline.filter((event) => event.status === 'canon').length",
    );
    expect(page).toContain('{canonCount} repères canoniques');
    expect(page).not.toMatch(/parcourez cette boucle/i);
  });
});
