// PocketStore Obj
var iDoneThis = {
  
  BASE: "https://idonethis.com/api/",
  VER: "v0.1",
  NOOP: "/noop/",
  DONES: "/dones/",
  TEAMS: "/teams/",
  USERS: "/users/",
  HOOKS: "/hooks/",
  
  isLoggedIn: function(successCallback, failureCallback){
    // if(localStorage.username && localStorage.username !== ""){
    //   if(successCallback) successCallback();
    // } else {
    //   if(failureCallback) failureCallback();
    // }
    // return;
    if(localStorage.idtToken && localStorage.idtToken !== ""){
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.NOOP);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          if(xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            if(response.ok === true){
              if(successCallback) successCallback();
            }
          } else {
            // localStorage.removeItem("username");
            if(failureCallback) failureCallback();
          }
        }
      }
    } else {
      localStorage.removeItem("username");
      if(failureCallback) failureCallback();
    }
  },
  
  connect: function(successCallback, failureCallback){
    if(localStorage.idtToken && localStorage.idtToken !== ""){
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.NOOP);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          console.log(xhr.responseText);
          if(xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            if(response.ok === true){
              console.log("connected.");
              localStorage.username = response.user;
              iDoneThis.getUserDetails(function(){
                iDoneThis.getTeams(successCallback);
              });
            }
          } else {
            console.log("connect failed, recheck auth token");
            localStorage.removeItem("username");
            if(failureCallback) failureCallback();
          }
        }
      }
    } else {
      console.log("connect failed, no auth token");
      localStorage.removeItem("username");
      if(failureCallback) failureCallback();
    }
  },
  
  logout: function(callback){
    localStorage.clear();
    if(callback) callback();
  },
  
  newDone: function(doneObj, successCallback, failureCallback){
    if(localStorage.username && localStorage.username !== ""){
      
      var CORS_ANYWHERE = "https://cors-anywhere.herokuapp.com/";
      var sendURL = CORS_ANYWHERE + iDoneThis.BASE + iDoneThis.VER + iDoneThis.DONES;
      // var sendURL = iDoneThis.BASE + iDoneThis.VER + iDoneThis.DONES;
      
      var xhr = new XMLHttpRequest();
      xhr.open("POST", sendURL);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(doneObj));
      
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          // if(xhr.status == 200) {
            console.log(xhr.responseText);
            // console.log(xhr.response);
            var response = JSON.parse(xhr.responseText);
            console.log(response);
            // if(response.ok === true){
              // localStorage.username = response.user;
              console.log("sent.");
            // }
            if(response.ok === true && successCallback){ successCallback();
          } else {
            // localStorage.removeItem("username");
            console.log("send failed, recheck auth token");
            if(failureCallback) failureCallback();
          }
        }
      }
      
    } else {
      
      localStorage.removeItem("username");
      console.log("not connected");
      if(failureCallback) failureCallback();
      
    }
  },
  
  
  getTeams: function(successCallback, failureCallback){
    if(localStorage.username && localStorage.username !== ""){
      
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.TEAMS);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          if(xhr.status == 200) {
            console.log(xhr.responseText);
            var response = JSON.parse(xhr.responseText);
            console.log(response);
            if(response.ok === true){
              chrome.storage.local.set({teams: response.results}, function(){
                console.log("teams recieved: " + response.results.length);
                if(successCallback) successCallback();
              });
            } else {
              console.log("response not ok: " + response.ok);
              if(failureCallback) failureCallback();
            }
          } else {
            // localStorage.removeItem("username");
            console.log("send failed, recheck auth token");
            if(failureCallback) failureCallback();
          }
        }
      }
      
    } else {
      
      localStorage.removeItem("username");
      console.log("not connected");
      if(failureCallback) failureCallback();
      
    }
  },
  
  
  getUserDetails: function(successCallback, failureCallback){
    if(localStorage.username && localStorage.username !== ""){
      
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.USERS + localStorage.username);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          if(xhr.status == 200) {
            
            var response = JSON.parse(xhr.responseText);
            
            if(response.ok === true){
              
              console.log("response ok, got teams: " + response.ok);
              
              localStorage.niceName = response.result.nicest_name;
              localStorage.email = response.result.email;
              localStorage.avatar_url = response.result.avatar_url;
              if(successCallback) successCallback();
            
            } else {
              
              console.log("didn't get userInfo: " + response);
              if(failureCallback) failureCallback();
            
            }
          
          } else {
            // Response status != 200, http error thrown
            console.log("didn't get userInfo, recheck auth token");
            if(failureCallback) failureCallback();
            
          }
        }
      }
      
    } else {
      
      console.log("not connected");
      if(failureCallback) failureCallback();
      
    }
  },
  
  
  buildUrl: function(base, key, value) {
    var sep = (base.indexOf('?') > -1) ? '&' : '?';
    return base + sep + key + '=' + value;
  }
};
