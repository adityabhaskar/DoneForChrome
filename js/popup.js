var bgPage = chrome.extension.getBackgroundPage();

$(document).ready(function(){
  $("#login").on("click", function(){
    console.log("init Login");
    bgPage.initAuth();
  });
  $("#logout").on("click", function(){
    console.log("init Logout");
    bgPage.initLogout();
  });
  $("#sendMail").on("click", function(){
    console.log("send email");
  });
});
