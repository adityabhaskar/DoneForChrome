var bgPage = chrome.extension.getBackgroundPage();
var defaultStatusText = "Press Enter to send";

$(document).ready(function(){
  bgPage.iDoneThis.isLoggedIn(textDefault, function(){
    $("#doneText").addClass("sendingState").attr("disabled","disabled");
    $("#status").text("Error! Please login.");
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
  $("#status").text("Sending...");
  
    
  bgPage.iDoneThis.newDone({
    raw_text: text,
    team: localStorage.team || "adityabhaskar",
    // date: new Date().toDateString()
  }, function(response){
    // Mailing successful
    
    // clear input text, show green tick (then timeout and clear)
    $("#pendingCircle").addClass("hidden");
    $("#greenTick").fadeIn("fast").delay(2000).fadeOut("fast");
    $("#status").hide().text("Sent.").fadeIn("fast").delay(2000).fadeOut("fast", function(){
      $("#status").text(defaultStatusText).fadeIn("fast");
    });
    $("#doneText").val("").removeClass("sendingState").removeAttr("disabled").focus();
    
  }, function(reason){
    // Mailing unsuccessful
    
    // darken input text, show red exclamation sign
    $("#pendingCircle").addClass("hidden");
    $("#redAlert").fadeIn("fast");
    $("#doneText").removeClass("sendingState").removeAttr("disabled");
    
    // show error message in dim, small font below
    $("#status").hide().text("Error: " + reason).fadeIn("fast");
  });
  
  // bgPage.GMAIL.sendEmail({
  //   doneText: text,
  //   username: localStorage.idtUsername,
  //   team: localStorage.team || "team",
  //   from: localStorage.fromEmail,
  //   date: new Date().toDateString()
  // }, function(response){
  //   // Mailing successful
    
  //   // clear input text, show green tick (then timeout and clear)
  //   $("#pendingCircle").addClass("hidden");
  //   $("#greenTick").fadeIn("fast").delay(2000).fadeOut("fast");
  //   $("#status").hide().text("Sent.").fadeIn("fast").delay(2000).fadeOut("fast", function(){
  //     $("#status").text(defaultStatusText).fadeIn("fast");
  //   });
  //   $("#doneText").val("").removeClass("sendingState").removeAttr("disabled").focus();
    
  // }, function(reason){
  //   // Mailing unsuccessful
    
  //   // darken input text, show red exclamation sign
  //   $("#pendingCircle").addClass("hidden");
  //   $("#redAlert").fadeIn("fast");
  //   $("#doneText").removeClass("sendingState").removeAttr("disabled");
    
  //   // show error message in dim, small font below
  //   $("#status").hide().text("Error: " + reason).fadeIn("fast");
  // });
}

function textDefault(){
  $("#doneText").removeClass("sendingState hidden").removeAttr("disabled").focus();
  $("#status").text(defaultStatusText);
}
