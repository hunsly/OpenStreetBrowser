var gps_follow_active=false;
var gps_follow_input;
//var gps_follow_vector;

// returns a polygon covering a part of the available screen space
// default: 2/3
// option size: 'full' returns a polygon the size of the view port
function gps_follow_polygon(size) {
  var scale_factor=2.0/3;
  if(size=="full")
    scale_factor=1;

  bounds=map.calculateBounds().scale(scale_factor);

  var corners=[];
  corners.push(new OpenLayers.Geometry.Point(bounds.left, bounds.top));
  corners.push(new OpenLayers.Geometry.Point(bounds.right, bounds.top));
  corners.push(new OpenLayers.Geometry.Point(bounds.right, bounds.bottom));
  corners.push(new OpenLayers.Geometry.Point(bounds.left, bounds.bottom));
  var ring=new OpenLayers.Geometry.LinearRing(corners);
  var poly=new OpenLayers.Geometry.Polygon(ring);

  return poly;
}

function gps_follow_view_changed() {
  var pos=gps_object.get_pos();
  if(!pos) {
    gps_follow_active=false;
    if(gps_follow_input)
      gps_follow_input.checked=false;

    return;
  }

  // check if we want to follow gps
  if((!gps_follow_active)&&(!json_decode(options_get("gps_follow"))))
    return;

  // build a copy of pos (to not modify reference)
  var pos=new OpenLayers.LonLat(pos.lon, pos.lat);
  pos.transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());
  pos=new OpenLayers.Geometry.Point(pos.lon, pos.lat);

  // if position is inside polygon, re-activate following if it was temp. disabled
  if(gps_follow_polygon('full').containsPoint(pos)) {
    if(!gps_follow_active) {
      gps_follow_active=true;
      if(gps_follow_input)
	gps_follow_input.checked=true;
    }
  }
  // if position is outside polygon, deactivate temporarily
  else {
    gps_follow_active=false;
    if(gps_follow_input)
      gps_follow_input.checked=false;
  }
}

function gps_follow_update(ob) {
  if(gps_follow_active) {

    var pos = gps_object.get_pos();
    // build a copy of pos (to not modify reference)
    pos=new OpenLayers.LonLat(pos.lon, pos.lat);
    pos.transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());

    var ppos=new OpenLayers.Geometry.Point(pos.lon, pos.lat);
    // when loading map for the first time center on and zoom to location
    if(first_load) {
      map.setCenter(pos, 15);
      first_load=false;
    }
    // check whether current location is visible on the map (in 2/3 of
    // available screen space) and if not center on location
    else if(!gps_follow_polygon().containsPoint(ppos)) {
      map.panTo(pos);
    }
  }
}

function gps_follow_toggle() {
  options_set("gps_follow", json_encode(gps_follow_input.checked));
  gps_follow_active=gps_follow_input.checked;

  if(gps_follow_active) {
    var pos;
    if(gps_object&&(pos=gps_object.get_pos()))
      // build a copy of pos (to not modify reference)
      pos=new OpenLayers.LonLat(pos.lon, pos.lat);

      pos.transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject());

      map.panTo(pos);
  }
}

function gps_follow_show(list) {
  var f=document.createElement("form");
  var i=document.createElement("input");
  i.type="checkbox";
  i.name="gps_follow";
  i.id="gps_follow";
  i.checked=json_decode(options_get("gps_follow"));
  i.onchange=gps_follow_toggle;
  gps_follow_input=i;
  f.appendChild(i);

  var i=dom_create_append(f, "label");
  dom_create_append_text(i, lang("gps_follow:label"));
  i.setAttribute("for", "gps_follow");

  list.push([ -5, f ]);
}

function gps_follow_init() {
  gps_follow_active=json_decode(options_get("gps_follow"));
}

register_hook("gps_toolbox_show", gps_follow_show);
register_hook("gps_update", gps_follow_update);
register_hook("view_changed", gps_follow_view_changed);
register_hook("init", gps_follow_init);
