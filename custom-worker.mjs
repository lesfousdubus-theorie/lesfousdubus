import openNextWorker from "./.open-next/worker.js";
import { createEdgeCachedFetch } from "./src/lib/server/worker-edge-cache.mjs";

// Préserve les exports de cache de l’adaptateur généré.
export * from "./.open-next/worker.js";

const edgeFetch = createEdgeCachedFetch((request, env, ctx) => openNextWorker.fetch(request, env, ctx));

const worker = {
  ...openNextWorker,
  fetch(request, env, ctx) {
    return edgeFetch(request, env, ctx);
  },
};

export default worker;
