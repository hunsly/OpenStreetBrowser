function contour_init() {
  register_layer("contour",
    new OpenLayers.Layer.OSM(
      "Contourshading",
      "http://hills-nc.openstreetmap.de/", {
        type: 'png',
        numZoomLevels: 16,
        displayOutsideMaxExtent: true,
        isBaseLayer: false,
        transparent: true,
        visibility: false
      })
  );
}

register_hook("init", contour_init);