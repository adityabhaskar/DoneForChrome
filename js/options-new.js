// 'use strict';
var bgPage = chrome.extension.getBackgroundPage();

$(document).ready(function(){
  var appName = chrome.i18n.getMessage("appName");
  var shortName = chrome.i18n.getMessage("shortName");
  $("#extShortName").text(shortName);
  $("#extName").text(appName);
  $("title").text("Options - " + appName);
  
  return;
  // Setup Account Section
  if(bgPage.pocket.isLoggedIn()){
    $("#signInForm").addClass("hide");
    $("#signOutForm").removeClass("hide");
    $("#username").text(bgPage.pocket.username);
    $("#count").text(bgPage.pocket.count);
    $(".otherSettings").removeClass("disabled");
    if(location.hash !== undefined && location.hash !== ""){
      $(location.hash).addClass("highlighted");
    }
  } else {
    $("#signOutForm").addClass("hide");
    $("#signInForm").removeClass("hide");
    $(".otherSettings").addClass("disabled");
  }
  $("#signOutForm").on("submit",function(evt){
    evt.preventDefault();
    console.log("signout");
    bgPage.pocket.signout(function(){
      ls.clear(function(){
        ls.set({
          // Default settings
          "buttonBehaviour": "open",
          "contextMenu": true,
          "keyboardShortcut": true,
          "openListShortcut": true,
          "mobileTags": true,
          "background": false,
          "openRandomKeyboardShortcut": true,
          "pollingTimer": 3
        }, function(){
          bgPage.pocket.accessToken = "";
          bgPage.pocket.since = "";
          bgPage.pocket.count = 0;
          bgPage.pocket.wordCount = 0;
          bgPage.pocket.username = "";
          location.reload();
        });
      });
    });
  });
  
  $("#signInForm").on("submit",function(evt){
    evt.preventDefault();
    console.log("signin");
    bgPage.pocket.signin(function(){
      location.reload();
    });
  });
  
  ls.get([
    "buttonBehaviour",
    "contextMenu",
    "keyboardShortcut",
    "openListShortcut",
    "mobileTags",
    "openRandomKeyboardShortcut",
    "showAgeing",
    "showCount",
    "background",
    "surpriseMeBehaviour",
  ], function(st){
    if(st){
      if(st["buttonBehaviour"] && st["buttonBehaviour"] !== ""){
        $("#buttonBehaviour").val(st["buttonBehaviour"]);
      }
      if(st["surpriseMeBehaviour"] && st["surpriseMeBehaviour"] !== ""){
        $("#surpriseMeBehaviour").val(st["surpriseMeBehaviour"]);
      }
      if(st["contextMenu"] !== null && st["contextMenu"] !== ""){
        $("#contextMenu").prop("checked", st["contextMenu"]);
      }
      if(st["keyboardShortcut"] !== null && st["keyboardShortcut"] !== ""){
        $("#keyboardShortcut").prop("checked", st["keyboardShortcut"]);
      }
      if(st["openListShortcut"] !== null && st["openListShortcut"] !== ""){
        $("#openListShortcut").prop("checked", st["openListShortcut"]);
      }
      if(st["mobileTags"] !== null && st["mobileTags"] !== ""){
        $("#mobileTags").prop("checked", st["mobileTags"]);
        if(st["mobileTags"] === false) $("#removeTimeTags").prop("disabled", false);
      }
      if(st["openRandomKeyboardShortcut"] !== null && st["openRandomKeyboardShortcut"] !== ""){
        $("#openRandomKeyboardShortcut").prop("checked", st["openRandomKeyboardShortcut"]);
      }
      if(st["showAgeing"] !== null && st["showAgeing"] !== ""){
        $("#showAgeing").prop("checked", st["showAgeing"]);
      }
      if(st["showCount"] !== null && st["showCount"] !== ""){
        $("#showCount").prop("checked", st["showCount"]);
      }
      if(st["background"] !== null && st["background"] !== ""){
        $("#background").prop("checked", st["background"]);
      }
      if(st["pollingTimer"] && st["pollingTimer"] !== ""){
        $("#updateFrequency").val(st["pollingTimer"]);
      }
    }
  });
  
  // Setup buttonBehaviour Section
  $("#buttonBehaviour").change(function(evt){
    var newButtonBehaviour = this.value;
    ls.set({"buttonBehaviour": newButtonBehaviour},function(){
      confirmSave("buttonBehaviour");
      if(newButtonBehaviour === "popup"){
        chrome.browserAction.setPopup({popup: "popup.html"});
      } else {
        chrome.browserAction.setPopup({popup: ""});
      }
    });
  });
  
  // Setup addToPocket Section
  $(".checkBoxSettings").change(function(evt){
    var atP = {};
    var id = this.id;
    var value = this.checked;
    atP[id] = value;
    
    // Do this before ls.set, so success & failure of permission request can be handled before saving setting.
    if(id === "background"){
      console.log("background: " + value);
      changePermissions(value, {
          permissions: ["background"]
        }, function(){
          // all is hunky dory, nothing to do
        }, function(){
          // reverse permissions
          atP[id] = !value;
          $("#"+id).prop("checked", !value);
      });
    }
    
    ls.set(atP,function(){
      confirmSave(id);
      // change behaviour - disable context menu
      if(id === "contextMenu"){
        if(value){
          bgPage.addContextMenu();
        } else {
          bgPage.removeContextMenu();
        }
      }
      if(id === "showCount"){
        bgPage.pocket.updateUI();
      }
      if(id === "mobileTags"){
        if(value){
          // Go through stored object list, and add time-tags to all untagged items.
          ls.get(["fullListObj"], function(st){
            if(st.fullListObj === undefined || st.fullListObj === null) return;
            
            for(var key in st.fullListObj){
              if(st.fullListObj[key].ppTagEdited === undefined){
                st.fullListObj[key].ppTimeTag = Math.round(st.fullListObj[key].word_count/WPM).toLocaleString() + " min";
                st.fullListObj[key].ppTagEdited = true;
              }
            }
            ls.set({"fullListObj": st.fullListObj}, function(){
              bgPage.pocket.addTimeTagsMulti();
            });
          });
          $("#removeTimeTags").prop("disabled", true);
        } else {
          // bgPage.removeContextMenu();
          $("#removeTimeTags").prop("disabled", false);
        }
      }
    });
  });
  
  
  $("#removeTimeTagsForm").on("submit",function(evt){
    evt.preventDefault();
    bgPage.pocket.removeAllTimeTags();
  });
  
  // Setup surpriseMeBehaviour Section
  $("#surpriseMeBehaviour").change(function(evt){
    var newSurpriseMeBehaviour = this.value;
    ls.set({"surpriseMeBehaviour": newSurpriseMeBehaviour},function(){
      confirmSave("surpriseMeBehaviour");
    });
  });
  
  // Setup updateFrequency Section
  $("#updateFrequency").change(function(evt){
    ls.set({"pollingTimer": this.value},function(){
      bgPage.pocket.startTimer();
      confirmSave("updateFrequency");
    });
  });
  
  
  $("#readSomething").click(function(evt){
    evt.preventDefault();
    // change URL to a randomly selected article from user's list
    bgPage.openRandomArticle();
  });
  
  
  loadHelpMessages();
  positionHelps();
  
  // loadWhitelist();
  // $("#whitelistAddForm").on("submit", addToWhitelist);
  // $("#whitelistRemoveForm").on("submit", removeFromWhitelist);
  
  $("#cx-edit-help-content div").hover(function(){
    $(this).css("display", "inherit");
  },function(){
    $(this).css("display", "none");
  });

  $("section").hover(function(){
    $("#"+$(this).attr("id")+"Help").css("display", "inherit");
  },function(){
    $("#"+$(this).attr("id")+"Help").css("display", "none");
  });

  $("section *").focusin(function(){
    $("#"+$(this).parents("section").attr("id")+"Help").css("display", "inherit");
  });
  $("section *").focusout(function(){
    $("#"+$(this).parents("section").attr("id")+"Help").css("display", "none");
  });

  $(document).resize(function(){
    positionHelps();
  });
  
});

function loadHelpMessages(){
  $("#cx-edit-help-content div").each(function(){
    $("#"+this.id).html(chrome.i18n.getMessage(this.id));
  });
}

function positionHelps(){
  $("section").each(function(){
    var id = $(this).attr("id");
    $("#"+id+"Help").css({
      // top: $(this).position().top-53,
      top: $(this).position().top-53+$(this).height()/2-$("#"+id+"Help").height()/2
    });
  });
}

function confirmSave(source){
  console.log("Option saved: " + source);
  $("#"+source+"Saved").delay(400).fadeIn("fast").delay(2000).fadeOut("fast");
}

function changePermissions(doAdd, permissions, successCallback, failureCallback){
  if(doAdd === true){
    chrome.permissions.request(permissions, function(granted) {
      // The callback argument will be true if the user granted the permissions.
      var err = chrome.runtime.lastError;
      if(err) console.log(chrome.runtime.lastError);
      
      if(!err && granted) {
        if(successCallback) successCallback();
      } else {
        if(failureCallback) failureCallback();
      }
    });
  } else {
    chrome.permissions.remove(permissions, function(removed) {
      var err = chrome.runtime.lastError
      if(err) console.log(chrome.runtime.lastError);
      
      if (!err && removed) {
        // The permissions have been removed.
        if(successCallback) successCallback();
      } else {
        // The permissions have not been removed (e.g., you tried to remove
        // required permissions).
        if(failureCallback) failureCallback();
      }
    });
  }
}


/*
function loadWhitelist(){
  var whitelist = JSON.parse(localStorage["whitelist"]);
  for (var i = 0; i < whitelist.length; i++) {
    $("#whitelistSelect").append($("<option></option>").val(i).text(whitelist[i]));
  }
}


function addToWhitelist(){
  var tempURL = $("#whitelistInput").val();
  if(tempURL !== ""){
    var tempWhitelist = JSON.parse(localStorage["whitelist"]);
    if(tempWhitelist.indexOf(tempURL) == -1){
      // Add value to top of list and insert into the select tab
      tempWhitelist.push(tempURL);
      localStorage["whitelist"] = JSON.stringify(tempWhitelist);
      $("#whitelistSelect").append("<option value=\""+(tempWhitelist.length-1)+"\">"+tempURL+"</option>");
    }
    $("#whitelistInput").val("");
  }
  return false;
}
  
function removeFromWhitelist(){
  // Get ids of selected item(s), remove from localStorage & select-options
  if($("#whitelistSelect option:selected").length > 0){
    var tempWhitelist = JSON.parse(localStorage["whitelist"]);
    var removedArr = [];
    $("#whitelistSelect option:selected").each(function(){
      removedArr.push($(this).val());
    });
    
    $("#whitelistSelect").html("")
    for (var i = tempWhitelist.length-1; i >= 0; i--) {
      if(removedArr.indexOf(i.toString()) > -1) tempWhitelist.splice(i,1);
    }

    for (var i = 0; i < tempWhitelist.length; i++) $("#whitelistSelect").append($("<option></option>").val(i).text(tempWhitelist[i]));
    
    localStorage["whitelist"] = JSON.stringify(tempWhitelist);
  }
  return false;
}

*/
