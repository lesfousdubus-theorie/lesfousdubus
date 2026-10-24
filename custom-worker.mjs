import openNextWorker from "./.open-next/worker.js";

// Préserve les exports de cache de l’adaptateur généré.
export * from "./.open-next/worker.js";

const worker = {
  ...openNextWorker,
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.protocol === "http:" && url.hostname === "lesfousdubus.sbs") {
      url.protocol = "https:";
      // 308 conserve aussi la méthode des requêtes API et leur corps.
      return Response.redirect(url.href, 308);
    }
    return openNextWorker.fetch(request, env, ctx);
  },
};

export default worker;
