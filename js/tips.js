$(document).ready(function(){
  var appName = chrome.i18n.getMessage("appName");
  var shortName = chrome.i18n.getMessage("shortName");
  $("#extShortName").text(shortName);
  $("#extName").text(appName);
  $("title").text("Options - " + appName);
});
