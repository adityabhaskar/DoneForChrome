// PocketStore Obj
var pocket = {
  CONSUMER_KEY: "35831-8bd4d3eace71e3f115dcb02a",
  accessToken: "",
  since: "",
  count: 0,
  wordCount: 0,
  username: "",
  
  // Used in extension.onLoad when pocket.accessToken may not have been populated.
  getLoginStatus : function(callback){
    ls.get("username", function(st){
      callback(st["username"]);
    });
  },
  
  isLoggedIn: function() {
    return $.trim(pocket.accessToken) !== "";
  },
  
  setLoginStatus : function(val, callback){
    ls.set({"loginStatus": val}, callback);
  },
  
  urlDecoded: function(s) {
    var o = {};
    $.each(s.split("&"), function(i, val) {
      var kv = val.split("=");
      o[kv[0]] = decodeURIComponent(kv[1]);
    });
    return o;
  },
  
  signin : function(callback){
    var redirectUrl = chrome.identity.getRedirectURL();
    
    // authorise request to get request token
    $.ajax({
      url: "https://getpocket.com/v3/oauth/request",
      type: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Accept": "application/x-www-form-urlencoded"
      },
      data: {
        consumer_key: pocket.CONSUMER_KEY,
        redirect_uri: redirectUrl
      },
      dataType: "text",
      error: function(jqxhr, status, errorThrown){
        console.log("OAuth Request Error: " + errorThrown + ", " + status);
      },
      success: function(data) {
        var requestToken = pocket.urlDecoded(data)["code"];

        chrome.identity.launchWebAuthFlow({
          url: "https://getpocket.com/auth/authorize?request_token="+requestToken+"&redirect_uri="+redirectUrl,
          interactive: true
        }, function(){
          // actual sign-in request
          $.ajax({
            url: "https://getpocket.com/v3/oauth/authorize",
            type: "POST",
            headers: {
              "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Accept": "application/x-www-form-urlencoded"
            },
            data: {
              consumer_key: pocket.CONSUMER_KEY,
              code: requestToken
            },
            dataType: "text",
            success: function(data) {
              var params = pocket.urlDecoded(data);
              var accessToken = params["access_token"];
              var username = params["username"];
              ls.set({
                accessToken: accessToken,
                username: username
              }, function() {
                pocket.accessToken = accessToken;
                pocket.username = username;
                loggedIn = true;
                pocket.initFetch(callback);
              });
            },
            error: function(jqxhr, status, errorThrown){
              console.log("Oauth Auth Error: " + errorThrown + ", " + status);
            },
          });
        });
      }
    });
  },
  
  signout: function(callback) {
    if (!pocket.isLoggedIn()) return;
    
    ls.remove(["access_token", "username", "fullList", "since", "count", "wordCount", "username"], function() {
      pocket.accessToken = null;
      pocket.username = null;
      pocket.count = 0;
      pocket.wordCount = 0;
      pocket.since = null;
      
      pocket.updateUI();
      pocket.stopTimer();
      if(callback) callback();
    });
  },
  
  initFetch: function(callback){
    $.ajax({
      url: "https://getpocket.com/v3/get",
      type: "POST",
      data: {
        consumer_key: pocket.CONSUMER_KEY,
        access_token: pocket.accessToken,
        state: "unread",
        detailType: "complete",
        sort: "newest"
      },
      dataType: "json",
      success: function(data) {
        var count = 0;
        $.each(data.list, function(key, value) {
          count++;
        });
        ls.get("showCount", function(st){
          if(st.showCount === true){
            var badgeText = (count > 0 ? ""+count : "");
            chrome.browserAction.setBadgeText({text: badgeText});
          } else {
            chrome.browserAction.setBadgeText({"text": ""});
          }
        });
        pocket.countList(data.list);
        ls.set({
          // "fullListArr": objToArr(data.list),
          "fullListObj": data.list,
          "since": data.since,
          "count": pocket.count,
          "wordCount" : pocket.wordCount,
        }, function(){
          ls.set({
            "fullListArr": objToArr(data.list)
          },function(){
            if(chrome.runtime.lastError) console.log(chrome.runtime.lastError);
            pocket.since = data.since;
            pocket.updateUI();
            pocket.startTimer();
            if(callback) callback();
          });
        });
      },
      error: function(jqxhr, status, errorThrown){
        console.log("Get Error: " + errorThrown + ", " + status);
      },
    });
  },
  
  refreshList: function(callback){
    $.ajax({
      url: "https://getpocket.com/v3/get",
      type: "POST",
      data: {
        consumer_key: pocket.CONSUMER_KEY,
        access_token: pocket.accessToken,
        since: pocket.since,
        state: pocket.since === "" ? "unread" : "all",
        detailType: "complete",
        sort: "newest",
      },
      dataType: "json",
      success: function(data) {
        ls.get(["fullListObj", "mobileTags"], function(st){
          if(st.fullListObj === undefined || st.fullListObj === null) st.fullListObj = {};
          var newItems = 0;
          var isNew = false;
          for(var key in data.list){
            switch(data.list[key].status){
              case "0":
                // Add to list
                isNew = false;
                if(st.mobileTags === true && st.fullListObj[key] === undefined){
                  newItems++;
                  isNew = true;
                }
                st.fullListObj[key] = data.list[key];
                if(st.mobileTags === true){
                  st.fullListObj[key].ppTimeTag = Math.round(st.fullListObj[key].word_count/WPM).toLocaleString() + " min";
                  if(isNew){
                    st.fullListObj[key].ppTagEdited = true;
                  }
                }
                break;
              case "1":
              case "2":
                // Remove from list
                delete st.fullListObj[key];
                break;
            }
          }
          pocket.countList(st.fullListObj);
          ls.set({
            // "fullListArr": objToArr(data.list),
            "fullListObj": st.fullListObj,
            "since": data.since,
            "count": pocket.count,
            "wordCount" : pocket.wordCount,
          }, function(){
            ls.set({
              "fullListArr": objToArr(st.fullListObj)
            },function(){
              if(chrome.runtime.lastError) console.log(chrome.runtime.lastError);
              pocket.since = data.since;
              pocket.updateUI();
              if(newItems > 0) pocket.addTimeTagsMulti();
              if(callback) callback();
            });
          });
        });
      },
      error: function(jqxhr, status, errorThrown){
        console.log("Get Error: " + errorThrown + ", " + status);
        ls.get(["since", "count", "wordCount"], function(st){
          if(st){
            pocket.since = st["since"];
            pocket.count = st["count"];
            pocket.wordCount = st["wordCount"];
            if(pocket.since !== "") pocket.updateUI();
          }
          if(callback) callback();
        });
      },
    });
  },
  
  countList : function(list){
    var count = 0;
    var wordCount = 0;
    for(var key in list){
      count++;
      wordCount+= parseInt(list[key]["word_count"]);
    }
    if(count !== pocket.count){
      ls.get("countHistory", function(st){
        var cH = st && st["countHistory"] ? st["countHistory"] : {};
        cH[Date.now()] = count;
        ls.set({"countHistory": cH});
      });
    }
    pocket.count = count;
    pocket.wordCount = wordCount;
  },
  
  updateUI : function(){
    if(pocket.isLoggedIn()){
      // Logged in, update count in badge
      chrome.browserAction.setTitle({"title": "Logged in as " + pocket.username});
      // chrome.browserAction.setBadgeBackgroundColor({"color": "#77CC77"});
      chrome.browserAction.setBadgeBackgroundColor({"color": [0,255,0,200]});
      ls.get("showCount", function(st){
        if(st.showCount === true){
          chrome.browserAction.setBadgeText({"text": pocket.count.toString()});
        } else {
          chrome.browserAction.setBadgeText({"text": ""});
        }
      });
    } else {
      // Not logged in, update badge
      resetBrowserButton();
    }
  },
  
  startTimer: function() {
    ls.get("pollingTimer",function(st){
      chrome.alarms.create("poller", {
        periodInMinutes: parseInt(st["pollingTimer"])
      });
    });
  },
  
  stopTimer: function() {
    chrome.alarms.clear("poller");
  },
  
  addToPocket: function(url, tab, fromLink) {
    if(!pocket.isLoggedIn()){
      // Show error notification saying you need to login first
      // initiate login...
      pocket.signin(function(){
        pocket.addToPocket(url, tab);
        chrome.tabs.create({
          url: chrome.extension.getURL("options.html"),
          active: true
        });
      });
      return;
    }
    
    // var url = info ? info.linkUrl ? info.linkUrl : info.pageUrl : tab.url;
    
    if(!pocket.isAcceptableURL(url)){
      console.log("url is not good for pocket: " + url);
      // showNotification({
      //   title: "Error!",
      //   message: "Cannot add page to pocket",
      // });
      return;
    }
    
    if(!navigator.onLine){
      // Add link to pending list
      pocket.addToOfflineList(url);
      return;
    }
    
    $.ajax({
      url: "https://getpocket.com/v3/add",
      type: "POST",
      data: {
        consumer_key: pocket.CONSUMER_KEY,
        access_token: pocket.accessToken,
        url: url
      },
      dataType: "json",
      success: function(data) {
        pocket.startTimer(); // Reset current timer, so it doesn't fire another update right after we trigger one here
        pocket.refreshList();
        if(fromLink === undefined || fromLink !== true){
          showBrowserButton(tab.id, true);
        }
        showNotification({
          title: "Page Added",
          icon: "red",
          message: data.item.title,
          contextMessage: data.item.excerpt
        });
      },
      error: function(jqxhr, textStatus, errorThrown){
        console.log("Error on Add: " + errorThrown + ", " + textStatus);
      }
    });
  },
  
  addToOfflineList: function(url){
    ls.get("offlineList", function(st){
      var offlineList = [];
      if(st && st["offlineList"] && st["offlineList"].length > 0){
        offlineList = st["offlineList"];
      }
      for (var i = offlineList.length - 1; i >= 0; i--) {
        if(url === offlineList[i]) return;
      }
      offlineList.push(url);
      ls.set({"offlineList": offlineList}, function(){
        showNotification({
          title: "Offline: Page Queued",
          message: "Page will be added to Pocket when back online.",
          contextMessage: url
        });
      });
    });
  },
  
  addTimeTagsMulti: function() {
    if(!pocket.isLoggedIn()){
      // Show error notification saying you need to login first
      // initiate login...
      pocket.signin(function(){
        pocket.addTimeTagsMulti();
        chrome.tabs.create({
          url: chrome.extension.getURL("options.html"),
          active: true
        });
      });
      return;
    }
    
    
    ls.get("fullListObj", function(st){
      if(st.fullListObj === undefined || st.fullListObj === null){
        // do nothing, return
        return;
      }
      
      var actionList = [];
      for(var key in st.fullListObj){
        if(st.fullListObj[key].ppTagEdited === true){
          actionList.push({
            "action" : "tags_add",
            "item_id" : st.fullListObj[key].item_id,
            "tags"   : st.fullListObj[key].ppTimeTag
          });
        }
      }
      
      if(actionList.length === 0) return;
      
      $.ajax({
        url: "https://getpocket.com/v3/send",
        type: "POST",
        data: {
          consumer_key: pocket.CONSUMER_KEY,
          access_token: pocket.accessToken,
          actions: JSON.stringify(actionList)
        },
        dataType: "json",
        success: function(data) {
          // Mark all tagEdited articles as false
          ls.get("fullListObj", function(st2){
            for (var i = 0; i < actionList.length; i++) {
              st2.fullListObj[actionList[i].item_id].ppTagEdited = false;
            }
            ls.set({
              "fullListObj": st2.fullListObj,
              "fullListArr": objToArr(st2.fullListObj)
            }, function(){
              pocket.refreshList();
            });
          });
        },
        error: function(jqxhr, textStatus, errorThrown){
          console.log("Error on Tag-add: " + errorThrown + ", " + textStatus);
        }
      });
    });
  },
  
  removeAllTimeTags: function() {
    if(!pocket.isLoggedIn()){
      // Show error notification saying you need to login first
      // initiate login...
      pocket.signin(function(){
        pocket.addTimeTagsMulti();
        chrome.tabs.create({
          url: chrome.extension.getURL("options.html"),
          active: true
        });
      });
      return;
    }
    
    
    ls.get("fullListObj", function(st){
      if(st.fullListObj === undefined || st.fullListObj === null){
        // do nothing, return
        return;
      }
      
      var actionList = [];
      for(var key in st.fullListObj){
        if(st.fullListObj[key].ppTimeTag !== undefined){
          actionList.push({
            "action" : "tags_remove",
            "item_id" : st.fullListObj[key].item_id,
            "tags"   : st.fullListObj[key].ppTimeTag
          });
        }
      }
      
      if(actionList.length === 0) return;
      
      $.ajax({
        url: "https://getpocket.com/v3/send",
        type: "POST",
        data: {
          consumer_key: pocket.CONSUMER_KEY,
          access_token: pocket.accessToken,
          actions: JSON.stringify(actionList)
        },
        dataType: "json",
        success: function(data) {
          // Remove all all tagEdited properties from articles
          ls.get("fullListObj", function(st2){
            for (var i = 0; i < actionList.length; i++) {
              delete st2.fullListObj[actionList[i].item_id].ppTimeTag;
              delete st2.fullListObj[actionList[i].item_id].ppTagEdited;
            }
            ls.set({
              "fullListObj": st2.fullListObj,
              "fullListArr": objToArr(st2.fullListObj)
            }, function(){
              pocket.refreshList();
            });
          });
        },
        error: function(jqxhr, textStatus, errorThrown){
          console.log("Error on Tag-add: " + errorThrown + ", " + textStatus);
        }
      });
    });
  },
  
/*
  saveEditToPocket: function(url, tab) {
    if(!pocket.isLoggedIn()){
      // Show error notification saying you need to login first
      // initiate login...
      pocket.signin(function(){
        pocket.saveEditToPocket(url, tab);
        chrome.tabs.create({
          url: chrome.extension.getURL("options.html"),
          active: true
        });
      });
      return;
    }
    
    // var url = info ? info.linkUrl ? info.linkUrl : info.pageUrl : tab.url;
    
    if(!pocket.isAcceptableURL(url)){
      console.log("url is not good for pocket: " + url);
      // showNotification({
      //   title: "Error!",
      //   message: "Cannot add page to pocket",
      // });
      return;
    }
    
    if(!navigator.onLine){
      // Add link to pending list
      pocket.addToOfflineList(url);
      return;
    }
    
    $.ajax({
      url: "https://getpocket.com/v3/add",
      type: "POST",
      data: {
        consumer_key: pocket.CONSUMER_KEY,
        access_token: pocket.accessToken,
        url: url
      },
      dataType: "json",
      success: function(data) {
        pocket.startTimer(); // Reset current timer, so it doesn't fire another update right after we trigger one here
        pocket.refreshList();
        showBrowserButton(tab.id, true);
        showNotification({
          title: "Page Added",
          icon: "red",
          message: data.item.title,
          contextMessage: data.item.excerpt
        });
      },
      error: function(jqxhr, textStatus, errorThrown){
        console.log("Error on Add: " + errorThrown + ", " + textStatus);
      }
    });

  },
*/
  
  syncOfflineList: function(){
    ls.get("offlineList", function(st){
      if(st && st["offlineList"] && st["offlineList"].length > 0){
        var dataArr = [];
        for (var i = 0; i < st["offlineList"].length; i++) {
          dataArr.push({
            "action": "add",
            "url": st["offlineList"][i]
          });
        }
        $.ajax({
          url: "https://getpocket.com/v3/send",
          type: "POST",
          data: {
            consumer_key: pocket.CONSUMER_KEY,
            access_token: pocket.accessToken,
            actions: JSON.stringify(dataArr)
          },
          dataType: "json",
          success: function(data) {
            pocket.startTimer(); // Reset current timer, so it doesn't fire another update right after we trigger one here
            pocket.refreshList();
            showNotification({
              title: "Offline Pages Added",
              message: dataArr.length + " articles added to Pocket",
              icon: "red"
              // contextMessage: data.item.excerpt
            });
            ls.set({"offlineList" : []});
          },
          error: function(jqxhr, textStatus, errorThrown){
            console.log("Error on Offline Add: " + errorThrown + ", " + textStatus);
            setTimeout(pocket.syncOfflineList, 2000);
          }
        });
      }
    });
  },
  
  isAcceptableURL: function(url){
    return (url === "" || /(?:https?:\/\/getpocket\.com\/a\/)|(?:chrome(?:\-extension)?:\/\/.*)|(?:about:blank)|(?:https:\/\/www.google.co.uk\/_\/chrome\/newtab)/gi.test(url)) ? false : true;
  },
  
  checkURLinList: function(url, callback){
    ls.get("fullListArr",function(st){
      var isInList = false;
      if(st && st["fullListArr"] && st["fullListArr"].length > 0){
        for (var i = 0; i < st["fullListArr"].length; i++) {
          if(st["fullListArr"][i]["resolved_url"] === url || st["fullListArr"][i]["given_url"] === url){
            isInList = true;
            break;
          }
        }
      }
      callback(isInList);
    });
  }
};
