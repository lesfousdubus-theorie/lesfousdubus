import * as THREE from "three";

/** Géométrie 3D du chapeau de paille posé sur le toit du bus. */
export function createStrawHatGeometry() {
    // Proportions fidèles à Luffy et à l'illustration de référence :
    // - Largeur du bus : 2.60 m
    // - Diamètre du bord : 3.60 m (rayon 1.80 m, débord de 50 cm de chaque côté)
    // - Diamètre calotte : 2.20 m (rayon 1.10 m à la base)
    // - Hauteur de calotte : 1.04 m (apex à y = 1.08 m, base à y = 0.04 m)
    // - Bandeau rouge : hauteur 0.255 m (y = 0.050 à 0.305 m)
    // - Relevé du rebord : +0.075 m (y = 0.115 m au rebord)
    // - Épaisseur coque : 14 mm (solide 3D étanche sans artefacts)
    const R_brim = 1.80;
    const R_dome = 1.10;
    const H_dome = 1.08;
    const y_base = 0.04;
    const T = 0.014;
    const n_super = 2.4;
    const p_super = 2.0 / n_super;

    const pts: THREE.Vector2[] = [];
    const N_crown = 36;
    const N_brim = 30;
    const R_dome_in = R_dome - T;
    const H_dome_in = H_dome - T;
    const y_base_in = y_base - T;

    // 1. Surface intérieure : calotte descendant de l'apex intérieur vers la base intérieure
    for (let i = 0; i <= N_crown; i++) {
      const th = (i / N_crown) * (Math.PI / 2);
      const r = Math.max(0.001, R_dome_in * Math.pow(Math.sin(th), p_super));
      const y = y_base_in + (H_dome_in - y_base_in) * Math.pow(Math.cos(th), p_super);
      pts.push(new THREE.Vector2(r, y));
    }

    // 2. Bord inférieur intérieur : de la base intérieure vers le rebord
    for (let i = 1; i <= N_brim; i++) {
      const u = i / N_brim;
      const r = R_dome_in + u * (R_brim - R_dome_in);
      const y = y_base_in + 0.075 * Math.pow(u, 2.2);
      pts.push(new THREE.Vector2(r, y));
    }

    // 3. Rebord arrondi extérieur (ourlet)
    const y_rim_outer = y_base + 0.075;
    const y_rim_inner = y_base_in + 0.075;
    pts.push(new THREE.Vector2(R_brim + T * 0.4, (y_rim_outer + y_rim_inner) / 2));
    pts.push(new THREE.Vector2(R_brim, y_rim_outer));

    // 4. Bord supérieur extérieur : du rebord vers la base extérieure
    for (let i = N_brim - 1; i >= 0; i--) {
      const u = i / N_brim;
      const r = R_dome + u * (R_brim - R_dome);
      const y = y_base + 0.075 * Math.pow(u, 2.2);
      pts.push(new THREE.Vector2(r, y));
    }

    // 5. Calotte extérieure : de la base extérieure montant vers l'apex extérieur
    for (let i = 1; i <= N_crown; i++) {
      const th = (Math.PI / 2) * (1 - i / N_crown);
      const r = Math.max(0.001, R_dome * Math.pow(Math.sin(th), p_super));
      const y = y_base + (H_dome - y_base) * Math.pow(Math.cos(th), p_super);
      pts.push(new THREE.Vector2(r, y));
    }

    const segments = 64;
    const hatGeo = new THREE.LatheGeometry(pts, segments);

    // Calcul de la longueur d'arc cumulée du profil pour un UV mapping régulier
    const arc: number[] = [0];
    for (let j = 1; j < pts.length; j++) {
      const dr = pts[j].x - pts[j - 1].x;
      const dy = pts[j].y - pts[j - 1].y;
      arc.push(arc[j - 1] + Math.hypot(dr, dy));
    }

    // Mapping UV isotrope : tressage de paille uniforme sans étirement
    const uvAttr = hatGeo.attributes.uv;
    const U_REPEATS = 10;
    const V_SCALE = 0.85; // Échelle physique uniforme

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j < pts.length; j++) {
        const idx = i * pts.length + j;
        const u = (i / segments) * U_REPEATS;
        const v = arc[j] / V_SCALE;
        uvAttr.setXY(idx, u, v);
      }
    }
    uvAttr.needsUpdate = true;

    // Normales parfaites aux apex pour supprimer tout pincement
    const pos = hatGeo.attributes.position;
    const norm = hatGeo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (r < 0.02) {
        const y = pos.getY(i);
        norm.setXYZ(i, 0, y > 0.5 ? 1 : -1, 0);
      }
    }
    norm.needsUpdate = true;

    // Ruban rouge ajusté exactement à la calotte (y = 0.050 à 0.305)
    const yMin = 0.050;
    const yMax = 0.305;
    const N_ribbon = 16;
    const ribbonPts: THREE.Vector2[] = [];

    function getCrownRadius(y: number) {
      const cos_p = (y - y_base) / (H_dome - y_base);
      const cos_th = Math.pow(Math.max(0, Math.min(1, cos_p)), 1 / p_super);
      const sin_th = Math.sqrt(Math.max(0, 1 - cos_th * cos_th));
      return R_dome * Math.pow(sin_th, p_super);
    }

    // Face extérieure (du bas vers le haut pour normales dirigées vers l'extérieur)
    for (let i = 0; i <= N_ribbon; i++) {
      const u = i / N_ribbon;
      const y = yMin + u * (yMax - yMin);
      const r = getCrownRadius(y) + 0.007;
      ribbonPts.push(new THREE.Vector2(r, y));
    }
    // Face intérieure (du haut vers le bas)
    for (let i = 0; i <= N_ribbon; i++) {
      const u = i / N_ribbon;
      const y = yMax - u * (yMax - yMin);
      const r = getCrownRadius(y) + 0.002;
      ribbonPts.push(new THREE.Vector2(r, y));
    }

    const ribbonGeo = new THREE.LatheGeometry(ribbonPts, 64);

    return { hatGeo, ribbonGeo };
}
