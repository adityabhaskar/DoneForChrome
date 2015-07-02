var bgPage = chrome.extension.getBackgroundPage();
// chrome.i18n.getMessage("browserButtonTitle");

var DEFAULT_STATUS_TEXT = chrome.i18n.getMessage("default_status_text");
var LOGINERROR_STATUS_TEXT = chrome.i18n.getMessage("loginerror_status_text");
var SENDING_STATUS_TEXT = chrome.i18n.getMessage("sending_status_text");
var SENT_STATUS_TEXT = chrome.i18n.getMessage("sent_status_text");
var ERROR_STATUS_TITLE = chrome.i18n.getMessage("error_status_title");
var ERROR_DEFAULT_TEXT = chrome.i18n.getMessage("error_default_text");
var DATE_REGEX = /^((?:(\d{4})(-?)(?:(?:(0[13578]|1[02]))(-?)(0[1-9]|[12]\d|3[01])|(0[13456789]|1[012])(-?)(0[1-9]|[12]\d|30)|(02)(-?)(0[1-9]|1\d|2[0-8])))|([02468][048]|[13579][26])(-?)(0229)) /;
// /^(?:((?:(\d{4})(-?)(?:(?:(0[13578]|1[02]))(-?)(0[1-9]|[12]\d|3[01])|(0[13456789]|1[012])(-?)(0[1-9]|[12]\d|30)|(02)(-?)(0[1-9]|1\d|2[0-8])))|([02468][048]|[13579][26])(-?)(02)(29))|(yesterday)|(tomorrow)) /;

var showSend = false;

$(document).ready(function(){
  // populate suggest list with team names
  chrome.storage.local.get("teams", function(st){
    if(st && st.teams && st.teams.length > 0){
      var teamSelect = $("#teamSelect");
      var o;
      for (var i = 0; i < st.teams.length; i++) {
        // o = new Option((st.teams[i].name.length > 15 ? st.teams[i].name.substr(0,14): st.teams[i].name), st.teams[i].short_name);
        o = new Option(st.teams[i].name, st.teams[i].short_name);
        if(st.teams[i].short_name === localStorage.defaultTeamCode) o.selected = true;
        teamSelect.append(o);
      }
      
      if(st.teams.length > 1 && localStorage.showTeamSelector === "true")
        $("#teams").css("display", "inherit");
    }
  });
  
  $("#changeTeam").on("click", function(){
    var changeTeamText = this.text;
    if(changeTeamText === "(Change)"){
      $("#teamSelectorDiv").css("display", "inherit");
      this.text = "Hide";
    } else {
      $("#teamSelectorDiv").css("display", "none");
      this.text = "(Change)";
    }
  });
  
  $("#selectedTeam").text(localStorage.defaultTeam);
  $("#teamSelect").on("change", function(){
    $("#selectedTeam").text($("#teamSelect option:selected").text());
  });
  
  
  if(localStorage.showDateSelector === "true"){
    $("#dateDiv, #sendDiv").css("display", "inherit");
    $("#status").css("display", "none");
    showSend = true;
  }
  
  // Show disabled input is not logged in
  bgPage.iDoneThis.isLoggedIn(textDefault, function(){
    $("#doneText, #done_date").addClass("sendingState").attr("disabled","disabled");
    $("#status").text(LOGINERROR_STATUS_TEXT);
  });
  
  // send on 'enter'
  $("#done_date").val(yyyymmdd(new Date()));
  $("#doneText").keyup(function(e){
    var code = (e.keyCode ? e.keyCode : e.which);
    if(code == 13) { //Enter keycode
      var doneText = $("#doneText").val().trim();
      if(doneText.length > 0)
        onSend($("#doneText").val());
      else{
        // highlight #doneText
        $("#doneText").val("").focus();
      }
    // Attempt at updating the date field if Text begins with a date - abandoned
    // } else {
    //   if(/^(\d{8})|(\d{4}\-\d{2}\-\d{2}) /.test(this.value))
    //     console.log("date...");
    }
  });
  
  $("#send").on("click", function(){
    var doneText = $("#doneText").val().trim();
    if(doneText.length > 0)
      onSend(doneText);
    else{
      // highlight #doneText
      $("#doneText").val("").focus();
    }
  })
  
});

function onSend(text){
  // lighten input text, show rotating circle & text
  $("#doneText, #done_date").addClass("sendingState").attr("disabled","disabled");
  $("#pendingCircle").removeClass("hidden");
  $("#status").text(SENDING_STATUS_TEXT);
  
  var doneObj = {
    team: $("#teamSelect").val() || localStorage.defaultTeamCode
  }
  
  var done_date = $("#done_date").val();
  
  if(done_date !== yyyymmdd(new Date())){
  // if date in Date selector is not today, use that date
    doneObj["done_date"] = done_date;
    doneObj["raw_text"] = text;
  
  } else {
  // if date in Date selector is today, check for dates in string
    var doneDateArr = checkForDates(text);
    
    if(doneDateArr && doneDateArr.length > 0){
      // date found in string
      doneObj["done_date"] = doneDateArr[0];
      doneObj["raw_text"] = doneDateArr[1];
      $("#done_date").val(doneDateArr[0])
    } else {
      // no date provided
      doneObj["raw_text"] = text;
    }
  }
    
  bgPage.iDoneThis.newDone(doneObj, function(response){
    // Mailing successful
    
    // clear input text, show green tick (then timeout and clear)
    $("#pendingCircle").addClass("hidden");
    $("#greenTick").fadeIn("fast").delay(2000).fadeOut("fast");
    $("#status").hide().text(SENT_STATUS_TEXT).fadeIn("fast").delay(2000).fadeOut("fast", function(){
      if(showSend === false)
        $("#status").text(DEFAULT_STATUS_TEXT).fadeIn("fast");
    });
    
    $("#doneText").val("").removeClass("sendingState").removeAttr("disabled").focus();;
    $("#done_date").val(yyyymmdd(new Date())).removeClass("sendingState").removeAttr("disabled");
    
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
    if(showSend === false){
      $("#status").delay(2000).fadeOut("slow");
    }
  });
}

function textDefault(){
  $("#doneText, #done_date").removeClass("sendingState hidden").removeAttr("disabled")
  $("#doneText").focus();
  $("#status").text(DEFAULT_STATUS_TEXT);
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
