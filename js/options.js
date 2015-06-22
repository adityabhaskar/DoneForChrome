var bgPage = chrome.extension.getBackgroundPage();

$(document).ready(function(){
  bgPage.GMAIL.isLoggedIn(function(){
    updateOptionsPage(true);
  }, function(){
    updateOptionsPage(false);
  });
  
  $("#login").on("click", function(){
    console.log("init Login");
    bgPage.GMAIL.initAuth(function(){
      updateOptionsPage(true);
    }, function(){
      updateOptionsPage(false);
    });
  });
  
  // $("#logout").on("click", function(){
  //   if(confirm("Are you sure you want to logout?")){
  //     console.log("init Logout");
  //     bgPage.GMAIL.initLogout(function(){
  //       updateOptionsPage(false);
  //     });
  //   }
  // });
  
  $("#usernameInput").on("focusin", function(){
    $("#usernameSaved").hide();
    $("#usernameHelp").fadeIn("fast");
  });
  $("#usernameInput").on("focusout", function(){
    var idtUsername = $("#usernameInput").val();
    if(idtUsername && idtUsername !== "" & idtUsername !== localStorage.idtUsername){
      localStorage.idtUsername = idtUsername;
      $("#usernameHelp").fadeOut("fast", function(){
        $("#usernameSaved").fadeIn("fast", function(){
          $("#usernameSaved").delay(5000).fadeOut("fast");
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
    // $("#logoutDiv").removeClass("hidden");
    $("#usernameInput").removeAttr("disabled");
    if(localStorage.idtUsername !== undefined && localStorage.idtUsername !== ""){
      $("#usernameInput").val(localStorage.idtUsername);
    }
  } else {
    $("#loginDiv").removeClass("hidden");
    // $("#logoutDiv").addClass("hidden");
    $("#usernameInput").attr("disabled","disabled");
  }
}
