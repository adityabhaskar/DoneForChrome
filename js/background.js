var messageStrings = {
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
  "shortName": chrome.i18n.getMessage("shortName"),
  "zeroDoneBadgeText": chrome.i18n.getMessage("zeroDoneBadgeText"),
  "zeroDoneBadgeTitle": chrome.i18n.getMessage("zeroDoneBadgeTitle"),
  "nonZeroDoneBadgeTitle": chrome.i18n.getMessage("nonZeroDoneBadgeTitle"),
};
  
var dateFormattingStrings = [
  [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
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
  
localStorage.doneFrequency = localStorage.doneFrequency || 15;
localStorage.dailyNotification = localStorage.dailyNotification || "true";
localStorage.dailyNotificationTime = localStorage.dailyNotificationTime || "19:00";
localStorage.showCountOnBadge = localStorage.showCountOnBadge || "true";
localStorage.showDoneForAndroidNotification = localStorage.showDoneForAndroidNotification || "true";

chrome.runtime.onInstalled.addListener(function (details){
  /* Disabled for end of line update */
  // if(details.reason === "install"){
  //   chrome.tabs.create({
  //     url: chrome.extension.getURL("options.html?install=true"),
  //     active: true
  //   },function(tab){
  //     console.log("First boot, opened settings to log in");
  //   });
  // }
  
  if(details.reason === "update"){
    console.log('previousVersion', details.previousVersion);
    // if loggedIn, update teams
    if(localStorage.username && localStorage.username!=="")
      iDoneThis.getTeams();
    
    /* Disabled for end of line update */
    // Show notification if not previously clicked on, or dismissed
    // if(localStorage.showDoneForAndroidNotification !== "false"){
    //   showNotification({
    //     title: "Done! for Android",
    //     message: "Android app for Done!, for iDoneThis users. Get it now!",
    //     id: DONE_FOR_ANDROID_NOTIFICATION_ID,
    //     // clearDelay: 10,
    //     icon: DONE_FOR_ANDROID_NOTIFICATION_ICON_URL,
    //     buttons: [
    //       {title: "Get it now!", iconUrl: "img/google_play_128.png"},
    //     ],
    //     requireInteraction: true,
    //   });
    // }
  }
  
  if(details.reason !== "chrome_update"){
    chrome.runtime.setUninstallURL(UNINSTALL_URL);
    chrome.tabs.create({"url": "http://goo.gl/WXoVmz"});
  }
  
  // For options dev/testing only
  // if(details.reason === "update")
  //   chrome.runtime.openOptionsPage();
  // End Testing
});


iDoneThis.isLoggedIn(false, function(status){
  if(status !== true){
    // If not logged in at startup
    console.log("In bg: not logged in");
    
    // Show on browser button, prompting to login
    setupExtensionState(false);
  } else {
    
    // If logged in at startup
    console.log("In bg: logged in");
    
    // Show on browser button
    setupExtensionState(true);
    
    // Update teams
    iDoneThis.getTeams();
    iDoneThis.getDones();
    
    // If online, and there are offline dones to sync, start offlineSync
    if(navigator.onLine && localStorage.offlineDones === "true")
      iDoneThis.syncOfflineList(function(status){
        if(status === true){
          // cancel alarm if successful
          clearConnectionCheckerAlarm();
        } else {
          createConnectionCheckerAlarm();
        }
      });
    
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
  }
});

// Setup listener for omnibox input
chrome.omnibox.onInputEntered.addListener(sendFromCommand);

// On alarm, check for changes in teams - added/removed, etc.
chrome.alarms.onAlarm.addListener(alarmHandler);


chrome.notifications.onClicked.addListener(notificationClickHandler);

chrome.notifications.onButtonClicked.addListener(notificationButtonClickHandler);

chrome.notifications.onClosed.addListener(function(id, byUser){
  if(byUser)
    localStorage.showDoneForAndroidNotification = "false";
});

window.addEventListener("online", function(e){
  console.log("we are ONLINE, syncing offline items");
  if(navigator.onLine && localStorage.offlineDones === "true"){
    console.log("from window.online");
    iDoneThis.checkConnection(function(status){
      if(status === true)
        iDoneThis.syncOfflineList(function(status){
          if(status === true) clearConnectionCheckerAlarm();
          else createConnectionCheckerAlarm();
        });
    });
  }
}, false);


function setupExtensionState(loggedIn){
  chrome.browserAction.onClicked.removeListener(openOptions);
  // chrome.omnibox.onInputEntered.removeListener(sendFromCommand);
  
  if(loggedIn){
    
    chrome.browserAction.setTitle({title: messageStrings.shortName});
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
  iDoneThis.isLoggedIn(false, function(loggedIn){
    
    if(loggedIn !== true){
      // If not logged in... show notification
      showNotification({
        title: messageStrings.loginRequiredNotificationTitle,
        message: messageStrings.loginRequiredNotificationMessage,
        clearDelay: 5
      });
    
    } else {
      
      // If logged in, send command
      iDoneThis.newDone({
        raw_text: text,
        team: localStorage.defaultTeamCode,
        done_date: yyyymmdd(new Date())
        // date: new Date().toDateString()
      }, function(status){
        if(status === true)
          // Added successfully, show notification
          showNotification({
            iconUrl: NOTIFICATION_ICON_URL,
            title: messageStrings.doneNotificationMessage,
            message: text,
          });
        else if(status === false)
          // Adding unsuccessful, Show notification
          showNotification({
            title: messageStrings.errorNotificationTitle,
            message: text,
            contextMessage: messageStrings.errorNotificationMessage,
            clearDelay: 5
          });
        else if(status === "offline"){
          // Saved offline, Show notification & start/reset timer
          createConnectionCheckerAlarm();
          showNotification({
            id: NEW_DONE_NOTIFICATION,
            title: messageStrings.offlineSavedNotificationTitle,
            message: text,
            contextMessage: messageStrings.offlineSavedNotificationMessage,
            clearDelay: 3
          });
        }
      });
    }
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
      console.log("in teamChecker alarm");
      iDoneThis.getTeams();
      break;
    
    case DAILY_NOTIFICATION_ALARM:
      console.log("in daily notification alarm");
      ls.get(["dones", "offlineList"], function(st){
        var today = new Date();
        // var totalDones = st ? ((st.dones && st.dones.length > 0 ? st.dones.length : 0) + (st.offlineList && st.offlineList.length > 0 ? st.offlineList.length : 0)) : 0;
        var totalDones = 0;
        if(st && st.dones && st.dones.length > 0){
          for (var i = 0; i < st.dones.length; i++) {
            if(st.dones[i].goal_completed === true)
              totalDones++;
          }
        }
        if(st && st.offlineList && st.offlineList.length > 0){
          for (var i = 0; i < st.offlineList.length; i++) {
            if(/^\[\] /i.test(st.offlineList[i].raw_text) === true)
              totalDones++;
          }
        }
        var contextMsg = messageStrings.dailyReminderNotificationMessage.replace("#number", (totalDones > 0 ? totalDones : "No") + " task" + (totalDones !== 1 ? "s" : ""));
        var msg = messageStrings.dailyReminderNotificationTitle + " " + dateFormattingStrings[0][today.getUTCDay()] + ", " + today.getDate() + " " + dateFormattingStrings[1][today.getMonth()];
        
        showNotification({
          id: DAILY_NOTIFICATION_ID,
          message: msg,
          contextMessage: contextMsg,
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
        iDoneThis.syncOfflineList(function(status){
          // cancel alarm if successful
          if(status === true)
            clearConnectionCheckerAlarm();
        });
      break;
    
    case CONNECTION_CHECKER_ALARM:
      console.log("in connectionCheckerAlarm");
      iDoneThis.checkConnection(function(status){
        if(status === true)
          iDoneThis.syncOfflineList(function(status){
            // cancel alarm if successful
            if(status === true)
              clearConnectionCheckerAlarm();
            else
              createConnectionCheckerAlarm();
          });
        else
          createConnectionCheckerAlarm();
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
  var alarmPeriod = Math.round(Math.random()*4) + 1;
  chrome.alarms.create(CONNECTION_CHECKER_ALARM, {
    periodInMinutes: alarmPeriod // check reconnection in 1-5 mins
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
    title: notif.title || "",
    message: notif.message,
    contextMessage: notif.contextMessage || "",
    requireInteraction: notif.requireInteraction || false,
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
  switch(id){
    
    case DAILY_NOTIFICATION_ID:
      chrome.windows.create({
        url: "popup.html#popout",
        width: 400,
        height: 400,
        focused: true,
        type: "popup",
        state: "docked"
      });
      break;
    
    case DONE_FOR_ANDROID_NOTIFICATION_ID:
      openDoneForAndroidTab(id);
      break;
    
    default:
      console.log("Unidentified notification: ", id);
  }
}

function openDoneForAndroidTab(id){
  chrome.tabs.create({
    url: DONE_FOR_ANDROID_URL,
    active: true
  });
  chrome.notifications.clear(id);
  localStorage.showDoneForAndroidNotification = "false";
}

function notificationButtonClickHandler(notificationId, buttonIndex){
  console.log("buttonIndex: ", buttonIndex);
  if(notificationId == DONE_FOR_ANDROID_NOTIFICATION_ID && buttonIndex == 0){
    openDoneForAndroidTab(notificationId);
  }
}


function updateBadgeText(){
  if(localStorage.showCountOnBadge === "true")
    ls.get(["dones", "offlineList"], function(st){
      var totalDones = st ? ((st.dones && st.dones.length > 0 ? st.dones.length : 0) + (st.offlineList && st.offlineList.length > 0 ? st.offlineList.length : 0)) : 0;
      if(totalDones > 0){
        chrome.browserAction.setBadgeText({text: totalDones.toLocaleString()});
        chrome.browserAction.setTitle({title: totalDones.toLocaleString() + messageStrings.nonZeroDoneBadgeTitle});
        chrome.browserAction.setBadgeBackgroundColor({color: BUTTON_GREEN});
      } else {
        chrome.browserAction.setBadgeText({text: messageStrings.zeroDoneBadgeText});
        chrome.browserAction.setTitle({title: messageStrings.zeroDoneBadgeTitle});
        chrome.browserAction.setBadgeBackgroundColor({color: BUTTON_GREY});
      }
    });
  else {
    chrome.browserAction.setBadgeText({text: ""});
    chrome.browserAction.setTitle({title: messageStrings.shortName});
  }
}


function saveInput(input) {
  if(input !== "")
    ls.set({"inputText": input});
}
