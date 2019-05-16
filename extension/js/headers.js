var tabId = parseInt(window.location.search.substring(1));
var filters = { urls: ["<all_urls>"], tabId: tabId };
var requests = new Map();
var response = new Map();
var tsURL = "";

function executeScriptToCurrentTab(code) {
    chrome.tabs.executeScript(tabId, { code: code });
}

function addListeners() {
    chrome.webRequest.onBeforeRequest.addListener(handleEvent, filters, ["requestBody"]);
    chrome.webRequest.onSendHeaders.addListener(handleEvent, filters, ["requestHeaders", "extraHeaders"]);
    chrome.webRequest.onBeforeRedirect.addListener(handleEvent, filters, ["responseHeaders", "extraHeaders"]);
    chrome.webRequest.onCompleted.addListener(handleEvent, filters, ["responseHeaders", "extraHeaders"]);
    /*chrome.webRequest.onBeforeRequest.addListener(handleEvent, filters, ['requestBody']);
    chrome.webRequest.onSendHeaders.addListener(handleEvent, filters, ['requestHeaders']);
    chrome.webRequest.onBeforeRedirect.addListener(handleEvent, filters, ['responseHeaders']);
    chrome.webRequest.onCompleted.addListener(handleEvent, filters, ['responseHeaders']);*/
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
var BlobReader = new FileReader();
var m3u8Tuple;
var tsPromise = [];
BlobReader.onload = function() {
    m3u8Tuple = this.result.match(/[-\\w]+?.ts/g);
    for (let i = 0; i < (m3u8Tuple.length) / 400; i++) {
        let j = i;
        asyncPool(1, m3u8Tuple.slice(i * 400, i * 400 + 400), tsDownload).then(values => {
            console.log(values);
            a = document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob(values));
            a.download = i + ".ts";
            a.click();
        })
    }
        /*asyncPool(5, m3u8Tuple.slice(400, 1000), tsDownload).then(values => {
            console.log(values);
            a = document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob(values));
            a.download = "3.ts";
            a.click();
        })*/
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
    $('button#clear').click(clearContent);
    $('button#close').click(closeWindow);
    $('button#pause').click(pauseCapture);
});

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
