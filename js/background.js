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
  "dailyReminderNotificationTitle": chrome.i18n.getMessage("dailyReminderNotificationTitle"),
  "dailyReminderNotificationMessage": chrome.i18n.getMessage("dailyReminderNotificationMessage"),
};
  
var dateFormattingStrings = [
  [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ],
  [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ]
];
  
var UNINSTALL_URL = "http://c306.net/whygo.html?src=qdt";
var NOTIFICATION_ICON_URL = chrome.extension.getURL("img/done-128.png");
var BUTTON_GREEN = "#33ff33";
var BUTTON_RED = "#ff3333";
var TEAM_CHECKER_ALARM = "teamChecker";
var CONNECTION_CHECKER_ALARM = "connectionChecker";
var DONE_CHECKER_ALARM = "doneChecker";
var OFFLINE_SYNC_ALARM = "offlineSyncer";
var OFFLINE_SYNC_FREQUENCY = 15;
var DAILY_NOTIFICATION_ALARM = "dailyNotificationAlarm";
var DAILY_NOTIFICATION_ID = "dailyNotification";

localStorage.doneFrequency = localStorage.doneFrequency || 15;
localStorage.dailyNotification = localStorage.dailyNotification || "true";
localStorage.dailyNotificationTime = localStorage.dailyNotificationTime || "19:00";

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
  
  if(details.reason === "update"){
    console.log('previousVersion', details.previousVersion);
    // if loggedIn, update teams
    if(localStorage.username && localStorage.username!=="")
      iDoneThis.getTeams();
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
    
  // Start offline-sync alarm
  chrome.alarms.create(OFFLINE_SYNC_ALARM, {
    periodInMinutes: parseInt(OFFLINE_SYNC_FREQUENCY)
  });
    
  // Start daily notification alarm
  if(localStorage.dailyNotification === "true"){
    var alarmTime = Date.parse(new Date().toDateString() + " " + localStorage.dailyNotificationTime);
    if((new Date()) > alarmTime)
      alarmTime += 24*60*60*1000;
    
    chrome.alarms.create(DAILY_NOTIFICATION_ALARM, {
      when: alarmTime,
      periodInMinutes: 24*60
    });
  }
    
  // Start once-a-day team-checker alarm
  chrome.alarms.create(TEAM_CHECKER_ALARM, {
    periodInMinutes: 24*60
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


chrome.notifications.onClicked.addListener(notificationClickHandler);


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
        // Added successfully, show notification
        showNotification({
          iconUrl: NOTIFICATION_ICON_URL,
          title: messageStrings.doneNotificationMessage,
          message: text,
        });
      }, 
      function(reason){
        // Adding unsuccessful, Show notification
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
    
    case DAILY_NOTIFICATION_ALARM:
      // iDoneThis.getTeams();
      ls.get("dones", function(st){
        var today = new Date();
        var contextMsg = messageStrings.dailyReminderNotificationMessage.replace("#number", (st.dones.length > 0 ? st.dones.length : "No") + " done" + (st.dones.length !== 1 ? "s" : ""));
        var msg = messageStrings.dailyReminderNotificationTitle + " " + dateFormattingStrings[0][today.getUTCDay()-1] + ", " + today.getDate() + " " + dateFormattingStrings[1][today.getUTCDay()-1];
        
        showNotification({
          id: DAILY_NOTIFICATION_ID,
          message: msg,
          contextMessage: contextMsg,
          // buttons: [{
          //   title: "Log iDoneThis",
          // }]
        });
      });
      break;
    
    case DONE_CHECKER_ALARM:
      console.log("getting dones, from alarm");
      iDoneThis.getDones();
      break;
    
    case OFFLINE_SYNC_ALARM:
      console.log("syncing any offline tasks");
      if(localStorage.offlineDones === "true")
        iDoneThis.syncOfflineList(function(){
          // cancel alarm if successful
          clearConnectionCheckerAlarm();        
        });
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


/**
 * showNotification
 * Displays a chrome.notification for the extension with click through URLs and event tracking 
 * @param {object} notif Object with details of notification - title, message, context, iconType
 * @return {null} null
 */
function showNotification(notif){
  var options = {
    type: notif.type || "basic",
    iconUrl: notif.icon || NOTIFICATION_ICON_URL,
    // title: notif.title || chrome.i18n.getMessage("shortName"),
    title: notif.title || "",
    message: notif.message,
    contextMessage: notif.contextMessage || "",
    // isClickable: false,
  };
  if(notif.buttons)
    options.buttons = notif.buttons;
  
  chrome.notifications.create(notif.id || "", options, function(id){
    if(id !== DAILY_NOTIFICATION_ID)
      chrome.alarms.create(id, {
        delayInMinutes: notif.clearDelay ? notif.clearDelay : 1
      });
  });
}


function notificationClickHandler(id){
  if(id === DAILY_NOTIFICATION_ID){
    // open popup
    chrome.windows.create({
      url: "popup.html",
      width: 400,
      height: 250,
      focused: true,
      type: "popup",
      state: "docked"
    });
  }
}
