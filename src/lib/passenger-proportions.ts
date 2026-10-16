/** Toutes les silhouettes partagent les mêmes articulations, avec des volumes adaptés. */
export function getPassengerProportions(id: string) {
  const broad = ["zoro", "franky", "jinbe", "doflamingo", "mihawk"].includes(id);
  const slender = ["nami", "robin", "brook", "sanji", "boa_hancock", "vivi"].includes(id);
  return {
    torsoWidth: id === "doflamingo" ? .35 : id === "mihawk" ? .34 : id === "chopper" ? .22 : broad ? (id === "zoro" ? .36 : .395) : slender ? (id === "brook" ? .27 : .29) : .33,
    torsoHeight: id === "chopper" ? .24 : TORSO_HEIGHT,
    torsoDepth: ["doflamingo", "mihawk"].includes(id) ? .24 : id === "jinbe" ? .30 : id === "chopper" ? .20 : broad ? .26 : .22,
    torsoRadius: id === "jinbe" ? .10 : id === "chopper" ? .055 : .045,
    armWidth: ["doflamingo", "mihawk"].includes(id) ? .10 : id === "brook" ? .065 : id === "chopper" ? .085 : broad ? .125 : slender ? .085 : .10,
    neckRadius: ["doflamingo", "mihawk"].includes(id) ? .058 : id === "brook" ? .032 : id === "chopper" ? .062 : broad ? .067 : slender ? .049 : .055,
    headWidth: id === "jinbe" ? .29 : id === "franky" ? .275 : id === "chopper" ? .275 : .24,
    headHeight: id === "chopper" ? .25 : id === "jinbe" ? .285 : .27,
    headDepth: id === "jinbe" ? .275 : id === "chopper" ? .25 : .23,
    headRadius: id === "jinbe" ? .085 : id === "chopper" ? .088 : id === "brook" ? .059 : id === "nami" ? .045 : .038,
  };
}

export const NECK_HEIGHT = 0.12;
export const HEAD_ABOVE_NECK = 0.17;
export const TORSO_HEIGHT = 0.43;

/** Chopper's hybrid form is a small body with a large head, rather than a scaled adult. */
function makePassengerSkeleton(id: string) {
  const small = id === "chopper";
  return {
    neckHeight: small ? .08 : NECK_HEIGHT,
    headAboveNeck: small ? .12 : HEAD_ABOVE_NECK,
    torsoAboveHip: small ? .13 : .235,
    neckAboveHip: small ? .265 : .46,
    shoulderY: small ? .084 : .145,
    upperArmLength: small ? .12 : .20,
    forearmLength: small ? .132 : .22,
    armScale: small ? .6 : 1,
    armWidthScale: small ? .8 : 1,
    pelvisWidth: small ? .22 : id === "brook" ? .28 : .34,
    pelvisHeight: small ? .09 : .14,
    pelvisDepth: small ? .19 : .25,
    hipSpacing: small ? .07 : .09,
    thighLength: small ? .14 : .28,
    shinLength: small ? .18 : .48,
    standingHipHeight: small ? .36 : .8,
    seatedHipHeight: small ? .525 : .55,
    seatedHipZ: small ? .025 : .12,
    footScale: small ? .5 : 1,
    stride: small ? .075 : .14,
    ankleHeight: small ? .04 : .08,
    stepHeight: small ? .055 : .11,
    strideDistance: small ? .38 : .65,
  };
}

const adultSkeleton = makePassengerSkeleton("");
const chopperSkeleton = makePassengerSkeleton("chopper");
const brookSkeleton = makePassengerSkeleton("brook");
export function getPassengerSkeleton(id: string) {
  return id === "chopper" ? chopperSkeleton : id === "brook" ? brookSkeleton : adultSkeleton;
}
