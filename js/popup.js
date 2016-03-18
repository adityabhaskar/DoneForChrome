var bgPage = chrome.extension.getBackgroundPage();

var CONNECTION_CHECKER_ALARM = "connectionChecker";
var SUCCESS_DELAY = 2000;
var FAILURE_DELAY = 3000;
var INPUT_DELAY = 1000;
var DATE_REGEX = /^((?:(\d{4})(-?)(?:(?:(0[13578]|1[02]))(-?)(0[1-9]|[12]\d|3[01])|(0[13456789]|1[012])(-?)(0[1-9]|[12]\d|30)|(02)(-?)(0[1-9]|1\d|2[0-8])))|([02468][048]|[13579][26])(-?)(0229)) /;
// /^(?:((?:(\d{4})(-?)(?:(?:(0[13578]|1[02]))(-?)(0[1-9]|[12]\d|3[01])|(0[13456789]|1[012])(-?)(0[1-9]|[12]\d|30)|(02)(-?)(0[1-9]|1\d|2[0-8])))|([02468][048]|[13579][26])(-?)(02)(29))|(yesterday)|(tomorrow)) /;


var messageStrings = {
  offline_saved_status_text: chrome.i18n.getMessage("offline_saved_status_text"),
  default_status_text: chrome.i18n.getMessage("default_status_text"),
  loginerror_status_text: chrome.i18n.getMessage("loginerror_status_text"),
  sending_status_text: chrome.i18n.getMessage("sending_status_text"),
  sent_status_text: chrome.i18n.getMessage("sent_status_text"),
  error_status_title: chrome.i18n.getMessage("error_status_title"),
  error_default_text: chrome.i18n.getMessage("error_default_text"),
  change_team_link_text: chrome.i18n.getMessage("change_team_link_text"),
  cancel_change_team_link_text: chrome.i18n.getMessage("cancel_change_team_link_text"),
}

var sendVisible = 0;
var defaultInputText = "";
var dateStr = {
  today: yyyymmdd(new Date()),
  yesterday: yyyymmdd(new Date(Date.now() - 24*3600*1000)),
  tomorrow: yyyymmdd(new Date(Date.now() + 24*3600*1000)),
};
var selectedDate = {
  string: "Today",
  code: dateStr.today
};
var selectedTeam = {
  string: localStorage.defaultTeam,
  code: localStorage.defaultTeamCode
};
var teamCount = localStorage.teamCount;

$(document).ready(function(){
  
  if(location.hash === "#popout")
    $("#openExternal").hide();
  
  // 1. Populate select list with team names
  // 2. Set input states - disabled/enabled - if not logged in
  ls.get(["teams", "inputText"], function(st){
    if(st && st.teams && st.teams.length > 0){
      var teamSelect = $("#teamSelect");
      var o;
      for (var i = 0; i < st.teams.length; i++) {
        o = new Option(st.teams[i].name, st.teams[i].short_name);
        if(st.teams[i].short_name === localStorage.defaultTeamCode) o.selected = true;
        teamSelect.append(o);
      }
      
      if(teamCount < 2){
        $("#selectedTeam").removeClass("specialUnderline");
      }
    }
    
    if(st && st.inputText)
      defaultInputText = st.inputText;
    
    bgPage.iDoneThis.isLoggedIn(false, textDefault);
  });
  
  
  // populate dones list
  updateDoneList();
  $("#doneListTitle").text("No dones completed today. Get cracking!");
  bgPage.iDoneThis.getDones(null, updateDoneList);
  
  
  // Handler for clicking change team link
  $("#selectedTeam").on("click", function(){
    if(teamCount < 2) return;
    var show = $("#teamSelectorDiv").css("display") === "none";
    showSend(show, function(){
      if(show === true){
        $("#teamSelectorDiv").show();
        $("#teamSelect").focus();
      } else {
        $("#teamSelectorDiv").hide();
      }
    });
  });
  $("#hide_team_span").on("click", function(){
    showSend(false, function(){
      $("#teamSelectorDiv").hide();
    });
  });
  // Handler for team selector
  $("#teamSelect").on("change", function(){
    // change selected team
    selectedTeam.string = $("#teamSelect option:selected").text();
    selectedTeam.code = this.value;
    $("#selectedTeam").text(selectedTeam.string);
  });
  
  
  // Handler for clicking change date link
  $("#selectedDate").on("click", function(){
    var show = $("#dateSelectorDiv").css("display") === "none";
    showSend(show, function(){
      if(show === true){
        $("#dateSelectorDiv").show();
        $("#done_date").focus();
      } else {
        $("#dateSelectorDiv").hide();
      }
    });
  });
  $("#hide_date_span").on("click", function(){
    showSend(false, function(){
      $("#dateSelectorDiv").hide();
    });
  });
  // Handler for date selector
  $("#done_date").on("change", function(){
    // Convert selected Date to local string or text
    selectedDate.code = this.value;
    switch(this.value){
      case dateStr.today:
        selectedDate.string = "Today";
        $("#on_required").hide();
        break;
      case dateStr.tomorrow:
        selectedDate.string = "Tomorrow";
        $("#on_required").hide();
        break;
      case dateStr.yesterday:
        selectedDate.string = "Yesterday";
        $("#on_required").hide();
        break;
      default:
        selectedDate.string = (new Date(this.value)).toLocaleDateString();
        $("#on_required").show();
    }
    
    $("#selectedDate").text(selectedDate.string);
  });
  
  
  // send on 'enter'
  $("#doneText").keyup(function(e){
    var code = (e.keyCode ? e.keyCode : e.which);
    if(code == 13) { //Enter keycode
      var doneText = $("#doneText").val().trim();
      if(doneText.length > 0)
        onSend($("#doneText").val());
      else // highlight #doneText if empty
        $("#doneText").val("").focus();
    }
  });
  
  // send on 'click' send button
  $("#send").on("click", function(){
    var doneText = $("#doneText").val().trim();
    if(doneText.length > 0)
      onSend(doneText);
    else // highlight #doneText
      $("#doneText").val("").focus();
  });
  
  // options link handler
  $("#optionsLink").on("click", function(e){
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  $("#openExternal").on("click", function(){
    chrome.windows.create({
      url: "popup.html#popout",
      width: 400,
      height: 400,
      focused: true,
      type: "popup",
      state: "docked"
    });
  });
  
  addEventListener("unload", saveInput);
  $("#doneText").on("blur", saveInput);
});

function saveInput(){
  // Saving in background, because the pop may be dead by the time input is saved
  bgPage.saveInput($("#doneText").val().trim());
}


function onSend(text){
  // lighten input text, show rotating circle & text
  $("#doneText, #done_date, #teamSelect").addClass("sendingState").attr("disabled","disabled");
  $("#sendingDog").show();
  $("#status").text(messageStrings.sending_status_text);
  sendVisible = 1;
  showSend(false, function(){
    $("#teamSelectorDiv, #dateSelectorDiv").hide();
  });
  
  var doneObj = {
    team: selectedTeam.code,
    done_date: selectedDate.code,
    raw_text: text
  }
  
  // if date in Date selector is today, check for dates in string
  if(selectedDate.code === dateStr.today){
    var doneDateArr = checkForDates(text);
    if(doneDateArr && doneDateArr.length > 0){
      // date found in string
      doneObj["done_date"] = doneDateArr[0];
      doneObj["raw_text"] = doneDateArr[1];
      $("#done_date").val(doneDateArr[0])
    }
  }
    
  bgPage.iDoneThis.newDone(doneObj, function(status){
    if(status === true){
      // Mailing successful
      
      // clear input text, show green tick (then timeout and clear)
      $("#sendingDog").hide();
      $("#greenTick").fadeIn("fast").delay(SUCCESS_DELAY).fadeOut("fast");
      $("#status").hide().text(messageStrings.sent_status_text).fadeIn("fast").delay(SUCCESS_DELAY).fadeOut("fast", function(){
        if(sendVisible === 0)
          $("#status").text(messageStrings.default_status_text).fadeIn("fast");
      });
      setTimeout(textDefault, INPUT_DELAY, true);
      
      updateDoneList();
    } else if(status === false){
      // Mailing unsuccessful
      
      // darken input text, show red exclamation sign
      $("#sendingDog").hide();
      $("#redAlert").fadeIn("fast");
      $("#doneText").removeClass("sendingState").removeAttr("disabled");
      
      // show error message in dim, small font below
      $("#status").hide().text(messageStrings.error_status_title + messageStrings.error_default_title).fadeIn("fast"); //default error message
      textDefault(false);
      updateDoneList();
    } else if(status === "offline"){
      // Saved offline
      
      // clear input text, show timer tick (then timeout and clear)
      $("#sendingDog").hide();
      $("#savedOfflineIcon").fadeIn("fast").delay(FAILURE_DELAY).fadeOut("fast");
      $("#status").hide().text(messageStrings.offline_saved_status_text).fadeIn("fast").delay(FAILURE_DELAY).fadeOut("fast", function(){
        if(sendVisible === 0)
          $("#status").text(messageStrings.default_status_text).fadeIn("fast");
      });
      setTimeout(textDefault, INPUT_DELAY, true);
      
      chrome.alarms.create(CONNECTION_CHECKER_ALARM, {
        periodInMinutes: Math.round(Math.random()*5) // check reconnection in 0-5 mins
      });
      updateDoneList();
    }
  });
}

// Sets up default texts and states of all input elements
function textDefault(status){
  if(status === true){
    $("#status").text(messageStrings.default_status_text);
    $("#doneText").val(defaultInputText);
    $("#selectedTeam").text(selectedTeam.string);
    $("#done_date").val(selectedDate.code);
    $("#selectedDate").text(selectedDate.string);
    ls.set({"inputText": ""}, function(){
      defaultInputText = "";
    });
    
    $("#doneText, #done_date, #teamSelect").removeClass("sendingState").removeAttr("disabled");
    $("#doneText").focus();
  } else {
    $("#doneText, #done_date, #teamSelect").addClass("sendingState").attr("disabled","disabled");
    $("#status").text(messageStrings.loginerror_status_text);
  }
}


function showSend(show, callback){
  // change counter
  if(show === true)
    sendVisible++;
  else
    sendVisible--;
  
  if(sendVisible > 0){
    $("#status").hide();
    $("#selectorSeparator, #sendDiv").fadeIn();
    $("#dateTeamDiv").addClass("sendShowing");
  } else {
    $("#status").fadeIn();
    $("#selectorSeparator, #sendDiv").hide();
    $("#dateTeamDiv").removeClass("sendShowing");
  }
  
  if(callback) callback();
  if(show !== true) $("#doneText").focus();
}


function checkForDates(doneText){
  var m = doneText.match(DATE_REGEX);
  var dashCount = 0;
  if(m && m[1]){
    if(m[3]) 
      dashCount++;
    if(m[5] || m[11] || m[8] || m[14]) 
      dashCount++;
    
    return [(m[2] || m[13]) + "-"+
       (m[4] || m[7] || m[10] || m[15]) + "-"+
       (m[6] || m[9] || m[12] || m[16]), doneText.substr(9+dashCount, doneText.length-9-dashCount)];
  }
}


function yyyymmdd(date){
  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
  var dd  = date.getDate().toString();
  return yyyy + "-" + (mm[1]?mm:"0"+mm[0]) + "-" +  (dd[1]?dd:"0"+dd[0]); // padding
}

function updateDoneList(){
  $("#doneList").text("");
  ls.get(["dones", "offlineList"], function(st){
    var totalDones = st ? ((st.dones && st.dones.length > 0 ? st.dones.length : 0) + (st.offlineList && st.offlineList.length > 0 ? st.offlineList.length : 0)) : 0;
    if(totalDones > 0){
      var doneList = $("#doneList");
      var o = "";
      var doneCount = 0, goalCount = 0;
      
      if(st.dones && st.dones.length > 0){
        for (var i = 0; i < st.dones.length; i++) {
          o += "<li class='" + (st.dones[i].goal_completed === true ? "completed" : "goal") + "'><p>" + st.dones[i].markedup_text + "&nbsp;&nbsp;<a href='" + st.dones[i].permalink + "' target='_blank'><img src='img/external-9.png'></a></p></li>";
          if(st.dones[i].goal_completed === true)
            doneCount++;
          else
            goalCount++;
        }
      }
      
      if(st.offlineList && st.offlineList.length > 0){
        for (var i = 0; i < st.offlineList.length; i++) {
          if(/^\[\] /i.test(st.offlineList[i].raw_text) === true){
            o += "<li class='goal'><p>" + st.offlineList[i].raw_text.substr(3) + "</p>&nbsp;&nbsp;<img src='img/saved_offline.png'></li>";
            goalCount++;
          } else {
            o += "<li class='completed'><p>" + st.offlineList[i].raw_text + "</p>&nbsp;&nbsp;<img src='img/saved_offline.png'></li>";
            doneCount++;
          }
        }
      }
      
      if(doneList.text() === "") doneList.append(o);
      $("#doneListTitle").text(doneCount + " dones completed today" + (goalCount > 0 ? (", " + goalCount + " goal" + (goalCount > 1 ? "s" : "") + " pending") : ""));
    } else {
      $("#doneListTitle").text("No dones completed today. Get cracking!");
    }
  });
  bgPage.updateBadgeText();
}
