import { MODELE, SCRIPTS } from './commun';

/**
 * Page web invisible qui fait tourner le modèle dans la vue web de l'appli (iPhone, Android) :
 * elle profite de la puce graphique du téléphone (WebGL), bien plus rapide que le JavaScript seul.
 * Messages reçus : { id, image } (JPEG en base64). Réponses : { pret } puis { id, objets } ou { id, erreur }.
 */
export const PAGE_DETECTEUR = `<!doctype html><html><head><meta charset="utf-8">
${SCRIPTS.map((s) => `<script src="${s}"></script>`).join('\n')}
</head><body><script>
(function () {
  var envoyer = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var modele = null;
  cocoSsd.load(${JSON.stringify(MODELE)}).then(function (m) { modele = m; envoyer({ pret: true }); })
    .catch(function (e) { envoyer({ echecChargement: String(e && e.message || e) }); });
  window.analyser = function (id, base64) {
    if (!modele) { envoyer({ id: id, erreur: 'modele' }); return; }
    var img = new Image();
    img.onload = function () {
      modele.detect(img, 10, 0.2).then(function (p) {
        envoyer({ id: id, objets: p.map(function (x) { return { classe: x.class, score: x.score }; }) });
      }).catch(function () { envoyer({ id: id, erreur: 'analyse' }); });
    };
    img.onerror = function () { envoyer({ id: id, erreur: 'image' }); };
    img.src = 'data:image/jpeg;base64,' + base64;
  };
})();
</script></body></html>`;
