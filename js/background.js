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


iDoneThis.isLoggedIn(function(){
  // Already logged in... 
  setupExtensionState(true);
  console.log("In bg: logged in");
}, function(){
  // Not logged in... show on browser button, prompting to login
  console.log("In bg: not logged in");
  setupExtensionState(false);
});


function setupExtensionState(loggedIn){
  chrome.browserAction.onClicked.removeListener(openOptions);
  chrome.omnibox.onInputEntered.removeListener(sendFromCommand);
  
  if(loggedIn){
    
    chrome.browserAction.setTitle({title: messageStrings.defaultPopupTitle});
    chrome.browserAction.setBadgeText({text: ""});
    chrome.browserAction.setBadgeBackgroundColor({color: "#33ff33"});
    chrome.browserAction.setPopup({popup: "popup.html"});
    chrome.omnibox.setDefaultSuggestion({
      description: chrome.i18n.getMessage("promptMessage")
    });
    chrome.omnibox.onInputEntered.addListener(sendFromCommand);
  
  } else {
    
    chrome.browserAction.setTitle({title: messageStrings.noLoginPopupTitle});
    chrome.browserAction.setBadgeText({text: "!"});
    chrome.browserAction.setBadgeBackgroundColor({color: "#ff3333"});
    chrome.browserAction.setPopup({popup: ""});
    chrome.browserAction.onClicked.addListener(openOptions);
    chrome.omnibox.setDefaultSuggestion({
      description: chrome.i18n.getMessage("noLoginMessage")
    });
  
  }
}


function openOptions(){
  chrome.tabs.create({
    url: chrome.extension.getURL("options.html"),
    active: true
  },function(tab){
    console.log("Not ready, so opened settings...");
  });
}


function sendFromCommand(text, disposition){
  // console.log("meant to be sending email, but I'm doing squat!");
  // console.log("Text would've been: " + text);
  // return;
  // 
  // iDoneThis.sendEmail({
  //   doneText: text,
  //   username: localStorage.idtUsername,
  //   team: localStorage.team || "team",
  //   from: localStorage.fromEmail,
  //   date: new Date().toDateString()
  // }, function(response){
  //   // Mailing successful
    
  //   chrome.notifications.create({
  //     type: "basic",
  //     iconUrl: chrome.extension.getURL("img/icon-128.png"),
  //     title: "Done.",
  //     message: "Sent to iDoneThis",
  //     contextMessage: text
  //   }, function(){});
  // }, function(reason){
  //   // Mailing unsuccessful
    
  //   chrome.notifications.create({
  //     type: "basic",
  //     iconUrl: chrome.extension.getURL("img/icon-128.png"),
  //     title: "Error!.",
  //     message: "'Done' not sent to iDoneThis",
  //     contextMessage: text
  //   }, function(){});
  // });
}
