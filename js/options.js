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
  
  // refreshTeams event handler
  $("#refreshTeams").on("click", function(e){
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
        $("#idtTokenSaved").fadeIn("fast", function(){
          $("#idtTokenSaved").delay(5000).fadeOut("fast");
        });
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
    // $(this).blur();
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


function updateTeams(callback){
  if(localStorage.teamCount > 1){
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
        
        if(st.teams.length > 1)
          $("#teams").css("display", "inherit");
      }
      
      $("#defaultTeam").text(localStorage.defaultTeam).attr("href", localStorage.defaultTeamURL);
      
      if(callback) callback();
    });
  } else {
    $("#defaultTeam").text(localStorage.defaultTeam).attr("href", localStorage.defaultTeamURL);
    $("#teams").css("display", "none");
  }
}
