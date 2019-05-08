chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({ url: "headers.html?" + tab.id });
});