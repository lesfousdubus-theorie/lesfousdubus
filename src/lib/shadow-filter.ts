import * as THREE from "three";

const PATCH_MARKER = "/* FDB_TENT_PCF_5X5 */";

const ORIGINAL_PCF_GET_SHADOW_RE =
  /#if defined\(\s*SHADOWMAP_TYPE_PCF\s*\)\s*float getShadow\([\s\S]*?#elif defined\(\s*SHADOWMAP_TYPE_VSM\s*\)/;

const SMOOTH_TENT_PCF_GET_SHADOW = `#if defined( SHADOWMAP_TYPE_PCF )
${PATCH_MARKER}
\t\tfloat getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
\t\t\tfloat shadow = 1.0;
\t\t\tshadowCoord.xyz /= shadowCoord.w;
\t\t\tshadowCoord.z += shadowBias;
\t\t\tbool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
\t\t\tbool frustumTest = inFrustum && shadowCoord.z >= 0.0 && shadowCoord.z <= 1.0;
\t\t\tif ( frustumTest ) {
\t\t\t\t// Filtre B-spline cubique 4x4 (poids [1, 3, 3, 1], pas exact de 1,0 texel sur 16 taps bilinéaires matériels) :
\t\t\t\t// zéro dents de peigne, zéro bruit d'écran, bords C2 ultra-lisses même en zoom rapproché sur les courbes.
\t\t\t\tvec2 t = vec2( 1.0 ) / shadowMapSize;
\t\t\t\tfloat sum = 0.0;
\t\t\t\tsum += 1.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -1.5, -1.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -0.5, -1.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  0.5, -1.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 1.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  1.5, -1.5 ) * t, shadowCoord.z ) );

\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -1.5, -0.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 9.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -0.5, -0.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 9.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  0.5, -0.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  1.5, -0.5 ) * t, shadowCoord.z ) );

\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -1.5,  0.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 9.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -0.5,  0.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 9.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  0.5,  0.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  1.5,  0.5 ) * t, shadowCoord.z ) );

\t\t\t\tsum += 1.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -1.5,  1.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2( -0.5,  1.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 3.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  0.5,  1.5 ) * t, shadowCoord.z ) );
\t\t\t\tsum += 1.0 * texture( shadowMap, vec3( shadowCoord.xy + vec2(  1.5,  1.5 ) * t, shadowCoord.z ) );

\t\t\t\tshadow = sum * 0.015625;
\t\t\t\tvec2 edge = min( shadowCoord.xy, 1.0 - shadowCoord.xy );
\t\t\t\tfloat edgeFade = smoothstep( 0.0, 0.06, min( edge.x, edge.y ) );
\t\t\t\tshadow = mix( 1.0, shadow, edgeFade );
\t\t\t}
\t\t\treturn mix( 1.0, shadow, shadowIntensity );
\t\t}
\t#elif defined( SHADOWMAP_TYPE_VSM )`;

/**
 * Remplace le noyau Vogel 5-taps bruité de Three.js 0.182 par un filtre tente 5×5
 * matériel déterministe (9 taps sampler2DShadow) avant la compilation des shaders.
 */
export function installSmoothPcfShadowFilter(): boolean {
  const current = THREE.ShaderChunk.shadowmap_pars_fragment;
  if (!current) return false;
  if (current.includes(PATCH_MARKER)) return true;
  if (!ORIGINAL_PCF_GET_SHADOW_RE.test(current)) return false;
  THREE.ShaderChunk.shadowmap_pars_fragment = current.replace(
    ORIGINAL_PCF_GET_SHADOW_RE,
    SMOOTH_TENT_PCF_GET_SHADOW,
  );
  return THREE.ShaderChunk.shadowmap_pars_fragment.includes(PATCH_MARKER);
}

/**
 * Verrouille la position Z de la caméra d'ombres sur la grille exacte des texels en espace lumière
 * par rapport au défilement continu des paysages (`scroll`).
 *
 * Comme `shadowCamera.up = (0, 0, -1)`, l'axe droite lumière `right = normalize(up × viewZ)` a `right.z === 0`.
 * Tout déplacement monde `+Δz` se projette donc uniquement sur l'axe `V` de la shadow map
 * avec le facteur `projZ = hypot(vx, vy)` (`Δu = 0`, `Δv = -Δz * projZ / (2 * halfDepth) * mapSize`).
 */
export function computeScrollLockedShadowCenterZ(
  targetCenterZ: number,
  scroll: number,
  halfDepth: number,
  shadowMapSize: number,
  lightDirX: number,
  lightDirY: number,
  lightDirZ: number,
): { snappedCenterZ: number; worldTexelZ: number } {
  const invLen = 1 / (Math.hypot(lightDirX, lightDirY, lightDirZ) || 1);
  const vx = lightDirX * invLen;
  const vy = lightDirY * invLen;
  const projZ = Math.max(0.25, Math.hypot(vx, vy));
  const worldTexelZ = (halfDepth * 2) / (Math.max(1, shadowMapSize) * projZ);
  const snappedCenterZ = scroll + Math.round((targetCenterZ - scroll) / worldTexelZ) * worldTexelZ;
  return { snappedCenterZ, worldTexelZ };
}
