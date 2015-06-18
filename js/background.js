
chrome.runtime.onInstalled.addListener(function (details){
  console.log('previousVersion', details.previousVersion);
});

// chrome.browserAction.setBadgeText({text: '\'Allo'});


function initAuth(){
  console.log("in init auth");
  
  chrome.identity.getAuthToken({"interactive": false}, function(a){
    //load Google's javascript client libraries
    var err = chrome.runtime.lastError;
    if(err){
      console.log("error on unforced auth: ");
      console.log(err);
      chrome.identity.getAuthToken({"interactive": true}, function(a){
        var err = chrome.runtime.lastError;
        if(err){
          console.log("error on forced auth: ");
          console.log(err);
        } else {
          console.log("forced getAuthToken returned with:");
          console.log(a);
          localStorage["token"] = a;
          onAuth();
        }
      });
    } else {
      console.log("unforced getAuthToken returned with:");
      console.log(a);
      localStorage["token"] = a;
      onAuth();
    }
  });
}

function onAuth(){
  window.gapi_onload = loadLibrary;
  loadScript("https://apis.google.com/js/client.js");
}

function loadLibrary(){
  gapi.client.load('gmail', 'v1', gmailAPILoaded);
  return;
}

function gmailAPILoaded(){
  var originalMail = {
    // "to": "username@teamname.idonethis.com",
    "to": "adityabhaskar@personal.idonethis.com",
    "subject": "I Done This",
    "fromName": "AB",
    "from": "adityabhaskar@gmail.com",
    "body": "Sending this to personal",
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
  sendRequest.execute(function(a){
    console.log("Inside send callback");
    console.log(a);
    console.log(chrome.runtime.lastError);
  });
}


function initLogout(){
  chrome.identity.removeCachedAuthToken({
    "token": localStorage["token"]
  }, function(){
    console.log("token removed");
  });
}



function loadScript(url){
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
}

