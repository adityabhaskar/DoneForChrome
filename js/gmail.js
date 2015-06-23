// PocketStore Obj
var GMAIL = {
  
  apiLoaded: false,
  
  isLoggedIn: function(successCallback, failureCallback){
    chrome.identity.getAuthToken({"interactive": false}, function(token){
      if(token !== undefined){
        console.log("isLoggedIn returned true");
        localStorage.token = token;
        if(successCallback) successCallback();
      } else {
        console.log("Error in isLoggedIn: " + chrome.runtime.lastError.message);
        // console.log(chrome.runtime.lastError);
        GMAIL.initLogout(failureCallback);
      }
    });
  },
  
  initAuth: function(successCallback, failureCallback){
    console.log("in init auth");
    
    // check if already authenticated
    chrome.identity.getAuthToken({"interactive": false}, function(preToken){
      var err = chrome.runtime.lastError;
      if(err){
        // not authenticated yet
        console.log("error on unforced auth: ");
        console.log(err);
        // force interactive authentication
        chrome.identity.getAuthToken({"interactive": true}, function(interactiveToken){
          var err = chrome.runtime.lastError;
          if(err){
            console.log("error on forced auth: ");
            console.log(err);
            if(failureCallback) failureCallback();
          } else {
            console.log("forced getAuthToken returned with:");
            console.log(interactiveToken);
            localStorage.token = interactiveToken;
            GMAIL.onAuth(successCallback);
          }
        });
      } else {
        // already authenticated
        console.log("unforced getAuthToken returned with:");
        console.log(preToken);
        localStorage.token = preToken;
        GMAIL.onAuth(successCallback);
      }
    });
  },
  
  onAuth: function(callback){
    chrome.identity.getProfileUserInfo(function(userInfo){
      localStorage.fromEmail = userInfo.email;
      window.gapi_onload = GMAIL.loadLibrary;
      GMAIL.loadScript("https://apis.google.com/js/client.js", callback);
    });
  },
  
  loadLibrary: function(){
    gapi.client.load('gmail', 'v1', GMAIL.gmailAPILoaded);
  },
  
  gmailAPILoaded: function(){
    apiLoaded = true;
    setupExtensionState(true);
  },
  
  initLogout: function(callback){
    if(localStorage.token !== "" && localStorage.token !== undefined)
      chrome.identity.removeCachedAuthToken({
        "token": localStorage.token,
      }, function(){
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' + localStorage.token);
        xhr.send();
        xhr.onreadystatechange = function() {
          if(xhr.readyState == 4 && xhr.status == 200) {
            console.log(xhr.responseText);
            localStorage.removeItem("token");
            localStorage.removeItem("idtUsername");
            localStorage.removeItem("fromEmail");
            apiLoaded = false;
            console.log("token removed");
            if(callback) callback();
          }
        }
      });
    else{
      localStorage.removeItem("idtUsername");
      if(callback) callback();
    }
  },
  
  loadScript: function(url, callback){
    var request = new XMLHttpRequest();
    
    request.onreadystatechange = function(){
      if(request.readyState !== 4) {
        return;
      }
      
      if(request.status !== 200){
        return;
      }
      
      eval(request.responseText);
      if(callback) callback();
    };

    request.open('GET', url);
    request.send();
  },
  
  sendEmail: function(doneObj,successCallback,failureCallback){
    var originalMail = {
      "to": doneObj.username+"@"+doneObj.team+".idonethis.com",
      "subject": "I Done This on " + doneObj.date,
      "fromName": doneObj.username,
      "from": doneObj.fromEmail,
      "body": doneObj.doneText,
      "cids": [],
      "attaches" : []
    };
    var mimeTxt = Mime.toMimeTxt(originalMail);
    
    var base64EncodedEmail = btoa(mimeTxt).replace(/\+/g, '-').replace(/\//g, '_');
    
    gapi.auth.setToken({
      access_token: localStorage.token
    });
    var sendRequest = gapi.client.gmail.users.messages.send({
      'userId': 'me',
      'resource': {
        'raw': base64EncodedEmail
      }
    });
    sendRequest.then(successCallback,failureCallback);
    //  function(a){
    //   console.log("Inside send callback");
    //   console.log(a);
    //   console.log(chrome.runtime.lastError);
    // });
  }
};
