// return format for recent_changes hook:
// [ { date: '2011-12-13 14:15:16', user: 'test', msg: 'changed bla', plugin: 'talk', 'href': link to page }, ... ]
//
function recent_changes() {
  function recent_changes_sort(a, b) {
    return b-a;
  }

  // show
  this.show=function() {
    var new_list=[];

    for(var i=0; i<this.list.length; i++) {
      var l=this.list[i];

      new_list.push({
	name: l.name+": "+(l.msg || lang("no_message")),
	type: l.date+" by "+l.user,
	href: l.href
      });
    }

    dom_clean(this.win.content);
    new list(this.win.content, new_list);
  }

  // list_sort
  this.list_sort=function() {
    var tmp_list={};

    // first add all elements to an hash array with index of date
    for(var i=0; i<this.list.length; i++) {
      var e=this.list[i];
      var d=new Date(e.date);

      if(!tmp_list[d.valueOf()])
	tmp_list[d.valueOf()]=[];

      tmp_list[d.valueOf()].push(e);
    }

    // get the keys, order them
    var k=keys(tmp_list);
    k.sort(recent_changes_sort);

    // write to new_list
    var new_list=[];
    for(var i=0; i<k.length; i++) {
      for(var j=0; j<tmp_list[k[i]].length; j++) {
	new_list.push(tmp_list[k[i]][j]);
      }
    }

    this.list=new_list;
  }

  // close
  this.remove=function() {
  }

  // load
  this.load=function() {
    this.list=[];
    var x=new ajax("recent_changes_load", null, this.load_callback.bind(this));
    this.win.content.appendChild(ajax_indicator_dom(x));
    call_hooks("recent_changes_load", this.list);
  }

  // load_callback
  this.load_callback=function(ret) {
    ret=ret.return_value;

    this.list=this.list.concat(ret);

    this.list_sort();
    this.show();
  }

  // constructor
  this.win=new win({ class: "recent_changes", title: lang("recent_changes:name") });
  this.onclose=this.remove.bind(this);
  this.load();
}

function recent_changes_show() {
  new recent_changes();
}
