var bgPage = chrome.extension.getBackgroundPage();

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
    if(confirm("Are you sure you want to logout?")){
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
    $("#connect").addClass("hidden");
    $("#logout").removeClass("hidden");
    $("#loginErrorListItem").fadeOut();
    $("#idtTokenInput").val(localStorage.idtToken).attr("disabled","disabled");
    $("#idtTokenErrorListItem").fadeIn();
    bgPage.setupExtensionState(true);
  } else {
    $("#connect").removeClass("hidden");
    $("#logout").addClass("hidden");
    $("#idtTokenInput").removeAttr("disabled");
    if(localStorage.idtToken && localStorage.idtToken !== ""){
      $("#idtTokenInput").val(localStorage.idtToken);
      $("#idtTokenErrorListItem").fadeOut();
      $("#connect").removeAttr("disabled");
    } else {
      $("#idtTokenInput").focus();
      $("#idtTokenErrorListItem").fadeIn();
      $("#connect").attr("disabled", "disabled");
    }
    $("#loginErrorListItem").fadeIn();
    bgPage.setupExtensionState(false);
  }
}
