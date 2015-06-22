var messageStrings = {
    "defaultPopupTitle": chrome.i18n.getMessage("browserButtonTitle"),
    "noLoginPopupTitle": chrome.i18n.getMessage("errorMessageNoLogin"),
    "noUsernamePopupTitle": chrome.i18n.getMessage("errorMessageNoUsername"),
  };

chrome.runtime.onInstalled.addListener(function (details){
  if(details.reason === "install"){
    chrome.tabs.create({
      url: chrome.extension.getURL("options.html?install=true"),
      active: true
    },function(tab){
      console.log("First boot, opened settings to log in");
    });
    chrome.runtime.setUninstallURL("http://c306.net/apps#notrack");
  }
  
  if(details.reason === "update") console.log('previousVersion', details.previousVersion);
  
  // For testing only
  // if(details.reason === "update")
  //   chrome.tabs.create({
  //     url: chrome.extension.getURL("options.html"),
  //     active: true
  //   },function(tab){
  //     console.log("In testing, opened settings");
  //   });
  // End Testing
});


GMAIL.isLoggedIn(function(){
  // Already logged in... check API
  if(GMAIL.apiLoaded)
    // API already loaded... 
    setupPopup(true);
  else
    // Load API
    GMAIL.onAuth();
}, function(){
  // Not logged in... show on browser button, prompting to login
  setupPopup(false);
});


function setupPopup(loggedIn){
  if(loggedIn){
    if(localStorage.idtUsername && localStorage.idtUsername !== ""){
    // logged in, and username available
      chrome.browserAction.setTitle({title: messageStrings.defaultPopupTitle});
      chrome.browserAction.setBadgeText({text: ""});
      chrome.browserAction.setBadgeBackgroundColor({color: "#33ff33"});
      chrome.browserAction.setPopup({popup: "popup.html"});
    } else {
      // logged in, no username available
      chrome.browserAction.setTitle({title: messageStrings.noUsernamePopupTitle});
      chrome.browserAction.setBadgeText({text: "!"});
      chrome.browserAction.setBadgeBackgroundColor({color: "#ff3333"});
      chrome.browserAction.setPopup({popup: ""});
      chrome.browserAction.onClicked.addListener(function(){
        chrome.tabs.create({
          url: chrome.extension.getURL("options.html"),
          active: true
        },function(tab){
          console.log("No username provided, opened settings to log in");
        });
      });
    }
  } else {
    // not logged in
    chrome.browserAction.setTitle({title: messageStrings.noLoginPopupTitle});
    chrome.browserAction.setBadgeText({text: "!"});
    chrome.browserAction.setBadgeBackgroundColor({color: "#ff3333"});
    chrome.browserAction.setPopup({popup: ""});
    chrome.browserAction.onClicked.addListener(function(){
      chrome.tabs.create({
        url: chrome.extension.getURL("options.html"),
        active: true
      },function(tab){
        console.log("Not logged in, opened settings to log in");
      });
    });
  }
}
