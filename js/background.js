
chrome.runtime.onInstalled.addListener(function (details){
  console.log('previousVersion', details.previousVersion);
});

chrome.browserAction.setBadgeText({text: '\'Allo'});

console.log('\'Allo \'Allo! Event Page for Browser Action');


/*

//oauth2 auth
chrome.identity.getAuthToken(
  {'interactive': true},
  function(){
    //load Google's javascript client libraries
    window.gapi_onload = authorize;
    loadScript('https://apis.google.com/js/client.js');
  }
);

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

function authorize(){
  gapi.auth.authorize(
    {
      client_id: '468423474195-osak9tu4ud0466hu2nbqscc6r4gfi0c3.apps.googleusercontent.com',
      immediate: true,
      scope: 'https://www.googleapis.com/auth/gmail.modify'
    },
    function(){
      gapi.client.load('gmail', 'v1', gmailAPILoaded);
    }
  );
}

function gmailAPILoaded(){
    //do stuff here
}


*/
