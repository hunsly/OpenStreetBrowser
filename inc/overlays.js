var drag_feature;
var drag_layer;
var overlays_list={};
var category_tiles_url;

function overlay(id, _tags) {
  // show
  this.show=function() {
    this.layer.setVisibility(true);

    if(vector_layer) {
      var tindex=map.getLayerIndex(this.layer);
      var index=map.getLayerIndex(vector_layer);

      if(tindex>index)
	map.setLayerIndex(this.layer, index);
      else
	map.setLayerIndex(this.layer, index-1);
    }
  }

  // hide
  this.hide=function() {
    this.layer.setVisibility(false);
  }

  // set_version
  this.set_version=function(version) {
    this.version=version;

    if(this.layer.visibility) {
      this.hide();
      this.show();
    }
  }

  // set_name
  this.set_name=function(name) {
    this.layer.setName(name);
  }

  // build_url
  this.build_url=function(bounds) {
    var res = map.getResolution();
    var x = Math.round ((bounds.left - this.layer.maxExtent.left) / (res * this.layer.tileSize.w));
    var y = Math.round ((this.layer.maxExtent.top - bounds.top) / (res * this.layer.tileSize.h));
    var z = map.getZoom();

    var path = category_tiles_url + this.id + "/" + z + "/" + x + "/" + y + ".png?"+ this.version;
    
    return path;
  }

  // register category
  this.register_category=function(category) {
    this.category_list[category.id]=category;
  }

  // unregister category
  this.unregister_category=function(category) {
    delete(this.category_list[category.id]);

    if(keys(this.category_list).length==0)
      this.destroy();
  }

  /// destroy (destructor)
  this.destroy=function() {
    map.removeLayer(this.layer);
    delete(overlays_list[this.id]);
  }

  // constructor
  this.id=id;
  if(!_tags)
    _tags=new tags();
  this.tags=_tags;
  this.category_list={};

  var name=this.tags.get_lang("name", ui_lang);
  if(!name)
    name=this.id;

  this.layer=new OpenLayers.Layer.OSM(name, "tiles/"+this.id, {numZoomLevels: 19, isBaseLayer: false, visibility: false, getURL: this.build_url.bind(this) });
  map.addLayer(this.layer);
  overlays_list[this.id]=this;

  this.layer.id=this.id;
  this.layer.events.register("visibilitychanged", this.layer, overlays_visibility_change);

  this.maxExtent=new OpenLayers.Bounds(-20037508.3427892,-20037508.3427892,20037508.3427892,20037508.3427892);
  this.tileSize={w: 256, h: 256};
}

function get_overlay(id) {
  return overlays_list[id];
}

function finish_drag(feature) {
  var pos=feature.geometry.getCentroid();
  if(feature.ob&&feature.ob.finish_drag)
    feature.ob.finish_drag(pos);

  call_hooks("finish_drag", feature, pos);
}

function start_drag(feature) {
  var pos=feature.geometry.getCentroid();
  if(feature.ob&&feature.ob.start_drag)
    feature.ob.start_drag(pos);

  call_hooks("start_drag", feature, pos);
}

function next_drag(feature) {
  var pos=feature.geometry.getCentroid();
  if(feature.ob&&feature.ob.next_drag)
    feature.ob.next_drag(pos);

  call_hooks("next_drag", feature, pos);
}

function object_select(ev) {
  var feature=ev.feature;
  var pos=feature.geometry.getCentroid();
  if(feature.ob&&feature.ob.object_select)
    feature.ob.object_select(pos);

  call_hooks("object_select", feature, pos);
}

function object_unselect(ev) {
  var feature=ev.feature;
  var pos=feature.geometry.getCentroid();
  if(feature.ob&&feature.ob.object_unselect)
    feature.ob.object_unselect(pos);

  call_hooks("object_unselect", feature, pos);
}


function check_overlays(data) {
  var new_layers=[];

  if(data) {
    var l=data.getElementsByTagName("overlay");
    for(var i=0; i<l.length; i++) {
      new_layers[l[i].getAttribute("id")]=1;
    }
  }
}

function overlays_init() {
  // default value for tiles url
  if(!category_tiles_url)
    category_tiles_url="tiles/";

  vector_layer=new OpenLayers.Layer.Vector(t("overlay:data"), { weight: 10 });
  vector_layer.setOpacity(0.7);
  drag_layer=new OpenLayers.Layer.Vector(t("overlay:draggable"), { weight: 11 });

  var mod_feature=new OpenLayers.Control.ModifyFeature(drag_layer);
  drag_layer.select=mod_feature.selectControl.select.bind(mod_feature.selectControl);
  drag_layer.unselect=mod_feature.selectControl.unselect.bind(mod_feature.selectControl);
  drag_layer.unselectAll=mod_feature.selectControl.unselectAll.bind(mod_feature.selectControl);

  map.addLayer(vector_layer);
  map.addLayer(drag_layer);
  map.addControl(mod_feature);

  mod_feature.mode |= OpenLayers.Control.ModifyFeature.DRAG;
  mod_feature.dragComplete=finish_drag;
  mod_feature.dragVertex=next_drag;
//  mod_feature.dragStart=start_drag; -- with this activated selecting objects doesn't work
  drag_layer.events.on({
    'featureselected': object_select,
    'featureunselected': object_unselect
  });

  mod_feature.activate();

  layers_reorder();
}

function overlays_unselect() {
  drag_layer.unselectAll();
}

function layers_reorder() {
  var list_overlays=[];
  var list_basemaps=[];

  for(var i=0; i<map.layers.length; i++) {
    var w=map.layers[i].options.weight;
    if(!w)
      w=0;

    if(map.layers[i].isBaseLayer)
      list_basemaps.push([ w, map.layers[i] ]);
    else
      list_overlays.push([ w, map.layers[i] ]);
  }

  list_basemaps=weight_sort(list_basemaps);
  list_overlays=weight_sort(list_overlays);

  for(var i=0; i<list_basemaps.length; i++) {
    map.setLayerIndex(list_basemaps[i], i);
  }

  for(var i=0; i<list_overlays.length; i++) {
    map.setLayerIndex(list_overlays[i], i+list_basemaps.length);
  }
}

function overlays_visibility_change(event) {
  call_hooks("overlays_visibility_change", null, event.object);
}

register_hook("unselect_all", overlays_unselect);
