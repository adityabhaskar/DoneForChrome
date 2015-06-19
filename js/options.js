var bgPage = chrome.extension.getBackgroundPage();

$(document).ready(function(){
  bgPage.GMAIL.isLoggedIn(function(){
    $("#loginDiv").addClass("hidden");
    $("#logoutDiv").removeClass("hidden");
  }, function(){
    $("#loginDiv").removeClass("hidden");
    $("#logoutDiv").addClass("hidden");
  });
  $("#login").on("click", function(){
    console.log("init Login");
    bgPage.GMAIL.initAuth();
  });
  $("#logout").on("click", function(){
    console.log("init Logout");
    bgPage.GMAIL.initLogout();
  });
});
