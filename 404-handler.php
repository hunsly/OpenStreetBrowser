<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
<?
Header("HTTP/1.1 404 Not Found");

$list=array(array(10, array(
  'body'=>"The requested URL {$_SERVER['REQUEST_URI']} was not found on this server.",
)));
call_hooks("404", &$list, $_SERVER['REQUEST_URI']);

$list=weight_sort($list);
if(isset($list[0]['header'])) {
  foreach($list[0]['header'] as $header)
    Header($header);
}
print $list[0]['body'];
