var bgPage = chrome.extension.getBackgroundPage();

$(document).ready(function(){
  bgPage.GMAIL.isLoggedIn(function(){
    updateOptionsPage(true);
  }, function(){
    updateOptionsPage(false);
  });
  
  // login event handler
  $("#login").on("click", function(){
    console.log("init Login");
    bgPage.GMAIL.initAuth(function(){
      updateOptionsPage(true);
    }, function(){
      updateOptionsPage(false);
    });
  });
  
  // logout event handler
  $("#logout").on("click", function(e){
    e.preventDefault();
    if(confirm("Are you sure you want to logout?")){
      console.log("init Logout");
      bgPage.GMAIL.initLogout(function(){
        updateOptionsPage(false);
      });
    }
    return false;
  });
  
  // username - in focus event handler
  $("#usernameInput").on("focusin", function(){
    $("#usernameSaved").hide();
    $("#usernameHelp").fadeIn("fast");
  });
  
  // username - out of focus event handler
  $("#usernameInput").on("focusout", function(){
    var idtUsername = $("#usernameInput").val();
    if(idtUsername && idtUsername !== "" & idtUsername !== localStorage.idtUsername){
      localStorage.idtUsername = idtUsername;
      $("#usernameHelp").fadeOut("fast", function(){
        $("#usernameSaved").fadeIn("fast", function(){
          $("#usernameSaved").delay(5000).fadeOut("fast");
          bgPage.setupPopup(true);
        });
      });
    } else {
      $("#usernameHelp").fadeOut("fast");
    }
  });
});


function updateOptionsPage(loggedIn){
  if(loggedIn === true){
    $("#loginDiv").addClass("hidden");
    $("#logoutDiv").removeClass("hidden");
    $("#usernameInput").removeAttr("disabled");
    if(localStorage.idtUsername !== undefined && localStorage.idtUsername !== ""){
      $("#usernameInput").val(localStorage.idtUsername);
    } else {
      $("#usernameInput").focus();
    }
  } else {
    $("#loginDiv").removeClass("hidden");
    $("#logoutDiv").addClass("hidden");
    $("#usernameInput").val("").attr("disabled","disabled");
    bgPage.setupPopup(false);
  }
}
