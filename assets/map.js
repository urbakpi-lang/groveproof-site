/* GroveProof — mappa: vista satellitare / stradale, legenda nella lingua, schermo intero.
   Satellite: Sentinel-2 cloudless 2016 di EOX (licenza CC BY 4.0, uso commerciale consentito con attribuzione). */
(function () {
  var T = {
    en: { map: "Map", sat: "Satellite (2016)", ok: "Deforestation-free", risk: "At risk", miss: "Data needed", full: "Full screen", exit: "Exit full screen" },
    de: { map: "Karte", sat: "Satellit (2016)", ok: "Entwaldungsfrei", risk: "Risiko", miss: "Daten fehlen", full: "Vollbild", exit: "Vollbild beenden" },
    fr: { map: "Carte", sat: "Satellite (2016)", ok: "Sans déforestation", risk: "À risque", miss: "Données manquantes", full: "Plein écran", exit: "Quitter le plein écran" },
    it: { map: "Mappa", sat: "Satellite (2016)", ok: "Senza deforestazione", risk: "A rischio", miss: "Dati mancanti", full: "Schermo intero", exit: "Esci dallo schermo intero" },
    es: { map: "Mapa", sat: "Satélite (2016)", ok: "Libre de deforestación", risk: "En riesgo", miss: "Faltan datos", full: "Pantalla completa", exit: "Salir de pantalla completa" },
    pl: { map: "Mapa", sat: "Satelita (2016)", ok: "Bez wylesiania", risk: "Ryzyko", miss: "Brak danych", full: "Pełny ekran", exit: "Zamknij pełny ekran" }
  };
  var COL = { ok: "#2F8D5E", risk: "#C0432F", miss: "#C8891A" };
  var css = ".gp-legend{background:rgba(255,255,255,.94);color:#1E1912;border-radius:8px;padding:6px 9px;font:500 12px 'Libre Franklin',system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.25);line-height:1.6}" +
    ".gp-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px;border:1.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)}" +
    ".gp-fs{width:34px;height:34px;line-height:34px;text-align:center;font-size:17px;cursor:pointer;background:#fff;color:#1E1912;display:block;text-decoration:none}" +
    ".gp-full{position:fixed!important;inset:0!important;z-index:9999!important;height:100vh!important;width:100vw!important;border-radius:0!important;margin:0!important}" +
    ".leaflet-control-layers{font:500 12px 'Libre Franklin',system-ui,sans-serif}.leaflet-control-attribution{font-size:9.5px;line-height:1.3}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function t(lang) { return T[lang] || T.en; }

  window.GPMap = {
    decorate: function (m, lang) {
      var L = window.L, s = t(lang);
      var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
      var sat = L.tileLayer("https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg", {
        maxZoom: 18, maxNativeZoom: 15,
        attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless - https://s2maps.eu</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016 &amp; 2017)' });
      sat.addTo(m);
      var base = {}; base[s.sat] = sat; base[s.map] = osm;
      L.control.layers(base, null, { position: "topright", collapsed: false }).addTo(m);

      var Legend = L.Control.extend({ options: { position: "bottomleft" }, onAdd: function () {
        var d = L.DomUtil.create("div", "gp-legend");
        d.innerHTML = '<div><i style="background:' + COL.ok + '"></i>' + s.ok + '</div><div><i style="background:' + COL.risk + '"></i>' + s.risk +
          '</div><div><i style="background:' + COL.miss + '"></i>' + s.miss + '</div>';
        return d; } });
      new Legend().addTo(m);

      var box = m.getContainer();
      var Full = L.Control.extend({ options: { position: "topleft" }, onAdd: function () {
        var wrap = L.DomUtil.create("div", "leaflet-bar");
        var a = L.DomUtil.create("a", "gp-fs", wrap); a.href = "#"; a.title = s.full; a.setAttribute("role", "button"); a.innerHTML = "⛶";
        L.DomEvent.on(a, "click", function (e) { L.DomEvent.preventDefault(e); toggle(); });
        function toggle(force) {
          var on = force === undefined ? !box.classList.contains("gp-full") : force;
          box.classList.toggle("gp-full", on); a.title = on ? s.exit : s.full; a.innerHTML = on ? "✕" : "⛶";
          if (on) m.scrollWheelZoom.enable(); else m.scrollWheelZoom.disable();
          setTimeout(function () { m.invalidateSize(); }, 60);
        }
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("gp-full")) toggle(false); });
        return wrap; } });
      new Full().addTo(m);
      return m;
    }
  };
})();
