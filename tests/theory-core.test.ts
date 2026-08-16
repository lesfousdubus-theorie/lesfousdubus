import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('présentation du noyau de la théorie', () => {
  const summary = read('src/pages/theorie/resume.astro');
  const mechanism = read('src/components/TheoryMechanism.astro');
  const homepage = read('src/pages/index.astro');

  it('conserve les éléments structurants de la transcription originale', () => {
    expect(summary).toContain('Lodestar à une autre');
    expect(summary).toContain('Robin et le savoir des Kozuki');
    expect(summary).toContain('One Piece serait cette histoire elle-même');
  });

  it('distingue la boucle d’information du mécanisme physique non résolu', () => {
    expect(mechanism).toContain('boucle d’information');
    expect(mechanism).toContain('Véhicule non tranché');
    expect(summary).toContain('le mécanisme temporel exact n’est pas résolu');
  });

  it('énumère les véhicules de transmission envisagés sans trancher', () => {
    // Le cadrage doit rester homogène partout : plusieurs véhicules possibles,
    // mais jamais de boucle physique généralisée.
    expect(mechanism).toContain('Ponéglyphes');
    expect(mechanism).toContain('préscience');
    expect(mechanism).toContain('Toki Toki no Mi');
    expect(mechanism).toContain('jamais une boucle physique généralisée');
  });

  it('annonce un temps de lecture réaliste sur la page d’accueil', () => {
    expect(homepage).toContain('8 minutes');
    expect(homepage).not.toContain('30 secondes');
  });
});
