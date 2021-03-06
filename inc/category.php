<?
$make_valid=array("&"=>"&amp;", "\""=>"&quot;", "<"=>"&lt;", ">"=>"&gt;");
$plugins[]="category";

class category_rule {
  public $tags;
  public $id;

  function __construct($category, $data) {
    $this->category=$category;
    $this->id=$data['rule_id'];
    $this->tags=new tags(parse_hstore($data['tags']));
  }
}

class category {
  public $rules;

  function __construct($id) {
    global $lists_dir;
    $this->id=$id;
    $this->file="$lists_dir/$this->id";

    if(!file_exists("{$this->file}.save"))
      return null;

    $this->get_tags();
  }

  function get_tags() {
    if(file_exists("$this->file.save")) {
      // if category has been compiled get tags from data
      $this->get_data();
      $this->tags=$this->data['_']['tags'];
    }
    else {
      // if category has not been compiled yet, than read the tags at least
      $this->text=category_load($this->id);
      $this->dom=new DOMDocument();
      $this->dom->loadXML($this->text);

      $this->tags=new tags();
      $this->tags->readDOM($this->dom);

      $this->data=array('_'=>array(
	"id"=>$this->id,
	"tags"=>$this->tags,
	"version"=>0,
      ));
    }

    $this->rules=array();
    $res=sql_query("select * from category_rule where version='{$this->data['_']['version']}'");
    while($elem=pg_fetch_assoc($res)) {
      $this->rules[$elem['rule_id']]=new category_rule($this, $elem);
    }
  }

  function get_newest_version($db=null) {
    $res=sql_query("select * from category_current where category_id='$this->id'", $db);
    if(!$elem=pg_fetch_assoc($res))
      return null;

    return $elem['version'];
  }

  function get_renderd_config() {
    $ret=array();

    $file="$this->file.renderd";
    if(!file_exists($file))
      return null;

    $f=fopen("$file", "r");
    $r=fgets($f);
    while($r=fgets($f)) {
      $r=trim($r);
      if(preg_match("/^([A-Za-z0-9_]*) *=(.*)$/", $r, $m)) {
	$ret[$m[1]]=$m[2];
      }
    }
    fclose($f);

    return $ret;
  }

  function get_data() {
    global $lists_dir;

    // load category configuration
    if(file_exists("$this->file.save")) {
      $this->data=unserialize(file_get_contents("$this->file.save"));
      return $this->data;
    }

    if(file_exists("$lists_dir/$this->id.xml")) {
      $this->data=$this->compile();
      return $this->data;
    }
    else
      return null;
  }

  function compile() {
    global $lists_dir;
    global $db_central;

    // Load content
    $this->text=category_load($this->id);
    $this->dom=new DOMDocument();
    $this->dom->loadXML($this->text);

    $this->tags=new tags();
    $this->tags->readDOM($this->dom->firstChild);

    // First, create all file content
    $cur=$this->dom->firstChild;

    while($cur) {
      if($cur->nodeName=="category") {
	$cat=new process_category($this, $cur);
	$data=$cat->process();
      }
      $cur=$cur->nextSibling;
    }

    if(!$data['_'])
      $data['_']=array();
    $data['_']=array_merge($data['_'], array(
      "id"=>$this->id,
      "tags"=>$this->tags,
      "version"=>$this->get_newest_version(),
    ));

    $mapnik=build_mapnik_style($this->id, $data, $this->tags);
    $renderd=build_renderd_config($this->id, $data, $this->tags);

    // ... then write all files at once
    foreach($data['_']['classify_fun'] as $table=>$fun)
      sql_query($fun, $db_central);

    $f1=fopen("$this->file.save", "w");
    fwrite($f1, serialize($data));
    fclose($f1);

    $f2=fopen("$this->file.mapnik", "w");
    fwrite($f2, $mapnik);
    fclose($f2);

    $f3=fopen("$this->file.renderd", "w");
    fwrite($f3, $renderd);
    fclose($f3);

    return $data;
  }

  function get_list($param) {
    global $request;
    global $importance;
    global $postgis_tables;
    global $lists_dir;
    global $DEFAULT_SRID;
    global $DB_SRID;

    $srid=$DEFAULT_SRID;
    if(isset($param['srid'])&&preg_match("/^[0-9]*$/", $param['srid']))
      $srid=$param['srid'];

    $list_data=$this->data;
    if(!$this->data['_']['version']) {
      $ret ="<category id='$this->id'";
      $ret.=" status='not_compiled'";
      $ret.=">\n";
      foreach($list as $l) {
	$ret.=$this->print_match($l);
      }
      $ret.="</category>\n";

      return $ret;
    }

  //// process params ////
    // count
    $count=10;
    if($param['count'])
      $count=$param['count'];

    // exclude
    if($param['exclude']) {
      $excl_list=explode(",", $param['exclude']);
      $exclude_list=array();
      foreach($excl_list as $e) {
	if(ereg("^[NWR]([0-9]*)$", $e, $m))
	  $exclude_list[]=$m[0];
      }

      $sql_where['*'][]="id not in ('".implode("', '", $exclude_list)."')";

/*      foreach($exclude_list as $type=>$excl_list) {
	$exclude_list[$type]=" not in (".implode(", ", $excl_list).")";
      }

      foreach($postgis_tables as $type=>$type_conf) {
	if(is_array($type_conf[id_type])) {
	  foreach($type_conf[id_type] as $id_type)
	    if($exclude_list[$id_type])
	      $excl_where[$type]=$type_conf[id_name]." ".$exclude_list[$id_type];
	}
	else {
	  if($exclude_list[$type_conf[id_type]])
	    $excl_where[$type]=$type_conf[id_name]." ".$exclude_list[$type_conf[id_type]];
	}
      } */
    }

    // viewbox
    if($param['viewbox']) {
      $coord=explode(",", $param['viewbox']);
      $sql_where['*'][]="CollectionIntersects(SnapToGrid(geo, 0.00001), ST_Transform(PolyFromText('POLYGON(($coord[0] $coord[1], $coord[2] $coord[1], $coord[2] $coord[3], $coord[0] $coord[3], $coord[0] $coord[1]))', $srid), $DB_SRID))";
    }

  //// set some more vars
    $max_count=$count+1;
    $list=array();
    $more="true";

  //// now run, until we are finished
    foreach($importance as $imp) {
      if(($max_count>0)&&($list_data[$imp])) {
	foreach($list_data[$imp] as $t=>$req_data) {
	  global $importance_zoom;
	  if(isset($importance_zoom)&&($param['zoom']<$importance_zoom[$imp]['list'])) {
	    // TODO: Need plugin 'importance' enabled to make this work
	    // TODO: This should be managed by hooks
	    $more="zoom";
	    continue;
	  }


	  $qry_where=array();
	  if(sizeof($sql_where[$t]))
	    $qry_where[]=implode(" and ", $sql_where[$t]);
	  if(sizeof($sql_where['*']))
	    $qry_where[]=implode(" and ", $sql_where['*']);

	  $req_where=array();
	  if($req_data['where'])
	    $req_where[]=implode(" or ", $req_data['where']);

	  if(is_array($req_data['where_imp'])) {
	    if(sizeof($req_data['where_imp']))
	      $req_where[]="(".implode(" or ", $req_data['where_imp']).") and \"importance\"='$imp'";
	    else
	      $req_where[]="\"importance\"='$imp'";
	  }

	  if(sizeof($req_where))
	    $req_where="where ".implode(" or ", $req_where);
	  else
	    $req_where="";

	  $where=implode(" and ", $qry_where);
	  
	  if(!$where)
	    $where="true";

          $sql=strtr($req_data['sql'], array(
	    "!bbox!"=>"ST_Transform(PolyFromText('POLYGON(($coord[0] $coord[1], $coord[2] $coord[1], $coord[2] $coord[3], $coord[0] $coord[3], $coord[0] $coord[1]))', $srid), $DB_SRID)",
	  ));

	  // Build Query
          $qryc ="";

	  // Some debug info, visible in pg_stat_activity
	  $qryc.="/* {$this->id}.get_list: z{$param['zoom']}, {$imp} */ ";

	  // Main query
	  $qryc.="select *, astext(ST_Transform(ST_Centroid(geo), $srid)) as center from (";
	  $qryc.=$sql;
	  $qryc.=") as x where $where limit $max_count";
	  // print "==\n$qryc\n==";
	  
	  $resc=sql_query($qryc);
	  $max_count-=pg_num_rows($resc);
	  while($elemc=pg_fetch_assoc($resc))
	    $list[]=$elemc;
	}
      }
    }

  //  if($max_count>0) {
  //    $qryc="select * from (select 'rel' as type, id, (CASE {$request[gastro][suburban]} END) as res from planet_osm_point as t1) as t where res is not null limit $max_count";
  //    $resc=sql_query($qryc);
  //    $max_count-=pg_num_rows($resc);
  //    while($elemc=pg_fetch_assoc($resc))
  //      $list[]=$elemc;
  //  }

    if(sizeof($list)>$count) {
      $list=array_slice($list, 0, $count);
      $more="false";
    }

    $ret ="<category id='$this->id'";
    $ret.=" version='{$this->data['_']['version']}'";
    
    if($this->get_newest_version()!=$this->data['_']['version']) {
      $ret.=" status='old_version'";
    }

    $ret.=" complete='{$more}'";
    $ret.=">\n";
    foreach($list as $l) {
      $ret.=$this->print_match($l);
    }
    $ret.="</category>\n";

    return $ret;
  }

  function print_match($res) {
    global $data_lang;
    $lang=$data_lang;
    $id=array();

    global $make_valid;
    $id=$res['id'];

    $rule_tags=new tags(parse_hstore($res['rule_tags']));

    $tags=parse_hstore($res['tags']);

    $ret="<match ";
    $ob=load_object($res, $tags);
    $info=explode("||", $res['res']);

    $ret.="id=\"{$id}\" ";
    $ret.="rule_id=\"{$res['rule_id']}\">\n";

    foreach($tags as $k=>$v) {
      $k=strtr($k, array("&"=>"&amp;", ">"=>"&gt;", "<"=>"&lt;", "\""=>"&quot;"));
      $v=strtr($v, array("&"=>"&amp;", ">"=>"&gt;", "<"=>"&lt;", "\""=>"&quot;"));
      $ret.="  <tag k=\"$k\" v=\"$v\" />\n";
    }

    $ret.="  <tag k=\"#geo:center\" v=\"{$res['center']}\"/>\n";
    $ret.="  <tag k=\"#importance\" v=\"{$res['importance']}\"/>\n";

    $ret.="</match>\n";

    return $ret;
  }

  // save
  function save($param=array()) {
    global $current_user;
    global $db_central;

    $sql="begin;";

    $version=uniqid();
    $parent_version=$this->get_newest_version($db_central);
    $version_tags=new tags();
    $version_tags->set("user", $current_user->username);
    $version_tags->set("date", Date("c"));
    $version_tags->set("msg", $param['msg']);

    $sql.="insert into category values ('{$this->id}', ".array_to_hstore($this->tags->data()).", '$version', Array['$parent_version'], ".array_to_hstore($version_tags->data()).");\n";

    foreach($this->rules as $id=>$rule) {
      $sql.="insert into category_rule values ('{$this->id}', '{$rule->id}', ".array_to_hstore($rule->tags->data()).", '$version');\n";
    }

    $sql.="update category_current set version='$version', now=now() where category_id='{$this->id}';\n";
    $sql.="commit;\n";

    sql_query($sql, $db_central);
  }
}
