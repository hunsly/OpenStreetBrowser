<?
include_once "git_master.php";
include_once "user.php";

$data_dir=new git_master("$data_path/git");

function get_git_directory($id) {
  global $data_dir;
  return $data_dir->get_dir($id);
}
function ajax_git_directory_load($param, $xml) {
  $dir=get_git_directory($param['dir']);
  $dir->xml($xml);
}

function ajax_git_commit_start($param, $xml) {
  global $data_dir;
  $result=$data_dir->commit_start($param);
  return $result;
}

function ajax_git_create_obj($param, $xml) {
  global $data_dir;

  $dir=get_git_directory($param['dir']);
  $data_dir->commit_continue($param['commit_id']);
  $result=$dir->create_obj($param['id']);
  
  if(is_array($result))
    return $result;

  $ret=dom_create_append($xml, "result", $xml);
  $ret->setAttribute("id", $result->id);
  foreach($result->files as $f) {
    $ret1=dom_create_append($ret, "file", $xml);
    dom_create_append_text($ret1, $f, $xml);
  }
}

function ajax_git_commit_end($param, $xml) {
  global $data_dir;
  $data_dir->commit_continue($param['commit_id']);
  $result=$data_dir->commit_end($param['message']);
  return $result;
}

function ajax_git_commit_cancel($param, $xml) {
  global $data_dir;
  $data_dir->commit_continue($param['commit_id']);
  $result=$data_dir->commit_cancel();
  return $result;
}

function ajax_git_obj_save($param) {
  global $data_dir;
  $dir=get_git_directory($param['dir']);
  $data_dir->commit_continue($param['commit_id']);
  $obj=$dir->get_obj($param['obj']);
  $result=$obj->save($param['file'], $param['content']);
  return $result;
}

function ajax_git_obj_load($param) {
  global $data_dir;
  $dir=get_git_directory($param['dir']);
  if($param['version_branch'])
    $data_dir->commit_continue($param['version_branch']);
  $obj=$dir->get_obj($param['obj']);
  $result=$obj->load($param['file'], $param['version_branch']);
  return $result;
}

function ajax_git_obj_list($param) {
  $ret=array();
  $dir=get_git_directory($param['dir']);

  foreach($dir->obj_list() as $id=>$obj) {
    $ret[$id]=$obj->files;
  }

  return $ret;
}

function ajax_git_get_obj($param) {
  global $data_dir;
  $dir=get_git_directory($param['dir']);
  $data_dir->commit_continue($param['commit_id']);
  $obj=$dir->get_obj($param['obj']);

  if($obj) {
    return $obj->files;
  }

  return false;
}

function git_write_log($xml) {
  global $data_dir;

  $el=dom_create_append($xml->firstChild, "git_log", $xml);
  dom_create_append_text($el, $data_dir->log, $xml);
}
register_hook("xml_done", "git_write_log");
