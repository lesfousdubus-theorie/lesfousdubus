// Les faces de 960 m produisent des éclats diagonaux lorsqu'elles traversent
// le plan proche de la caméra intérieure. Des faces de 10 m gardent la même
// bande continue et le même nombre de draw calls.
export const BRIDGE_MARKING_BOX: [number, number, number, number, number, number] = [
  0.16, 0.02, 960, 1, 1, 96,
];
