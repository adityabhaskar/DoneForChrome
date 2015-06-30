var bgPage = chrome.extension.getBackgroundPage();
// chrome.i18n.getMessage("browserButtonTitle");

var DEFAULT_STATUS_TEXT = chrome.i18n.getMessage("default_status_text");
var LOGINERROR_STATUS_TEXT = chrome.i18n.getMessage("loginerror_status_text");
var SENDING_STATUS_TEXT = chrome.i18n.getMessage("sending_status_text");
var SENT_STATUS_TEXT = chrome.i18n.getMessage("sent_status_text");
var ERROR_STATUS_TITLE = chrome.i18n.getMessage("error_status_title");
var ERROR_DEFAULT_TEXT = chrome.i18n.getMessage("error_default_text");

$(document).ready(function(){
  // populate suggest list with team names
  chrome.storage.local.get("teams", function(st){
    if(st && st.teams && st.teams.length > 0){
      var teamSelect = $("#teamSelect");
      var o;
      for (var i = 0; i < st.teams.length; i++) {
        o = new Option(st.teams[i].name, st.teams[i].short_name);
        if(st.teams[i].short_name === localStorage.defaultTeamCode) o.selected = true;
        teamSelect.append(o);
      }
      
      if(st.teams.length > 1)
        $("#teams").css("display", "inherit");
    }
  });
  
  // Show disabled input is not logged in
  bgPage.iDoneThis.isLoggedIn(textDefault, function(){
    $("#doneText").addClass("sendingState").attr("disabled","disabled");
    $("#status").text(LOGINERROR_STATUS_TEXT);
  });
  
  // send on 'enter'
  $("#doneText").keyup(function(e){
    var code = (e.keyCode ? e.keyCode : e.which);
    if(code == 13) { //Enter keycode
      onSend($("#doneText").val());
    }
  });
});

function onSend(text){
  // lighten input text, show rotating circle & text
  $("#doneText").addClass("sendingState").attr("disabled","disabled");
  $("#pendingCircle").removeClass("hidden");
  $("#status").text(SENDING_STATUS_TEXT);
  
    
  bgPage.iDoneThis.newDone({
    raw_text: text,
    team: $("#teamSelect").val() || localStorage.defaultTeamCode,
    // date: new Date().toDateString()
  }, function(response){
    // Mailing successful
    
    // clear input text, show green tick (then timeout and clear)
    $("#pendingCircle").addClass("hidden");
    $("#greenTick").fadeIn("fast").delay(2000).fadeOut("fast");
    $("#status").hide().text(SENT_STATUS_TEXT).fadeIn("fast").delay(2000).fadeOut("fast", function(){
      $("#status").text(DEFAULT_STATUS_TEXT).fadeIn("fast");
    });
    $("#doneText").val("").removeClass("sendingState").removeAttr("disabled").focus();
    
  }, function(response){
    // Mailing unsuccessful
    
    // darken input text, show red exclamation sign
    $("#pendingCircle").addClass("hidden");
    $("#redAlert").fadeIn("fast");
    $("#doneText").removeClass("sendingState").removeAttr("disabled");
    
    // show error message in dim, small font below
    if(response && response.errors && response.errors.team && response.errors.team.length > 0)
      $("#status").hide().text(ERROR_STATUS_TITLE + response.errors.team[0]).fadeIn("fast"); //no team error message
    else
      $("#status").hide().text(ERROR_STATUS_TITLE + ERROR_DEFAULT_TITLE).fadeIn("fast"); //default error message
  });
}

function textDefault(){
  $("#doneText").removeClass("sendingState hidden").removeAttr("disabled").focus();
  $("#status").text(DEFAULT_STATUS_TEXT);
}
