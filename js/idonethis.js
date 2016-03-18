// iDoneThis Obj
var iDoneThis = {
  
  // CORS_ANYWHERE: "",
  // CORS_ANYWHERE: "http://www.whateverorigin.org/",
  CORS_ANYWHERE: "https://cors-anywhere.herokuapp.com/",
  BASE: "https://idonethis.com/api/",
  VER: "v0.1",
  NOOP: "/noop/",
  DONES: "/dones/",
  TEAMS: "/teams/",
  USERS: "/users/",
  HOOKS: "/hooks/",
  
  errorStatus: "",
  
  isLoggedIn: function(checkremote, callback){
    if(checkremote !== true){
      if(localStorage.username && localStorage.username !== ""){
        if(callback) callback(true);
      } else {
        if(callback) callback(false);
      }
    } else {
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
                if(callback) callback(true);
              }
            } else {
              // localStorage.removeItem("username");
              if(callback) callback(false);
            }
          }
        }
      } else {
        localStorage.removeItem("username");
        if(callback) callback(false);
      }
    }
  },
  
  connect: function(callback){
    if(localStorage.idtToken && localStorage.idtToken !== ""){
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.NOOP);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          // console.log(xhr.responseText);
          if(xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            if(response.ok === true){
              console.log("connected.");
              localStorage.username = response.user;
              iDoneThis.getUserDetails(function(){
                iDoneThis.getTeams(callback);
                iDoneThis.getDones();
              });
            }
          } else {
            console.log("connect failed, recheck auth token");
            localStorage.removeItem("username");
            if(callback) callback(false);
          }
        }
      }
    } else {
      console.log("connect failed, no auth token");
      localStorage.removeItem("username");
      if(callback) callback(false);
    }
  },
  
  logout: function(callback){
    localStorage.clear();
    ls.clear(callback);
  },
  
  newDone: function(doneObj, callback){
    var sendURL = iDoneThis.CORS_ANYWHERE + iDoneThis.BASE + iDoneThis.VER + iDoneThis.DONES;
    
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
            
            console.log("sent.");
            ls.set({"inputText": ""}, function(){
              iDoneThis.getDones(null, function(){
                if(callback) callback(true);
              });
            });
            
          } else {
            
            console.log("send failed, recheck auth token. \n Original message: ");
            if(callback) callback(false);
          }
        } else {
          console.log("xhr.status: " + xhr.status);
          console.log("xhr.responseText: " + xhr.responseText);
          console.log("xhr.response: " + xhr.response);
          
          // Save done offline, 
          ls.get("offlineList", function(st){
            var offlineList = [];
            if(st && st.offlineList)
              offlineList = st.offlineList;
            
            offlineList.push(doneObj);
            ls.set({"offlineList": offlineList}, function(){
              console.log("added done to offline List");
              
              // Signal online listener to sync
              localStorage.offlineDones = "true";
              
              // Show notification that done has been added to offline list
              if(callback) callback("offline");
            });
          });
        }
      }
    }
    
    xhr.onerror = function(){
      // Network layer error
      console.log("In onerror callback");
      // Save done offline, 
      ls.get("offlineList", function(st){
        var offlineList = [];
        if(st && st.offlineList)
          offlineList = st.offlineList;
        
        offlineList.push(doneObj);
        ls.set({"offlineList": offlineList}, function(){
          console.log("added done to offline List");
          
          // Signal online listener to sync
          localStorage.offlineDones = "true";
          
          // Show notification that done has been added to offline list
          if(callback) callback("offline");
        });
      });
    }
  },
  
  /**
   * syncOfflineList
   * Recursive function - sends first element of offlineList to idt, removes it from list then calls self
   */
  syncOfflineList: function(callback){
    ls.get("offlineList", function(st){
      if(st && st.offlineList && st.offlineList.length > 0){
        console.log("Inside syncOfflineList with:" + st.offlineList.length + " elements");
        
        var sendURL = iDoneThis.CORS_ANYWHERE + iDoneThis.BASE + iDoneThis.VER + iDoneThis.DONES;
        
        var xhr = new XMLHttpRequest();
        xhr.open("POST", sendURL);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.send(JSON.stringify(st.offlineList[0]));
        
        xhr.onreadystatechange = function() {
          if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status < 300) {
              
              var response = JSON.parse(xhr.responseText);
              
              if(response.ok === true){
                
                // remove current done from list, call self
                st.offlineList.shift();
                  
                if(st.offlineList.length > 0)
                  ls.set({"offlineList": st.offlineList}, function(){
                    iDoneThis.syncOfflineList(callback);
                  });
                
                else 
                  // All dones synced
                  ls.set({
                    "offlineList": st.offlineList,
                    "inputText": ""
                  }, function(){
                    
                    localStorage.offlineDones = "false";
                    
                    iDoneThis.getDones(null, function(){
                      if(callback) callback(true);
                    });
                    
                  });
                  
              } else {
                
                console.log("send failed, recheck auth token. \n Original message: ");
                if(callback) callback(false, response);
                
              }
            }
          }
        }
        
        xhr.onerror = function(){
          // Network layer error
          // Save done offline, 
          localStorage.offlineDones = "true";
          if(callback) callback(false);
        }
      }
    });
  },
  
  getTeams: function(callback){
    if(localStorage.username && localStorage.username !== ""){
      
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.TEAMS);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          if(xhr.status == 200) {
            
            var response = JSON.parse(xhr.responseText);
            
            if(response.ok === true){
              ls.set({teams: response.results}, function(){
                var defaultExists = false;
                var foundFirstPersonal = false;
                
                var tempDefaultTeam = response.results[0].name;
                var tempDefaultTeamCode = response.results[0].short_name;
                var tempDefaultTeamURL = response.results[0].permalink;
                localStorage.teamCount = response.results.length;
                
                for (var i = 0; i < response.results.length; i++) {
                  if(response.results[i].short_name === localStorage.defaultTeamCode){
                    defaultExists = true;
                    break;
                  }
                  if(response.results[i].is_personal === true && foundFirstPersonal === false){
                    tempDefaultTeam = response.results[i].name;
                    tempDefaultTeamCode = response.results[i].short_name;
                    tempDefaultTeamURL = response.results[i].permalink;
                    foundFirstPersonal = true;
                  }
                }
                
                if(defaultExists === false){
                  localStorage.defaultTeam = tempDefaultTeam;
                  localStorage.defaultTeamCode = tempDefaultTeamCode;
                  localStorage.defaultTeamURL = tempDefaultTeamURL;
                }
                if(callback) callback(true);
              });
            } else {
              // idt returned with response.ok === false
              if(callback) callback(false);
            }
          } else {
            // Returned with status !== 200
            if(callback) callback(false);
          }
        }
      }
      
      xhr.onerror = function(){
        // Network layer error
        // Save action offline?
        console.log("Network error in getTeams.");
      }
    } else {
      // LS username is empty or nonexistant
      localStorage.removeItem("username");
      
      if(callback) callback(false);
    }
  },
  
  /**
   * iDoneThis.getDones
   * Retrieve dones from server and save to chrome.storage.local
   * @param {string} listDate Date for which to fetch dones. If null, fetch for today
   * @param {function} successCallback Callback after a successful fetch
   * @param {function} failureCallback Callback after a failed fetch
   * @return {none} none
   */
  getDones: function(listDate, callback){
    if(localStorage.username && localStorage.username !== ""){
      
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.DONES + "?page_size=100&done_date=" + (typeof(listDate) === "string" && listDate !== "" ? listDate : "today"));
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          if(xhr.status == 200) {
            
            var response = JSON.parse(xhr.responseText);
            
            if(response.ok === true){
              ls.set({dones: response.results}, function(){
                localStorage.since = Date.now();
                chrome.alarms.create(DONE_CHECKER_ALARM, {
                  periodInMinutes: parseInt(localStorage.doneFrequency)
                });
                updateBadgeText();
                if(callback) callback(true);
              });
            } else {
              // idt returned with response.ok === false
              updateBadgeText();
              if(callback) callback(false);
            }
          } else {
            // Returned with status !== 200
            updateBadgeText();
            if(callback) callback(false);
          }
        }
      }
      
      xhr.onerror = function(){
        // Network layer error
        // Save action offline?
        console.log("Network error in getTeams.");
        updateBadgeText();
        if(callback) callback(false);
      }
    } else {
      // LS username is empty or nonexistant
      localStorage.removeItem("username");
      
      if(callback) callback(false);
    }
  },
  
  getUserDetails: function(callback){
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
              if(callback) callback(true);
            
            } else {
              
              console.log("didn't get userInfo: " + response);
              if(callback) callback(false);
            
            }
          
          } else {
            // Response status != 200, http error thrown
            console.log("didn't get userInfo, recheck auth token");
            if(callback) callback(false);
            
          }
        }
      }
      
    } else {
      
      console.log("not connected");
      if(callback) callback(false);
      
    }
  },
  
  buildUrl: function(base, key, value) {
    var sep = (base.indexOf('?') > -1) ? '&' : '?';
    return base + sep + key + '=' + value;
  },
  
  checkConnection: function(callback){
    var xhr = new XMLHttpRequest();
    var headURL = iDoneThis.BASE + iDoneThis.VER + iDoneThis.NOOP;
    var r = Math.round(Math.random() * 10000);
    
    xhr.open('HEAD', headURL + "?subins=" + r);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
    
    xhr.send();
    
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4){
        if (xhr.status >= 200 && xhr.status < 304) {
          if(callback) callback(true);
        } else {
          if(callback) callback(false);
        }
      }
    }
    
    xhr.onerror = function(){
      if(callback) callback(false);
    }
  },
}
