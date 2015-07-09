// Chrome.Storage.Local object
var ls = {
  get: function(getObj, callback){
    if(typeof(getObj) === "function"){
      callback = getObj;
      getObj = undefined;
    }
    chrome.storage.local.get(getObj, callback);
  },
  
  set: function(setObj, callback){
    chrome.storage.local.set(setObj, callback);
  },
  
  clear: function(callback){
    chrome.storage.local.clear(callback);
  },
  
  remove: function(objs, callback){
    chrome.storage.local.remove(objs, callback);
  }
};


