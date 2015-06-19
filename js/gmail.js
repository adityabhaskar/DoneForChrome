// PocketStore Obj
var GMAIL = {
  
  apiLoaded: false,
  
  isLoggedIn: function(successCallback, failureCallback){
    chrome.identity.getAuthToken({"interactive": false}, function(token){
      if(token !== undefined){
        console.log("isLoggedIn returned true");
        localStorage["token"] = token;
        if(successCallback) successCallback();
      } else {
        console.log("Error in isLoggedIn: ");
        console.log(chrome.runtime.lastError);
        GMAIL.initLogout(failureCallback);
      }
    });
  },
  
  initAuth: function(){
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
          } else {
            console.log("forced getAuthToken returned with:");
            console.log(interactiveToken);
            localStorage["token"] = interactiveToken;
            GMAIL.onAuth();
          }
        });
      } else {
        // already authenticated
        console.log("unforced getAuthToken returned with:");
        console.log(preToken);
        localStorage["token"] = preToken;
        GMAIL.onAuth();
      }
    });
  },

  onAuth: function(){
    window.gapi_onload = GMAIL.loadLibrary;
    GMAIL.loadScript("https://apis.google.com/js/client.js");
  },
  
  loadLibrary: function(){
    gapi.client.load('gmail', 'v1', GMAIL.gmailAPILoaded);
  },
  
  gmailAPILoaded: function(){
    apiLoaded = true;
    setupPopup(true);
  },
  
  initLogout: function(callback){
    chrome.identity.removeCachedAuthToken({
      "token": localStorage["token"],
    }, function(){
      localStorage.removeItem("token");
      apiLoaded = false;
      console.log("token removed");
      if(callback) callback();
    });
  },
  
  loadScript: function(url){
    var request = new XMLHttpRequest();
    
    request.onreadystatechange = function(){
      if(request.readyState !== 4) {
        return;
      }
      
      if(request.status !== 200){
        return;
      }
      
      eval(request.responseText);
    };

    request.open('GET', url);
    request.send();
  },
  
  sendEmail: function(doneText,successCallback,failureCallback){
    var originalMail = {
      // "to": "username@teamname.idonethis.com",
      "to": "adityabhaskar@personal.idonethis.com",
      "subject": "I Done This",
      "fromName": "AB",
      "from": "adityabhaskar@gmail.com",
      "body": doneText,
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
