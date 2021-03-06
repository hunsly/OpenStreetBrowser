var icon_git;

function icon_obj(dir, id, files) {
  this.inheritFrom=git_obj;
  this.inheritFrom(dir, id, files);

  this.callback=function() {
    this.save_callback(this.id);
  }

  this.icon_url=function() {
    return this.url("preview.png");
  }

  this.update=function() {
    var tags_file=this.load("tags.xml", this.commit_id());
    if(tags_file&&tags_file.content) {
      var xml=parse_xml(tags_file.content);
      this.tags.set_data({});

      var el=xml.getElementsByTagName("tags");
      if(el.length)
	this.tags.readDOM(el[0]);
    }
    else {
      this.tags.set_data({});
    }
  }

  this.tags=new tags();
  this.update();
}

function get_icon(file) {
  icon_obj=icon_git.get_obj(file);

  if(icon_obj)
    return icon_obj;

  return false;
}

function icon_init() {
  icon_git=new git_dir(data_dir, "icons", icon_obj);
}

register_hook("init", icon_init);
