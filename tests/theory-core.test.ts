import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('présentation du noyau de la théorie', () => {
  const summary = read('src/pages/theorie/resume.astro');
  const mechanism = read('src/components/TheoryMechanism.astro');
  const homepage = read('src/pages/index.astro');

  it('conserve les éléments structurants tout en séparant faits et mécanismes', () => {
    expect(summary).toContain('Lodestar est la dernière île indiquée par le Log Pose');
    expect(summary).toContain('Robin les lit mais ne sait pas les graver');
    expect(summary).toContain(
      'Le One Piece pourrait contenir la véritable histoire vécue par Luffy',
    );
    expect(summary).toContain('une coordonnée temporelle demeure hypothétique');
  });

  it('décrit une chronologie informationnelle sans boucle temporelle générale', () => {
    expect(mechanism).toContain('Le véhicule exact reste ouvert');
    expect(mechanism).toContain('Mécanisme non tranché');
    expect(mechanism).toContain('ne postule pas une boucle temporelle générale');
    expect(mechanism).toContain('Passé apparent : information future');
    expect(mechanism).toContain('Futur projeté : création de la mémoire');
  });

  it('place les Ponéglyphes au centre et garde les autres véhicules en branches', () => {
    expect(mechanism).toContain('Les Ponéglyphes sont le support central');
    expect(mechanism).toContain('Communication temporelle et préscience');
    expect(mechanism).toContain('Harley peut transmettre un récit');
    expect(mechanism).toContain('Emeth ou Zoro relèvent d’un transport physique plus spéculatif');
    expect(mechanism).not.toContain('Le Toki Toki no Mi permet une communication vers le passé');
  });

  it('annonce un temps de lecture réaliste sur la page d’accueil', () => {
    expect(homepage).toContain('10 min');
    expect(homepage).not.toContain('30 secondes');
  });
});
