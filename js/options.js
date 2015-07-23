var bgPage = chrome.extension.getBackgroundPage();
var timeoutname;
var LOGOUT_CONFIRM = chrome.i18n.getMessage("logout_confirm");
var IDT_URL = "https://iDoneThis.com/home/"
var DONE_CHECKER_ALARM = "doneChecker";

$(document).ready(function(){
  var appName = chrome.i18n.getMessage("appName");
  var shortName = chrome.i18n.getMessage("shortName");
  $("#extShortName").text(shortName);
  $("#extName").text(appName);
  $("title").text("Options - " + appName);
  
  if(localStorage.doneFrequency)
    $("#updateFrequency").val(localStorage.doneFrequency);
  
  bgPage.iDoneThis.isLoggedIn(false, function(){
    updateOptionsPage(true);
  }, function(){
    updateOptionsPage(false);
  });
  
  // login event handler
  $("#connect").on("click", function(e){
    e.preventDefault();
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
  
  // refreshTeams event handler
  $("#refreshTeams").on("click", function(e){
    e.preventDefault();
    bgPage.iDoneThis.getTeams(updateTeams);
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
        confirmSave(this.id);
      });
    } else {
      $("#idtTokenHelp").fadeOut("fast");
    }
    updateOptionsPage(false);
  });
  
  // Disable/Enable Connect button when token field is empty/not
  $("#idtTokenInput").on("input", function(){
    if($("#idtTokenInput").val().trim() !== ""){
      $("#connect").removeAttr("disabled");
    } else {
      $("#connect").attr("disabled", "disabled");
    }
  });
  
  // Change default team
  $("#teamSelect").on("change", function(){
    // Save new selected team as default
    var selectedTeam = JSON.parse(this.value);
    localStorage.defaultTeam = selectedTeam.name;
    localStorage.defaultTeamCode = selectedTeam.short_name;
    localStorage.defaultTeamURL = selectedTeam.permalink;
    
    // Update team name on options page to reflect new default team.
    $("#defaultTeam").delay(250).text(localStorage.defaultTeam).attr("href", localStorage.defaultTeamURL);
    confirmSave(this.id);
  });
  
  // Setup updateFrequency Section
  $("#updateFrequency").change(function(evt){
    if(timeoutname) clearTimeout(timeoutname);
    timeoutname = setTimeout(resetDoneAlarm, 3000, this.value);
  });
  
  
  loadHelpMessages();
  positionHelps();
  
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


function updateOptionsPage(loggedIn){
  if(loggedIn === true){
    
    $(".loggedOut").hide();
    $(".loggedIn").show();
    
    $("#niceName").text(localStorage.niceName);
    $("#usernameSpan").text(localStorage.username).attr("href", IDT_URL);
    
    // populate teams
    updateTeams();
    
    bgPage.setupExtensionState(true);
    
  } else {
    
    $(".loggedOut").show();
    $(".loggedIn").hide();
    
    $("#idtTokenInput").removeAttr("disabled");
    if(localStorage.idtToken && localStorage.idtToken !== ""){
      $("#idtTokenInput").val(localStorage.idtToken);
      $("#connect").removeAttr("disabled");
    } else {
      $("#idtTokenInput").focus();
      $("#connect").attr("disabled", "disabled");
    }
    
    $("#teamSelect").text("");
    $("#teamSelect, #refreshTeams").attr("disabled", "disabled");
    
    bgPage.setupExtensionState(false);
  }
}


function updateTeams(callback){
  chrome.storage.local.get("teams", function(st){
    if(st && st.teams && st.teams.length > 0){
      var teamSelect = $("#teamSelect");
      var o;
      
      teamSelect.html("");
      
      for (var i = 0; i < st.teams.length; i++) {
        o = new Option(st.teams[i].name, JSON.stringify({
          name: st.teams[i].name,
          short_name: st.teams[i].short_name,
          permalink: st.teams[i].permalink
        }));
        if(st.teams[i].short_name === localStorage.defaultTeamCode) o.selected = true;
        teamSelect.append(o);
      }
    }
    
    $("#defaultTeam").text(localStorage.defaultTeam).attr("href", localStorage.defaultTeamURL);
    
    if(callback) callback();
  });
  
  $("#teamSelect, #refreshTeams").removeAttr("disabled");
}


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


function resetDoneAlarm(doneFrequency){
  localStorage.doneFrequency = doneFrequency;
  
  if(doneFrequency > 0)
    chrome.alarms.create(DONE_CHECKER_ALARM, {
      periodInMinutes: parseInt(doneFrequency)
    });
  else
    chrome.alarms.clear(DONE_CHECKER_ALARM);
  
  confirmSave("updateFrequency");
}
