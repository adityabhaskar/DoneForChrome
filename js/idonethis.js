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
  
  isLoggedIn: function(checkremote, successCallback, failureCallback){
    if(checkremote !== true){
      if(localStorage.username && localStorage.username !== ""){
        if(successCallback) successCallback();
      } else {
        if(failureCallback) failureCallback();
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
          // console.log(xhr.responseText);
          if(xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            if(response.ok === true){
              console.log("connected.");
              localStorage.username = response.user;
              iDoneThis.getUserDetails(function(){
                iDoneThis.getTeams(successCallback);
                iDoneThis.getDones();
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
    ls.clear(callback);
    // if(callback) callback();
  },
  
  
  newDone: function(doneObj, successCallback, failureCallback, offlineCallback){
    // var CORS_ANYWHERE = "https://cors-anywhere.herokuapp.com/";
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
          // console.log(xhr.responseText);
          
          var response = JSON.parse(xhr.responseText);
          // console.log(response);
          console.log("sent.");
          
          if(response.ok === true){
            if(successCallback)
              successCallback(response);
          } else {
            // localStorage.removeItem("username");
            console.log("send failed, recheck auth token. \n Original message: ");
            // console.log(doneObj);
            
            if(failureCallback) failureCallback(response);
          }
        } else {
          console.log("xhr.status: " + xhr.status);
          console.log("xhr.responseText: " + xhr.responseText);
          console.log("xhr.response: " + xhr.response);
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
          if(offlineCallback) offlineCallback();
        });
      });
    }
  },
  
  
  /**
   * syncOfflineList
   * Recursive function - sends first element of offlineList to idt, removes it from list then calls self
   */
  syncOfflineList: function(successCallback, failureCallback, offlineCallback){
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
              // console.log(xhr.responseText);
              
              var response = JSON.parse(xhr.responseText);
              // console.log(response);
              console.log("sent.");
              
              if(response.ok === true){
                // remove current done from list, call self
                st.offlineList.shift();
                ls.set({"offlineList": st.offlineList}, function(){
                  iDoneThis.syncOfflineList(successCallback, failureCallback, offlineCallback);
                });
              } else {
                // localStorage.removeItem("username");
                console.log("send failed, recheck auth token. \n Original message: ");
                // console.log(doneObj);
                
                if(failureCallback) failureCallback(response);
              }
            }
          }
        }
        
        xhr.onerror = function(){
          // Network layer error
          // Save done offline, 
          localStorage.offlineDones = "true";
          if(offlineCallback) offlineCallback();
        }
      } else {
        // All dones synced
        localStorage.offlineDones = "false";
        if(successCallback) successCallback();
      }
    });
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
            
            var response = JSON.parse(xhr.responseText);
            
            if(response.ok === true){
              ls.set({teams: response.results}, function(){
                
                localStorage.defaultTeam = response.results[0].name;
                localStorage.defaultTeamCode = response.results[0].short_name;
                localStorage.defaultTeamURL = response.results[0].permalink;
                localStorage.teamCount = response.results.length;
                
                for (var i = 0; i < response.results.length; i++) {
                  if(response.results[i].is_personal === true){
                    localStorage.defaultTeam = response.results[i].name;
                    localStorage.defaultTeamCode = response.results[i].short_name;
                    localStorage.defaultTeamURL = response.results[i].permalink;
                    break;
                  }
                }
                if(successCallback) successCallback();
              });
            } else {
              // idt returned with response.ok === false
              if(failureCallback) failureCallback();
            }
          } else {
            // Returned with status !== 200
            if(failureCallback) failureCallback();
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
      
      if(failureCallback) failureCallback();
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
  getDones: function(listDate, successCallback, failureCallback){
    if(localStorage.username && localStorage.username !== ""){
      
      var xhr = new XMLHttpRequest();
      xhr.open("GET", iDoneThis.BASE + iDoneThis.VER + iDoneThis.DONES + "?done_date=" + (typeof(listDate) === "string" ? listDate : "today"));
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Token " + localStorage.idtToken);
      xhr.send();
      
      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4){
          if(xhr.status == 200) {
            
            var response = JSON.parse(xhr.responseText);
            
            if(response.ok === true){
              // console.log(response.results);
              ls.set({dones: response.results}, function(){
                localStorage.since = Date.now();
                chrome.alarms.create(DONE_CHECKER_ALARM, {
                  periodInMinutes: parseInt(localStorage.doneFrequency)
                });
                if(successCallback) successCallback();
              });
            } else {
              // idt returned with response.ok === false
              if(failureCallback) failureCallback();
            }
          } else {
            // Returned with status !== 200
            if(failureCallback) failureCallback();
          }
        }
      }
      
      xhr.onerror = function(){
        // Network layer error
        // Save action offline?
        console.log("Network error in getTeams.");
        // if(offlineCallback) offlineCallback();
      }
    } else {
      // LS username is empty or nonexistant
      localStorage.removeItem("username");
      
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
  },
  
  
  checkConnection: function(onlineCallback, offlineCallback){
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
          if(onlineCallback) onlineCallback();
        } else {
          if(offlineCallback) offlineCallback();
        }
      }
    }
    
    xhr.onerror = function(){
      if(offlineCallback) offlineCallback();
    }
  },
  
}
