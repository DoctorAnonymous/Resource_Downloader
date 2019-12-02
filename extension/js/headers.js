var tabId = parseInt(window.location.search.substring(1));
var filters = { urls: ["<all_urls>"], tabId: tabId };
var requests = new Map();
var response = new Map();
var tsURL = "";
var urls = new Array();

function executeScriptToCurrentTab(code) {
    chrome.tabs.executeScript(tabId, { code: code });
}

function addListeners() {
    chrome.webRequest.onBeforeRequest.addListener(handleEvent, filters, ["requestBody"]);
    chrome.webRequest.onSendHeaders.addListener(handleEvent, filters, ["requestHeaders", "extraHeaders"]);
    chrome.webRequest.onBeforeRedirect.addListener(handleEvent, filters, ["responseHeaders", "extraHeaders"]);
    chrome.webRequest.onCompleted.addListener(handleEvent, filters, ["responseHeaders", "extraHeaders"]);
    chrome.webRequest.onErrorOccurred.addListener(handleEvent, filters);
}

function removeListeners() {
    chrome.webRequest.onBeforeRequest.removeListener(handleEvent);
    chrome.webRequest.onSendHeaders.removeListener(handleEvent);
    chrome.webRequest.onBeforeRedirect.removeListener(handleEvent);
    chrome.webRequest.onCompleted.removeListener(handleEvent);
    chrome.webRequest.onErrorOccurred.removeListener(handleEvent);
}



function handleEvent(details) {
    var addressDiv = $('div.address[id="' + details.requestId + '"]');
    if (addressDiv.length == 0) {
        var addressDiv = $('<div>').addClass("address").attr("id", details.requestId);
        //console.log(details);
        $("#container").append(addressDiv);
        var address = $('#' + details.requestId + '.address');
        //$('<div>').addClass("url").text(details.url).appendTo(addressDiv);
        address.text(details.url);
        urls.push(details.url);
        if ((/\w+?.ts/g).test(details.url)) {
            tsURL = details.url;
        }
        if (details.url.includes('m3u8')) {
            //if (true) {
            address.on('click', function() {
                alert("Download task started. Please wait. ");
                code = `
function asyncPool(poolLimit, array, iteratorFn) {
    let i = 0;
    const ret = [];
    const executing = [];
    const enqueue = function() {
        if (i === array.length) {
            return Promise.resolve();
        }
        const item = array[i++];
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        let r = Promise.resolve();
        if (executing.length >= poolLimit) {
            r = Promise.race(executing);
        }
        return r.then(() => enqueue());
    };
    return enqueue().then(() => Promise.all(ret));
}
const tsDownload = function(tsFilename) {
    return new Promise(function(resolve, reject) {
        fetch('${tsURL}'.replace(/[-\\w]+?.ts/g, tsFilename)).then(response => response.blob()).then(blob => {
            var reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            reader.onload = function() {
                resolve(this.result);
            }
        }).catch(() => {
            fetch('${tsURL}'.replace(/[-\\w]+?.ts/g, tsFilename)).then(response => response.blob()).then(blob => {
                var reader = new FileReader();
                reader.readAsArrayBuffer(blob);
                reader.onload = function() {
                    resolve(this.result);
                }
            }).catch(() => { resolve(new ArrayBuffer()); })
        })
    })
}

const fragDownload = function(fragName) {
    return new Promise(function(resolve, reject) {
        asyncPool(3, fragName[0], tsDownload).then(values => {
            console.log(values);
            let a = document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob(values));
            a.download = fragName[1];
            a.click();
            resolve(1);
        })
    })
}
var BlobReader = new FileReader();
var m3u8Tuple;
var fragNames = [];
BlobReader.onload = function() {
    m3u8Tuple = this.result.match(/[-\\w]+?.ts/g);
    for (let i = 0; i < (m3u8Tuple.length) / 100; i++) {
        fragNames = fragNames.concat([
            [m3u8Tuple.slice(i * 100, i * 100 + 100), i + '.ts']
        ])
    }
    console.log(fragNames);
    asyncPool(1, fragNames, fragDownload).then(values => { console.log(values) });
}
fetch('${this.innerText}').then(response => response.blob()).then(blob => { BlobReader.readAsText(blob) })`;
                console.log(code);
                chrome.tabs.executeScript(tabId, { code: code })
            })
        } else {
            address.on('click', function() {
                alert("Download task started. Please wait. ");
                code = "fetch('" + this.innerText + "',{credentials: 'include'}).then(response=>response.blob()).then(blob=>{tmp=document.createElement('a');tmp.href=window.URL.createObjectURL(blob);tmp.download='';tmp.click();})";
                chrome.tabs.executeScript(tabId, { code: code });
                //console.log(code);
            })
        }
    }



    if (details.requestHeaders) {
        requests.set(details.requestId, details);
        //console.log(requests);
        //$("#container").append("<!-- DEBUG: " + JSON.stringify(details) + "--> \n");
        //$('<div>').addClass("request").text('\n' + details.method + ' ' + details.url).appendTo(addressDiv);
        //addressDiv.children().last().append(formatHeaders(details.requestHeaders));
    } else if (details.redirectUrl) {
        //$('<div>').addClass("redirect").text('\n' + details.statusLine + "\n Redirect to: " + details.redirectUrl).appendTo(addressDiv);
        //addressDiv.children().last().append(formatHeaders(details.responseHeaders));
    } else if (details.responseHeaders) {
        //$('<div>').addClass("response").text('\n' + details.statusLine).appendTo(addressDiv);
        //addressDiv.children().last().append(formatHeaders(details.responseHeaders));
    }

    if (details.requestBody) {
        //addressDiv.children().last().append(formatPost(details.requestBody.formData));
    }
    //console.log(details);
    //}
}




function formatPost(postData) {
    var text = "";
    for (name in postData) {
        text += name + ": " + postData[name] + "\n";
    }
    var div = $('<div>').addClass("post").text(text);
    return div;
}

function formatHeaders(headers) {
    var text = "";
    for (i in headers) {
        text += headers[i].name + ": " + headers[i].value + "\n";
    }
    var div = $('<div>').addClass("headers").text(text);
    return div;
}

// Controls

$(function() {
    addListeners();
    //$('button#clear').click(clearContent);
    //$('button#close').click(closeWindow);
    //$('button#pause').click(pauseCapture);
    $('button#download').click(downloadCapture);
    $('button#redownload').click(redownloadCapture);
    $('button#tsdownload').click(tsdownloadCapture);
});

function tsdownloadCapture() {
    var m3u8Content = document.getElementById('re').value;
    m3u8Tuple = m3u8Content.match(/[-\w]+?.ts/g)
    fragNames = []
    for (let i = 0; i < (m3u8Tuple.length) / 100; i++) {
        fragNames = fragNames.concat([
            [m3u8Tuple.slice(i * 100, i * 100 + 100), i + '.ts']
        ])
    }
    alert("Download task started. Please wait. Total " + m3u8Tuple.length);

    fragNamesString = "[";
    for (let i = 0; i < fragNames.length; i++) {
        fragNamesString = fragNamesString.concat(`[[`)
        for (let j = 0; j < fragNames[i][0].length; j++) {
            fragNamesString = fragNamesString.concat(`"` + fragNames[i][0][j] + `",`)
        }
        fragNamesString = fragNamesString.concat(`],`)
        fragNamesString = fragNamesString.concat(`"` + fragNames[i][1] + `"`)
        fragNamesString = fragNamesString.concat(`],`)
    }
    fragNamesString = fragNamesString.concat(`]`)
    code = `
function asyncPool(poolLimit, array, iteratorFn) {
    let i = 0;
    const ret = [];
    const executing = [];
    const enqueue = function() {
        if (i === array.length) {
            return Promise.resolve();
        }
        const item = array[i++];
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        let r = Promise.resolve();
        if (executing.length >= poolLimit) {
            r = Promise.race(executing);
        }
        return r.then(() => enqueue());
    };
    return enqueue().then(() => Promise.all(ret));
}

var tsDownload = function(tsFilename) {
    return new Promise(function(resolve, reject) {
        fetch('${tsURL}'.replace(/[-\\w]+?.ts/g, tsFilename)).then(response => response.blob()).then(blob => {
            var reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            reader.onload = function() {
                resolve(this.result);
            }
        }).catch(() => {
            fetch('${tsURL}'.replace(/[-\\w]+?.ts/g, tsFilename)).then(response => response.blob()).then(blob => {
                var reader = new FileReader();
                reader.readAsArrayBuffer(blob);
                reader.onload = function() {
                    resolve(this.result);
                }
            }).catch(() => { resolve(new ArrayBuffer()); })
        })
    })
}
var fragDownload = function(fragName) {
    return new Promise(function(resolve, reject) {
        asyncPool(3, fragName[0], tsDownload).then(values => {
            console.log(values);
            let a = document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob(values));
            a.download = fragName[1];
            a.click();
            resolve(1);
        })
    })
}
var fragNames = ${fragNamesString};
console.log(fragNames);
if (true)
{asyncPool(1, fragNames, fragDownload).then(values => { console.log(values) })};`;
    chrome.tabs.executeScript(tabId, { code: code });
}

function downloadCapture() {
    var Content = document.getElementById('re').value;
    alert("Download task started. Please wait. ");
    code = "fetch('" + Content + "',{credentials: 'include'}).then(response=>response.blob()).then(blob=>{tmp=document.createElement('a');tmp.href=window.URL.createObjectURL(blob);tmp.download='';tmp.click();})";
    chrome.tabs.executeScript(tabId, { code: code });

}

function redownloadCapture() {
    var downloadURLs = new Array();
    var expression = new RegExp(document.getElementById('re').value, 'i');
    for (var i = 0; i < urls.length; i++) {
        if (urls[i].search(expression) != -1) {
            console.log(urls[i].search(expression))
            downloadURLs.push(urls[i])
        }
    }
    downloadURLs = Array.from(new Set(downloadURLs));
    var downloadString = `["`;
    for (var i = 0; i < downloadURLs.length; i++) {
        downloadString = downloadString.concat(downloadURLs[i])
        if (i < downloadURLs.length - 1) {
            downloadString = downloadString.concat(`","`)
        } else {
            downloadString = downloadString.concat(`"]`)
        }
    }
    console.log(downloadString)
    alert("Download task started. Please wait. Total " + downloadURLs.length);

    if (true) {
        code = `
function asyncPool(poolLimit, array, iteratorFn) {
    let i = 0;
    const ret = [];
    const executing = [];
    const enqueue = function() {
        if (i === array.length) {
            return Promise.resolve();
        }
        const item = array[i++];
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        let r = Promise.resolve();
        if (executing.length >= poolLimit) {
            r = Promise.race(executing);
        }
        return r.then(() => enqueue());
    };
    return enqueue().then(() => Promise.all(ret));
}

var fragDownload = function(fragName) {
    console.log(fragName);
    return new Promise(function(resolve, reject) {
        fetch(fragName).then(response=>response.blob()).then(blob=>{tmp=document.createElement('a');tmp.href=window.URL.createObjectURL(blob);tmp.download=fragName;tmp.click();resolve(1);})
        })
}
var fragNames = ${downloadString};

asyncPool(1, fragNames, fragDownload).then(values => { console.log(values) });
`;
        console.log(code);
        chrome.tabs.executeScript(tabId, { code: code });
    }
    if (false) {
        for (var i = 0; i < downloadURLs.length; i++) {
            chrome.tabs.executeScript(tabId, { code: "fetch('" + downloadURLs[i] + "',{credentials: 'include'}).then(response=>response.blob()).then(blob=>{tmp=document.createElement('a');tmp.href=window.URL.createObjectURL(blob);tmp.download='';tmp.click();})" });
        }
    }

}


function clearContent() {
    $('#container').empty();
}

function closeWindow() {
    window.close();
}

function pauseCapture() {
    removeListeners();
    resumeButton = $('<button>').attr('id', 'resume').text("Resume").button();
    $('button#pause').replaceWith(resumeButton);
    $('button#resume').click(resumeCapture);
}

function resumeCapture() {
    addListeners();
    pauseButton = $('<button>').attr('id', 'pause').text("Pause").button();
    $('button#resume').replaceWith(pauseButton);
    $('button#pause').click(pauseCapture);
}