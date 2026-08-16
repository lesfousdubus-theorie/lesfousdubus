import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  theoryTimeline,
  timelineDateCertainty,
  timelineEras,
  timelineMotifs,
  timelineStatus,
  timelineThreads,
} from '../src/data/theoryTimeline';

describe('frise chronologique interactive', () => {
  it('couvre toutes les grandes époques avec des identifiants uniques', () => {
    expect(theoryTimeline.length).toBeGreaterThanOrEqual(50);
    expect(new Set(theoryTimeline.map((event) => event.id)).size).toBe(theoryTimeline.length);

    for (const era of timelineEras) {
      expect(theoryTimeline.some((event) => event.era === era.id)).toBe(true);
    }
  });

  it('garde les périodes anciennes disjointes et place Emeth dans la longue veille', () => {
    const byEra = new Map(timelineEras.map((era) => [era.id, era]));
    const byId = new Map(theoryTimeline.map((event) => [event.id, event]));

    expect(byEra.get('traces')?.range).toBe('≈ −900 à −800');
    expect(byEra.get('veille')?.range).toBe('−799 à −40');
    expect(byId.get('emeth-mary-geoise')?.era).toBe('veille');
    expect(byId.get('emeth-mary-geoise')?.date).toBe('−200 ans');
    expect(byId.get('missions-des-peuples')?.era).toBe('veille');
    expect(byId.get('missions-des-peuples')?.date).toContain('par étapes');
  });

  it('représente tous les fils narratifs et illustre la majorité de la frise', () => {
    for (const thread of Object.keys(timelineThreads)) {
      expect(theoryTimeline.some((event) => event.thread === thread)).toBe(true);
    }
    expect(timelineThreads.joyboy).toEqual({
      label: 'La libération',
      shortLabel: 'Libération',
    });

    const illustrated = theoryTimeline.filter((event) => event.image);
    expect(illustrated.length).toBeGreaterThanOrEqual(30);
    for (const event of illustrated) {
      expect(existsSync(resolve(process.cwd(), `public${event.image}`))).toBe(true);
      expect(event.imageAlt?.length).toBeGreaterThan(15);
    }
  });

  it('distingue les faits, la théorie centrale, les extensions, les hypothèses et les projections', () => {
    const statuses = new Set(theoryTimeline.map((event) => event.status));
    expect(statuses).toEqual(new Set(['canon', 'central', 'extension', 'hypothese', 'projection']));
    expect(Object.values(timelineStatus).map((status) => status.shortLabel)).toEqual([
      'Manga',
      'Théorie centrale',
      'Extension',
      'Hypothèse récente',
      'Projection',
    ]);
  });

  it('attribue une source précise et une certitude de date à chaque carte', () => {
    const dateCertainties = new Set(Object.keys(timelineDateCertainty));

    for (const event of theoryTimeline) {
      expect(event.source.length, event.id).toBeGreaterThan(8);
      expect(event.source, event.id).not.toMatch(/transcription de la théorie/i);
      expect(dateCertainties.has(event.dateCertainty), event.id).toBe(true);
    }

    for (const event of theoryTimeline.filter((entry) => entry.status === 'canon')) {
      expect(event.chapter, event.id).toMatch(/^Ch\./);
      expect(event.source, event.id).toMatch(/^Manga — chap\./);
    }
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
      'roger-jeune-silhouette-1181',
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
    expect(byId.get('geants-recits-contradictoires')?.summary).toContain('Ce qu’Imu raconte');
    expect(byId.get('geants-recits-contradictoires')?.summary).toContain(
      '↔ ce que la chronologie connue montre',
    );
    expect(byId.get('joyboy-consequence-histoire')?.status).toBe('central');
  });

  it('matérialise le segment Brook de −80 à −50 ans', () => {
    const brook = theoryTimeline.find((event) => event.id === 'brook-premiers-vers');
    expect(brook?.segment?.range).toBe('−80 à −50 ans');
    expect(brook?.segment?.stops).toEqual([
      'Enfance',
      'Chanson prototype',
      'Binks no Sake',
      'Passé royal',
      'Dōzan ?',
      'Rumbar',
      'Assassinat',
      'Disparition — 50 ans',
    ]);

    const brookFruit = theoryTimeline.find((event) => event.id === 'brook-ignore-fruits');
    const fruitTheory = theoryTimeline.find((event) => event.id === 'fruits-apparition-recente');
    expect(brookFruit?.status).toBe('canon');
    expect(brookFruit?.source).toBe('Manga — chap. 1186');
    expect(fruitTheory?.status).toBe('hypothese');
  });

  it('rend visible l’évolution Roger 1181→1188 et le motif des erreurs d’identité', () => {
    const byId = new Map(theoryTimeline.map((event) => [event.id, event]));
    const evolvingLabel = 'Hypothèse évolutive — mise à jour au 1188';
    const motif = 'confusion-imu';

    expect(timelineMotifs[motif]).toBe('Imu se trompe d’identité');
    expect(byId.get('roger-jeune-silhouette-1181')?.evolution).toBe(evolvingLabel);
    expect(byId.get('roger-communication-laugh-tale')?.evolution).toBe(evolvingLabel);
    expect(byId.get('roger-jeune-silhouette-1181')?.motif).toBe(motif);
    expect(byId.get('roger-communication-laugh-tale')?.motif).toBe(motif);
    expect(byId.get('imu-confond-xebec-davy-jones')?.motif).toBe(motif);
    expect(byId.get('vivi-ressemblance-lili')?.motif).toBe(motif);
  });

  it('emploie les formulations neutres ou conditionnelles demandées', () => {
    const titles = new Map(theoryTimeline.map((event) => [event.id, event.title]));
    expect(titles.get('vivi-et-lombre-de-lili')).toBe('Naissance de Nefertari Vivi');
    expect(titles.get('vivi-ressemblance-lili')).toBe('Imu pourrait prendre Vivi pour Lili');
    expect(titles.get('chapeau-luffy')).toBe('Shanks confie le chapeau de paille à Luffy');
    expect(titles.get('shanks-choisit-detenteur')).toBe(
      'Shanks pourrait choisir le futur détenteur du chapeau',
    );
    expect(titles.get('luffy-devient-joyboy')).toBe('Luffy pourrait être reconnu comme Joy Boy');
    expect(titles.get('vivi-devient-lili')).toBe('Vivi pourrait accomplir le rôle de Lili');
    expect(titles.get('ryuma-repart-wano')).toBe('Zoro pourrait être envoyé vers l’ancien Wano');
    expect(titles.get('loki-devient-nidhogg')).toBe('Loki pourrait devenir Nidhogg');
    expect(titles.get('one-piece-revele')).toBe(
      'Le One Piece pourrait contenir ou révéler l’histoire de Luffy',
    );

    const byId = new Map(theoryTimeline.map((event) => [event.id, event]));
    expect(byId.get('vivi-et-lombre-de-lili')?.status).toBe('canon');
    expect(byId.get('vivi-et-lombre-de-lili')?.detail).not.toMatch(/Lili|théorie/i);
    expect(byId.get('chapeau-luffy')?.status).toBe('canon');
    expect(byId.get('chapeau-luffy')?.detail).not.toMatch(/théorie|destiné|Joy Boy/i);

    for (const event of theoryTimeline.filter((entry) => entry.status === 'projection')) {
      expect(event.title, event.id).toMatch(/pourrait|pourraient/i);
    }
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
    expect(component).toContain('{event.source}');
    expect(component).not.toContain("event.chapter ?? 'Source : transcription de la théorie'");
    expect(component).toContain('timelineDateCertainty[event.dateCertainty]');
    expect(component).toContain('Passé apparent');
    expect(component).toContain('← informations du futur');
    expect(component).toContain('Présent');
    expect(component).toContain('← événements vécus');
    expect(component).toContain('Futur projeté');
    expect(component).toContain('← création de la mémoire');
    expect(component).toContain(".timeline-event[data-status='hypothese'] .event-connector");
    expect(component).toContain(
      ".timeline-event[data-status='projection'] .event-connector::before",
    );
    expect(component).toContain('Imu se trompe d’identité');
    expect(component).toContain('dialog.showModal()');
  });

  it('publie la frise reconstruite sur la page chronologie principale', () => {
    const page = readFileSync(
      resolve(process.cwd(), 'src/pages/theorie/chronologie.astro'),
      'utf8',
    );
    expect(page).toContain('<InteractiveTheoryTimeline />');
    expect(page).toContain('Chaque carte indique les chapitres ou le dossier');
    expect(page).toContain(
      "const canonCount = theoryTimeline.filter((event) => event.status === 'canon').length",
    );
    expect(page).toContain('{canonCount} repères Manga');
    const statLabels = ['événements', 'illustrés', 'périodes', 'fils narratifs'];
    const statPositions = statLabels.map((label) => page.indexOf(`<span>${label}</span>`));
    expect(statPositions.every((position) => position >= 0)).toBe(true);
    expect(statPositions).toEqual([...statPositions].sort((a, b) => a - b));
    expect(page).toContain(
      'const imageCount = theoryTimeline.filter((event) => event.image).length',
    );
    expect(page).toContain('const threadCount = Object.keys(timelineThreads).length');
    expect(page).not.toMatch(/parcourez cette boucle/i);
  });
});
