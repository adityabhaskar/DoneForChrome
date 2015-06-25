var bgPage = chrome.extension.getBackgroundPage();

var LOGOUT_CONFIRM = chrome.i18n.getMessage("logout_confirm");
var IDT_URL = "https://iDoneThis.com/home/"

$(document).ready(function(){
  bgPage.iDoneThis.isLoggedIn(function(){
    updateOptionsPage(true);
  }, function(){
    updateOptionsPage(false);
  });
  
  // login event handler
  $("#connect").on("click", function(){
    console.log("init Login");
    bgPage.iDoneThis.connect(function(){
      updateOptionsPage(true);
    }, function(){
      updateOptionsPage(false);
    });
  });
  
  // logout event handler
  $("#logout").on("click", function(e){
    e.preventDefault();
    if(confirm(LOGOUT_CONFIRM)){
      console.log("init Logout");
      bgPage.iDoneThis.logout(function(){
        $("#idtTokenInput").val("");
        updateOptionsPage(false);
      });
    }
    return false;
  });
  
  // idtToken - in focus event handler
  $("#idtTokenInput").on("focusin", function(){
    $("#idtTokenSaved").hide();
    $("#idtTokenHelp").fadeIn("fast");
  });
  
  // idtToken - out of focus event handler
  $("#idtTokenInput").on("focusout", function(){
    var idtToken = $("#idtTokenInput").val().trim();
    if(idtToken !== undefined && idtToken !== localStorage.idtToken){
      localStorage.idtToken = idtToken;
      $("#idtTokenHelp").fadeOut("fast", function(){
        $("#idtTokenSaved").fadeIn("fast", function(){
          $("#idtTokenSaved").delay(5000).fadeOut("fast");
        });
      });
    } else {
      $("#idtTokenHelp").fadeOut("fast");
    }
    updateOptionsPage(false);
  });
  
  $("#idtTokenInput").on("input", function(){
    if($("#idtTokenInput").val().trim() !== ""){
      $("#connect").removeAttr("disabled");
    } else {
      $("#connect").attr("disabled", "disabled");
    }
  });
  
});


function updateOptionsPage(loggedIn){
  if(loggedIn === true){
    
    $(".loggedOut").hide();
    $(".loggedIn").show();
    
    $("#niceName").text(localStorage.niceName);
    $("#usernameSpan").text(localStorage.username).attr("href", IDT_URL);
    $("#defaultTeam").text(localStorage.defaultTeam).attr("href", localStorage.defaultTeamURL);
    
    bgPage.setupExtensionState(true);
    
  } else {
    
    $(".loggedOut").show();
    $(".loggedIn").hide();
    
    $("#idtTokenInput").removeAttr("disabled");
    if(localStorage.idtToken && localStorage.idtToken !== ""){
      $("#idtTokenInput").val(localStorage.idtToken);
      // $("#idtTokenErrorListItem").fadeOut();
      $("#connect").removeAttr("disabled");
    } else {
      $("#idtTokenInput").focus();
      // $("#idtTokenErrorListItem").fadeIn();
      $("#connect").attr("disabled", "disabled");
    }
    // $("#loginErrorListItem").fadeIn();
    
    bgPage.setupExtensionState(false);
  }
}
