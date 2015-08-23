var iDoneThis = {
  BASE: "https://idonethis.com/api/",
  VER: "v0.1",
  NOOP: "/noop/",
  DONES: "/dones/",
  TEAMS: "/teams/",
  USERS: "/users/",
  HOOKS: "/hooks/",

  newDone: function(doneObj,callback){
    var sendURL = iDoneThis.BASE + iDoneThis.VER + iDoneThis.DONES;
    
    var xhr = new XMLHttpRequest();
    xhr.open("POST", sendURL);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(doneObj));
    
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4){
        if(xhr.status >= 200 && xhr.status < 300) {
          
          var response = JSON.parse(xhr.responseText);
          
          if(response.ok === true){
            if(callback)
              callback(0, response);
          } else {
            console.log("send failed, recheck auth token. \n Original message: ");
            
            if(callback) callback(1, response);
          }
        } else {
          console.log("xhr.status: " + xhr.status);
          console.log("xhr.responseText: " + xhr.responseText);
          console.log("xhr.response: " + xhr.response);
          
          // Save done offline, 
          if(callback) callback(2);
        }
      }
    }
  }
}
