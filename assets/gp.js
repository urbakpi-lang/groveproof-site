/* GroveProof — script comune: lingua, chiamate al motore, sessione, menu, mappa, lettura file. */
(function () {
  var GP = window.GP = {};
  GP.API = "https://geo-engine-6rcq.onrender.com";

  // ---------- lingua ----------
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  GP.store = store;
  var q = new URLSearchParams(location.search);
  GP.lang = q.get("lang") || store("gp_lang") || ((navigator.language || "en").slice(0, 2));
  GP.LANGS = ["en", "de", "fr", "it", "es", "pl"];
  if (GP.LANGS.indexOf(GP.lang) < 0) GP.lang = "en";
  GP.strings = {};
  GP.t = function (k) { var d = GP.strings[GP.lang] || {}; var e = GP.strings.en || {}; return d[k] != null ? d[k] : (e[k] != null ? e[k] : k); };
  GP.applyI18n = function () {
    document.documentElement.lang = GP.lang;
    document.querySelectorAll("[data-t]").forEach(function (el) { el.textContent = GP.t(el.getAttribute("data-t")); });
    document.querySelectorAll("[data-th]").forEach(function (el) { el.innerHTML = GP.t(el.getAttribute("data-th")); });
    document.querySelectorAll("[data-tp]").forEach(function (el) { el.setAttribute("placeholder", GP.t(el.getAttribute("data-tp"))); });
    document.querySelectorAll(".langsel").forEach(function (x) { x.value = GP.lang; });
  };
  GP.setLang = function (l) { GP.lang = l; store("gp_lang", l); GP.applyI18n(); if (GP.onLang) GP.onLang(l); };

  GP.esc = function (v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  // ---------- sessione e chiamate ----------
  GP.session = function (v) { return store("gp_session", v); };
  GP.api = async function (path, opts) {
    opts = opts || {};
    var h = Object.assign({}, opts.headers || {});
    if (opts.body && typeof opts.body !== "string") { opts.body = JSON.stringify(opts.body); h["Content-Type"] = "application/json"; }
    var s = GP.session(); if (s) h.Authorization = "Bearer " + s;
    var r, tries = opts.retry === false ? 1 : 4, last;
    for (var i = 0; i < tries; i++) {
      try { r = await fetch(GP.API + path, Object.assign({}, opts, { headers: h })); if (r.status !== 502 && r.status !== 503) break; }
      catch (e) { last = e; r = null; }
      if (GP.onWaking) GP.onWaking(i + 1);
      await new Promise(function (res) { setTimeout(res, 12000); });
    }
    if (!r) throw last || new Error("network");
    if (r.status === 401 && s) { GP.session(null); if (GP.onLogout) GP.onLogout(); }
    if (opts.raw) return r;
    var data = null; try { data = await r.json(); } catch (e) { }
    if (!r.ok) { var err = new Error((data && data.detail) || ("HTTP " + r.status)); err.status = r.status; throw err; }
    return data;
  };
  GP.download = async function (path, filename) {
    var r = await GP.api(path, { raw: true });
    if (!r.ok) throw new Error("HTTP " + r.status);
    var b = await r.blob(), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  // sveglia il motore (Render free dorme dopo 15 minuti)
  try { fetch(GP.API + "/health").catch(function () { }); } catch (e) { }
  // Statistiche anonime: nessun cookie, nessun dato personale. Rispetta "Do Not Track"
  // e chi ha disattivato il conteggio dal cruscotto (localStorage gp_notrack).
  GP.trackView = function () {
    try {
      if (document.documentElement.hasAttribute("data-notrack")) return;
      if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
      if (localStorage.getItem("gp_notrack") === "1") return;
      var q = new URLSearchParams(location.search);
      var body = JSON.stringify({ k: "view", p: location.pathname, l: GP.lang, bl: navigator.language || "",
        tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ""), r: document.referrer || "",
        u: [q.get("utm_source") || q.get("ref") || "", q.get("utm_campaign") || ""].filter(Boolean).join("-") });
      var url = GP.API + "/e";
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
      else fetch(url, { method: "POST", body: body, keepalive: true }).catch(function () { });
    } catch (e) { }
  };
  window.addEventListener("load", function () { GP.trackView(); });


  // ---------- menu e piè di pagina ----------
  var LEAF = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16Z" fill="#2E7D52"/><path d="M4 20 14 10" stroke="#FBF8F2" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var NAV = {
    en: { check: "Free check", pricing: "Pricing", importers: "For importers", app: "My account", impressum: "Legal notice", privacy: "Privacy", terms: "Terms", method: "Methodology" },
    de: { check: "Gratis-Check", pricing: "Preise", importers: "Für Importeure", app: "Mein Konto", impressum: "Impressum", privacy: "Datenschutz", terms: "AGB", method: "Methodik" },
    it: { check: "Controllo gratuito", pricing: "Prezzi", importers: "Per importatori", app: "Il mio account", impressum: "Note legali", privacy: "Privacy", terms: "Termini", method: "Metodologia" },
    fr: { check: "Vérification gratuite", pricing: "Tarifs", importers: "Pour les importateurs", app: "Mon compte", impressum: "Mentions légales", privacy: "Confidentialité", terms: "Conditions", method: "Méthodologie" },
    es: { check: "Verificación gratuita", pricing: "Precios", importers: "Para importadores", app: "Mi cuenta", impressum: "Aviso legal", privacy: "Privacidad", terms: "Condiciones", method: "Metodología" },
    pl: { check: "Bezpłatna weryfikacja", pricing: "Cennik", importers: "Dla importerów", app: "Moje konto", impressum: "Nota prawna", privacy: "Prywatność", terms: "Regulamin", method: "Metodologia" }
  };
  // il nome non va mai da solo: sempre con la frase che spiega cosa fa
  var TAG = { en: "EUDR deforestation check for coffee", de: "Entwaldungsfrei-Nachweis für Kaffee", it: "Verifica EUDR per il caffè",
    fr: "Vérification EUDR du café", es: "Verificación EUDR del café", pl: "Weryfikacja EUDR kawy" };
  var LANGNAME = { en: "EN · English", de: "DE · Deutsch", fr: "FR · Français", it: "IT · Italiano", es: "ES · Español", pl: "PL · Polski" };
  GP.tagline = function () { return TAG[GP.lang] || TAG.en; };
  GP.nav = function () {
    var n = NAV[GP.lang] || NAV.en, el = document.getElementById("gpnav"), ft = document.getElementById("gpfoot");
    if (el) el.innerHTML = '<div class="in"><a class="logo" href="index.html">' + LEAF + '<span class="nm">GroveProof<small class="tg">' + GP.tagline() + '</small></span></a>' +
      '<a class="l" href="index.html#tool">' + n.check + '</a><a class="l" href="pricing.html">' + n.pricing + '</a>' +
      '<a class="l" href="importers.html">' + n.importers + '</a><a class="btn sm" href="app.html">' + n.app + '</a>' +
      '<select class="langsel" aria-label="Language">' + GP.LANGS.map(function (l) { return '<option value="' + l + '">' + LANGNAME[l] + '</option>'; }).join("") + '</select></div>';
    if (ft) ft.innerHTML = '<div class="wrap">© GroveProof · <a href="impressum.html">' + n.impressum + '</a><a href="privacy.html">' + n.privacy +
      '</a><a href="terms.html">' + n.terms + '</a><a href="index.html#method">' + n.method + '</a>' +
      (GP.lang === "de" ? '<a href="eudr-kaffee-roesterei.html">EUDR-Leitfaden</a>' : '<a href="eudr-coffee-roasters.html">' + ({ it: "Guida EUDR", fr: "Guide EUDR", es: "Guía EUDR", pl: "Przewodnik EUDR" }[GP.lang] || "EUDR guide") + '</a>') + '<div style="margin-top:.4rem">GroveProof — ' + GP.tagline() + ' · <a href="mailto:info@groveproof.com">info@groveproof.com</a></div></div>';
    document.querySelectorAll(".langsel").forEach(function (x) { x.value = GP.lang; x.onchange = function () { GP.setLang(x.value); GP.nav(); }; });
  };

  // ---------- esiti ----------
  var V = {
    en: { OK: "Deforestation-free", OK_NO_FOREST_2020: "No forest in 2020", A_RISCHIO: "At risk — review", DATI_MANCANTI: "Data needed", none: "Not checked", alta: "high confidence", media: "medium confidence", bassa: "low confidence" },
    de: { OK: "Entwaldungsfrei", OK_NO_FOREST_2020: "Kein Wald 2020", A_RISCHIO: "Risiko — prüfen", DATI_MANCANTI: "Daten fehlen", none: "Nicht geprüft", alta: "hohe Sicherheit", media: "mittlere Sicherheit", bassa: "geringe Sicherheit" },
    it: { OK: "Senza deforestazione", OK_NO_FOREST_2020: "Nessuna foresta nel 2020", A_RISCHIO: "A rischio — da rivedere", DATI_MANCANTI: "Dati mancanti", none: "Non verificato", alta: "confidenza alta", media: "confidenza media", bassa: "confidenza bassa" },
    fr: { OK: "Sans déforestation", OK_NO_FOREST_2020: "Pas de forêt en 2020", A_RISCHIO: "À risque — à examiner", DATI_MANCANTI: "Données manquantes", none: "Non vérifiée", alta: "confiance élevée", media: "confiance moyenne", bassa: "confiance faible" },
    es: { OK: "Libre de deforestación", OK_NO_FOREST_2020: "Sin bosque en 2020", A_RISCHIO: "En riesgo — revisar", DATI_MANCANTI: "Faltan datos", none: "No verificada", alta: "confianza alta", media: "confianza media", bassa: "confianza baja" },
    pl: { OK: "Bez wylesiania", OK_NO_FOREST_2020: "Brak lasu w 2020 r.", A_RISCHIO: "Ryzyko — do weryfikacji", DATI_MANCANTI: "Brak danych", none: "Niezweryfikowana", alta: "wysoka pewność", media: "średnia pewność", bassa: "niska pewność" }
  };
  GP.vtext = function (v) { var d = V[GP.lang] || V.en; return d[v || "none"] || v; };
  GP.vclass = function (v) { return v === "OK" || v === "OK_NO_FOREST_2020" ? "ok" : v === "A_RISCHIO" ? "risk" : "miss"; };
  GP.vchip = function (v, c) { return '<span class="chip ' + GP.vclass(v) + '">' + GP.esc(GP.vtext(v)) + '</span>' + (c ? ' <span class="chip">' + GP.esc(GP.vtext(c)) + '</span>' : ''); };
  GP.color = function (v) { var c = GP.vclass(v); return c === "ok" ? "#2F8D5E" : c === "risk" ? "#C0432F" : "#C8891A"; };

  // ---------- mappa ----------
  GP.map = function (id) {
    var m = window.L.map(id, { scrollWheelZoom: false }).setView([5, 10], 2);
    if (window.GPMap) window.GPMap.decorate(m, GP.lang);
    else window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
    var layer = window.L.layerGroup().addTo(m);
    return {
      map: m, draw: function (items) {
        layer.clearLayers(); var pts = [];
        items.forEach(function (it) {
          var col = GP.color(it.verdict);
          if (it.geometry) { try { window.L.geoJSON(it.geometry, { style: { color: col, weight: 2, fillOpacity: .25 } }).addTo(layer); } catch (e) { } }
          if (it.lat != null && it.lng != null && !isNaN(it.lat) && !isNaN(it.lng)) {
            var mk = window.L.circleMarker([it.lat, it.lng], { radius: 7, color: "#fff", weight: 2, fillColor: col, fillOpacity: 1 }).addTo(layer);
            mk.bindTooltip(String(it.label || ""), { permanent: !!it.label, direction: "right", offset: [10, 0], className: "plot-label" });
            pts.push([it.lat, it.lng]);
          }
        });
        if (pts.length) { try { m.fitBounds(pts, { padding: [34, 34], maxZoom: pts.length === 1 ? 11 : 7 }); } catch (e) { } }
        setTimeout(function () { m.invalidateSize(); }, 50);
      }
    };
  };

  // ---------- lettura file (GeoJSON, KML, CSV) ----------
  function centroid(g) {
    var pts = [];
    (function walk(c) { if (typeof c[0] === "number") pts.push(c); else if (typeof c[0][0] === "number") { var r = c.slice(); if (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop(); r.forEach(function (p) { pts.push(p); }); } else c.forEach(walk); })(g.coordinates || []);
    if (!pts.length) return [NaN, NaN];
    var x = 0, y = 0; pts.forEach(function (p) { x += p[0]; y += p[1]; }); return [y / pts.length, x / pts.length];
  }
  function areaHa(g) {
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return null;
    var polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates, tot = 0;
    polys.forEach(function (poly) { poly.forEach(function (ring, ri) { var lat0 = ring[0][1] * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110540, a = 0; for (var i = 0; i < ring.length - 1; i++) { a += (ring[i][0] * kx) * (ring[i + 1][1] * ky) - (ring[i + 1][0] * kx) * (ring[i][1] * ky); } tot += (ri === 0 ? 1 : -1) * Math.abs(a) / 2; }); });
    return Math.round(tot / 1000) / 10;
  }
  function pick(o, keys) { for (var i = 0; i < keys.length; i++) { if (o[keys[i]] != null && o[keys[i]] !== "") return o[keys[i]]; } return ""; }
  function featureToPlot(f, n) {
    var pr = f.properties || {}, g = f.geometry; if (!g) return null;
    var ref = String(pick(pr, ["plot_id", "id", "ID", "name", "Name", "plot", "ref"]) || ("PLOT-" + (n + 1)));
    var c = String(pick(pr, ["country", "origine", "origin", "Country", "ProducerCountry"]) || "");
    var a = parseFloat(pick(pr, ["area_ha", "area", "Area", "ha"]));
    var producer = String(pick(pr, ["producer", "ProducerName", "farmer", "farm"]) || "");
    if (g.type === "Point") return { ref: ref, country: c, lat: g.coordinates[1], lng: g.coordinates[0], area_ha: isNaN(a) ? null : a, producer: producer };
    var ce = centroid(g); return { ref: ref, country: c, lat: +ce[0].toFixed(6), lng: +ce[1].toFixed(6), area_ha: isNaN(a) ? areaHa(g) : a, geometry: g, producer: producer };
  }
  GP.parseFile = function (name, txt) {
    name = name.toLowerCase();
    if (name.endsWith(".kml")) {
      var doc = new DOMParser().parseFromString(txt, "text/xml"), out = [];
      Array.prototype.forEach.call(doc.getElementsByTagName("Placemark"), function (pm, n) {
        var nm = ((pm.getElementsByTagName("name")[0] || {}).textContent || ("PLOT-" + (n + 1))).trim();
        var polys = Array.prototype.map.call(pm.getElementsByTagName("Polygon"), function (pg) {
          return Array.prototype.map.call(pg.getElementsByTagName("coordinates"), function (cn) { return cn.textContent.trim().split(/\s+/).map(function (t) { var v = t.split(","); return [parseFloat(v[0]), parseFloat(v[1])]; }); });
        });
        if (polys.length) { out.push(featureToPlot({ properties: { name: nm }, geometry: polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys } }, n)); return; }
        var pt = pm.getElementsByTagName("Point")[0];
        if (pt) { var v = pt.textContent.trim().split(","); out.push({ ref: nm, country: "", lat: parseFloat(v[1]), lng: parseFloat(v[0]) }); }
      });
      return out.filter(Boolean);
    }
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      var lines = txt.replace(/\r/g, "").split("\n").filter(function (l) { return l.trim(); }); if (lines.length < 2) return [];
      var sep = lines[0].indexOf(";") >= 0 && lines[0].indexOf(",") < 0 ? ";" : ",";
      var h = lines[0].split(sep).map(function (x) { return x.trim().toLowerCase(); });
      var ix = function (names) { for (var i = 0; i < names.length; i++) { var k = h.indexOf(names[i]); if (k >= 0) return k; } return -1; };
      var iId = ix(["plot_id", "id", "name", "ref"]), iC = ix(["country", "origine", "origin", "paese", "land"]), iLat = ix(["lat", "latitude", "latitudine"]), iLng = ix(["lng", "lon", "long", "longitude", "longitudine"]), iA = ix(["area_ha", "area", "ha"]), iP = ix(["producer", "produttore", "farm"]);
      return lines.slice(1).map(function (l, n) {
        var v = l.split(sep); var g = function (i) { return i >= 0 ? (v[i] || "").trim() : ""; };
        var a = parseFloat(g(iA).replace(",", ".")), la = parseFloat(g(iLat).replace(",", ".")), lo = parseFloat(g(iLng).replace(",", "."));
        return { ref: g(iId) || ("PLOT-" + (n + 1)), country: g(iC), lat: isNaN(la) ? null : la, lng: isNaN(lo) ? null : lo, area_ha: isNaN(a) ? null : a, producer: g(iP) };
      });
    }
    var j = JSON.parse(txt);
    var feats = j.type === "FeatureCollection" ? j.features : (j.type === "Feature" ? [j] : [{ properties: {}, geometry: j }]);
    return feats.map(featureToPlot).filter(Boolean);
  };
})();
