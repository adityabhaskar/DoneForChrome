var messageStrings = {
    "defaultPopupTitle": chrome.i18n.getMessage("browserButtonTitle"),
    "noLoginPopupTitle": chrome.i18n.getMessage("errorMessageNoLogin"),
    "noUsernamePopupTitle": chrome.i18n.getMessage("errorMessageNoUsername"),
    "doneNotificationTitle": chrome.i18n.getMessage("doneNotificationTitle"),
    "doneNotificationMessage": chrome.i18n.getMessage("doneNotificationMessage"),
    "errorNotificationTitle": chrome.i18n.getMessage("errorNotificationTitle"),
    "errorNotificationMessage": chrome.i18n.getMessage("errorNotificationMessage"),
    "promptMessage": chrome.i18n.getMessage("promptMessage"),
    "noLoginMessage": chrome.i18n.getMessage("noLoginMessage"),
  };

var UNINSTALL_URL = "http://c306.net/apps#notrack";
var NOTIFICATION_ICON_URL = chrome.extension.getURL("img/icon-128.png");
var BUTTON_GREEN = "#33ff33";
var BUTTON_RED = "#ff3333";

chrome.runtime.onInstalled.addListener(function (details){
  if(details.reason === "install"){
    chrome.tabs.create({
      url: chrome.extension.getURL("options.html?install=true"),
      active: true
    },function(tab){
      console.log("First boot, opened settings to log in");
    });
    chrome.runtime.setUninstallURL(UNINSTALL_URL);
  }
  
  if(details.reason === "update") console.log('previousVersion', details.previousVersion);
  
  // For testing only
  if(details.reason === "update")
    chrome.tabs.create({
      url: chrome.extension.getURL("options.html"),
      active: true
    },function(tab){
      console.log("In testing, opened settings");
    });
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
    chrome.browserAction.setBadgeBackgroundColor({color: BUTTON_GREEN});
    chrome.browserAction.setPopup({popup: "popup.html"});
    chrome.omnibox.setDefaultSuggestion({
      description: messageStrings.promptMessage
      // description: chrome.i18n.getMessage("promptMessage")
    });
    chrome.omnibox.onInputEntered.addListener(sendFromCommand);
  
  } else {
    
    chrome.browserAction.setTitle({title: messageStrings.noLoginPopupTitle});
    chrome.browserAction.setBadgeText({text: "!"});
    chrome.browserAction.setBadgeBackgroundColor({color: BUTTON_RED});
    chrome.browserAction.setPopup({popup: ""});
    chrome.browserAction.onClicked.addListener(openOptions);
    chrome.omnibox.setDefaultSuggestion({
      description: messageStrings.noLoginMessage
      // description: chrome.i18n.getMessage("noLoginMessage")
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
  iDoneThis.newDone({
    raw_text: text,
    team: localStorage.defaultTeamCode,
    // date: new Date().toDateString()
  }, function(response){
    // Mailing successful
    
    chrome.notifications.create({
      type: "basic",
      iconUrl: NOTIFICATION_ICON_URL,
      title: messageStrings.doneNotificationTitle,
      message: messageStrings.doneNotificationMessage,
      contextMessage: text
    }, function(){});
    
  }, function(reason){
    // Mailing unsuccessful
    
    chrome.notifications.create({
      type: "basic",
      iconUrl: NOTIFICATION_ICON_URL,
      title: messageStrings.errorNotificationTitle,
      message: messageStrings.errorNotificationMessage,
      contextMessage: text
    }, function(){});
  });
}
