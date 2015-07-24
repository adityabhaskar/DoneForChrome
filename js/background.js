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
    "offlineSavedNotificationTitle": chrome.i18n.getMessage("offlineSavedNotificationTitle"),
    "offlineSavedNotificationMessage": chrome.i18n.getMessage("offlineSavedNotificationMessage"),
    "loginRequiredNotificationTitle": chrome.i18n.getMessage("loginRequiredNotificationTitle"),
    "loginRequiredNotificationMessage": chrome.i18n.getMessage("loginRequiredNotificationMessage"),
    "syncedNotificationMessage": chrome.i18n.getMessage("syncedNotificationMessage"),
  };

var UNINSTALL_URL = "http://c306.net/whygo.html?src=qdt";
var NOTIFICATION_ICON_URL = chrome.extension.getURL("img/done-128.png");
var BUTTON_GREEN = "#33ff33";
var BUTTON_RED = "#ff3333";
var TEAM_CHECKER_ALARM = "teamChecker";
var CONNECTION_CHECKER_ALARM = "connectionChecker";
var DONE_CHECKER_ALARM = "doneChecker";
var DONE_FREQUENCY = 15; // minutes. If zero, no alarm

chrome.runtime.onInstalled.addListener(function (details){
  if(details.reason === "install"){
    chrome.tabs.create({
      url: chrome.extension.getURL("options.html?install=true"),
      active: true
    },function(tab){
      console.log("First boot, opened settings to log in");
    });
    chrome.runtime.setUninstallURL(UNINSTALL_URL);
    localStorage.doneFrequency = DONE_FREQUENCY;
  }
  
  if(details.reason === "update"){
    console.log('previousVersion', details.previousVersion);
    // if loggedIn, update teams
    if(localStorage.username && localStorage.username!=="")
      iDoneThis.getTeams();
    if(details.previousVersion < "0.0.6.3")
      localStorage.doneFrequency = DONE_FREQUENCY;
  } 
  
  // For options dev/testing only
  // if(details.reason === "update")
  //   chrome.runtime.openOptionsPage();
  // End Testing
});


iDoneThis.isLoggedIn(false, function(){
  // If logged in at startup
  console.log("In bg: logged in");
  
  // Show on browser button
  setupExtensionState(true);
  
  // Update teams
  iDoneThis.getTeams();
  iDoneThis.getDones();
  
  // If online, and there are offline dones to sync, start offlineSync
  if(navigator.onLine && localStorage.offlineDones === "true")
    iDoneThis.syncOfflineList(function(){
      // cancel alarm if successful
      clearConnectionCheckerAlarm();
    }, createConnectionCheckerAlarm, createConnectionCheckerAlarm);
  
    
  // Start done-checker alarm
  if(localStorage.doneFrequency > 0)
    chrome.alarms.create(DONE_CHECKER_ALARM, {
      periodInMinutes: parseInt(localStorage.doneFrequency)
    });
    
  // Start once-a-day team-checker alarm
  chrome.alarms.create(TEAM_CHECKER_ALARM, {
    periodInMinutes: 1440
  });
}, function(){
  // If not logged in at startup
  console.log("In bg: not logged in");
  
  // Show on browser button, prompting to login
  setupExtensionState(false);
});

// Setup listener for omnibox input
chrome.omnibox.onInputEntered.addListener(sendFromCommand);

// On alarm, check for changes in teams - added/removed, etc.
chrome.alarms.onAlarm.addListener(alarmHandler);


window.addEventListener("online", function(e){
  console.log("we are ONLINE, syncing offline items");
  if(navigator.onLine && localStorage.offlineDones === "true"){
    iDoneThis.checkConnection(function(){
      clearConnectionCheckerAlarm(function(){
        iDoneThis.syncOfflineList(false, createConnectionCheckerAlarm, createConnectionCheckerAlarm);
      });
    });
  }
}, false);


function setupExtensionState(loggedIn){
  chrome.browserAction.onClicked.removeListener(openOptions);
  // chrome.omnibox.onInputEntered.removeListener(sendFromCommand);
  
  if(loggedIn){
    
    chrome.browserAction.setTitle({title: messageStrings.defaultPopupTitle});
    chrome.browserAction.setBadgeText({text: ""});
    chrome.browserAction.setBadgeBackgroundColor({color: BUTTON_GREEN});
    chrome.browserAction.setPopup({popup: "popup.html"});
    chrome.omnibox.setDefaultSuggestion({
      description: messageStrings.promptMessage
    });
    // chrome.omnibox.onInputEntered.addListener(sendFromCommand);
  
  } else {
    
    chrome.browserAction.setTitle({title: messageStrings.noLoginPopupTitle});
    chrome.browserAction.setBadgeText({text: "!"});
    chrome.browserAction.setBadgeBackgroundColor({color: BUTTON_RED});
    chrome.browserAction.setPopup({popup: ""});
    chrome.browserAction.onClicked.addListener(openOptions);
    chrome.omnibox.setDefaultSuggestion({
      description: messageStrings.noLoginMessage
    });
    
  }
}


function sendFromCommand(text, disposition){
  iDoneThis.isLoggedIn(false, function(){
    // If logged in, send command
    
    iDoneThis.newDone(
      {
        raw_text: text,
        team: localStorage.defaultTeamCode,
        done_date: yyyymmdd(new Date())
        // date: new Date().toDateString()
      }, 
      function(response){
        // Mailing successful, show notification
        showNotification({
          iconUrl: NOTIFICATION_ICON_URL,
          title: messageStrings.doneNotificationMessage,
          message: text,
        });
      }, 
      function(reason){
        // Mailing unsuccessful, Show notification
        showNotification({
          title: messageStrings.errorNotificationTitle,
          message: text,
          contextMessage: messageStrings.errorNotificationMessage,
          clearDelay: 5
        });
      }, 
      function(){
        // Saved offline, Show notification & start/reset timer
        createConnectionCheckerAlarm();
        
        showNotification({
          title: messageStrings.offlineSavedNotificationTitle,
          message: text,
          contextMessage: messageStrings.offlineSavedNotificationMessage,
          clearDelay: 3
        });
      }
    );
  }, function(){
    // If not logged in... show notification
    // change notification text to indicate 'Login required'
    showNotification({
      title: messageStrings.loginRequiredNotificationTitle,
      // message: text,
      message: messageStrings.loginRequiredNotificationMessage,
      clearDelay: 5
    });
  });
}


function openOptions(){
  chrome.runtime.openOptionsPage();
}


/**
 * showNotification
 * Displays a chrome.notification for the extension with click through URLs and event tracking 
 * @param {object} notif Object with details of notification - title, message, context, iconType
 * @return {null} null
 */
function showNotification(notif){
  chrome.notifications.create("", {
    type: "basic",
    iconUrl: notif.icon ? notif.icon : NOTIFICATION_ICON_URL,
    title: notif.title,
    message: notif.message,
    contextMessage: notif.contextMessage ? notif.contextMessage : "",
    // isClickable: false,
  }, function(id){
    chrome.alarms.create(id, {
      delayInMinutes: notif.clearDelay ? notif.clearDelay : 1
    });
  });
}


/**
 * alarmHandler
 * Handler for alarm events - for getTeams alarms, fetches teams, for all other alarms, clears notifications
 * @param {Param-Type} Param-Name Param-description
 * @return {Return-Type} Return-description
 */
function alarmHandler(alarm){
  switch(alarm.name){
    
    case TEAM_CHECKER_ALARM:
      iDoneThis.getTeams();
      break;
    
    case DONE_CHECKER_ALARM:
      console.log("getting dones, from alarm");
      iDoneThis.getDones();
      break;
    
    case CONNECTION_CHECKER_ALARM:
      iDoneThis.checkConnection(function(){
        iDoneThis.syncOfflineList(function(){
          // cancel alarm if successful
          clearConnectionCheckerAlarm();
        });
      });
      break;
    
    default:
      // it's a notification
      chrome.notifications.clear(alarm.name, function(){});
  }
}


function yyyymmdd(date){
  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
  var dd  = date.getDate().toString();
  return yyyy + "-" + (mm[1]?mm:"0"+mm[0]) + "-" +  (dd[1]?dd:"0"+dd[0]); // padding
}


function createConnectionCheckerAlarm(){
  chrome.alarms.create(CONNECTION_CHECKER_ALARM, {
    periodInMinutes: Math.round(Math.random()*5) // check reconnection in 0-5 mins
  });
}


function clearConnectionCheckerAlarm(callback){
  chrome.alarms.clear(CONNECTION_CHECKER_ALARM, callback);
  showNotification({
    title: messageStrings.doneNotificationTitle,
    message: messageStrings.syncedNotificationMessage
  });
}


