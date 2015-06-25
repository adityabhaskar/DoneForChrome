var bgPage = chrome.extension.getBackgroundPage();
chrome.i18n.getMessage("browserButtonTitle")

var DEFAULT_STATUS_TEXT = chrome.i18n.getMessage("default_status_text");
var LOGINERROR_STATUS_TEXT = chrome.i18n.getMessage("loginerror_status_text");
var SENDING_STATUS_TEXT = chrome.i18n.getMessage("sending_status_text");
var SENT_STATUS_TEXT = chrome.i18n.getMessage("sent_status_text");
var ERROR_STATUS_TEXT = chrome.i18n.getMessage("error_status_text");

$(document).ready(function(){
  bgPage.iDoneThis.isLoggedIn(textDefault, function(){
    $("#doneText").addClass("sendingState").attr("disabled","disabled");
    $("#status").text(LOGINERROR_STATUS_TEXT);
  });
  
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
    team: localStorage.defaultTeamCode,
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
    
  }, function(reason){
    // Mailing unsuccessful
    
    // darken input text, show red exclamation sign
    $("#pendingCircle").addClass("hidden");
    $("#redAlert").fadeIn("fast");
    $("#doneText").removeClass("sendingState").removeAttr("disabled");
    
    // show error message in dim, small font below
    $("#status").hide().text(ERROR_STATUS_TEXT + reason).fadeIn("fast");
  });
}

function textDefault(){
  $("#doneText").removeClass("sendingState hidden").removeAttr("disabled").focus();
  $("#status").text(DEFAULT_STATUS_TEXT);
}
