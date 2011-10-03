function category_history(id, cat_win) {
  // show_version
  this.show_version=function(param) {
    alert(print_r(param));
  }

  // show
  this.show=function() {
    var ret=this.data;

    dom_clean(this.content_div);
    dom_create_append(this.content_div, "ul");

    for(var i in ret) {
      var e=ret[i];

      var li=dom_create_append(this.content_div, "li");

      var a=dom_create_append(li, "a");
      var text=e.version_tags.date;
      if(!text)
	text="?";
      dom_create_append_text(a, text);
      a.href="#";
      a.onclick=this.show_version.bind(this, { page: this.id, version: e.version });

      dom_create_append_text(li, " by ");

      // TODO: as soon as user_show() is implemented change to "a"
      var a=dom_create_append(li, "span");
      //a.href="javascript:user_show(\""+e.version_tags.user+"\")";
      var text=e.version_tags.user;
      if(!text)
	text="?";
      dom_create_append_text(a, text);
    }
  }

  // load
  this.load=function() {
    var param={
      id: this.id
    };

    ajax("category_history", param, this.load_callback.bind(this));
  }

  // load_callback
  this.load_callback=function(ret) {
    this.data=ret.return_value;
    this.show();
  }

  // constructor
  this.id=id;
  if(!this.id)
    this.id="new";
  this.win=new tab({ class: "category_history", title: lang("category_history:name", 1) });
  this.win.content.innerHTML="<img src='img/ajax_loader.gif' /> "+lang("loading");
  this.content_div=this.win.content;
  cat_win.tab_manager.register_tab(this.win);
  this.load();
}

// reacts on opening category window
function category_history_win_show(win, category) {
  new category_history(category.id, win);
}

register_hook("category_window_show", category_history_win_show);

