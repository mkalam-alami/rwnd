window.rwnd = (function() {

    var gameEl = null;
    var gameDb = {};
    var gameState = {};

    return {
        load: load,
        loadFile: loadFile
    };
    
    function loadFile(url, targetDomId) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
          if (xhttp.readyState == 4) {
            if (xhttp.status == 200)
                load(xhttp.responseText.trim(), targetDomId);
            else
                console.error('Failed to load "' + url + '": HTTP code' + xhttp.status);
          }
        }
        xhttp.open('GET', url, true);
        xhttp.send();
    }
    
    function load(data, targetDomId) {
        gameEl = document.getElementById(targetDomId);
        if (data[0] != '{' && jsyaml)
            gameDb = jsyaml.safeLoad(data);
        else
            gameDb = JSON.parse(data);
        
        // DB validation
        if (!gameDb.config || !gameDb.config.start) console.error('No "config.start" property set');
        if (!gameDb.steps) console.error('No "steps" property set');
        if (!gameDb.steps[gameDb.config.start]) console.error('Starting step "' + gameDb.config.start + '" missing');
        for (var id in gameDb.steps) {
            var step = gameDb.steps[id];
            for (var link in step.links) {
                if (!gameDb.steps[link]) console.error('Step "' + id + '" links to unknown step "' + link + '"');
            }
            step.id = id; // copy id into each step for future convenience
        }
        
        _reset();
    }
    
    function _reset() {
        gameState.currentStepId = gameDb.config.start;
        gameState.stepHistory = [
            /*{id: string, flags: [string]}*/
        ];
        gameState.flags = [];
        _domRefresh();
    }
    
    function _domRefresh() {
        gameEl.innerHTML = '';
        _domAppend(gameState.currentStepId, []);
        gameState.stepHistory.forEach(function(historyInfo) {
            _domAppend(historyInfo.id, historyInfo.flags);
        });
    }
    
    function _domAppend(stepId, flags) {
        // TODO Flag support
        
        var step = gameDb.steps[stepId];
        var stepElId = _getElId(step);
        var stepHtml = '<div id="' + stepElId + '">';
        stepHtml += '<p id="' + stepElId + '-text" class="rwnd-text">' + step.text + '</p>';
        stepHtml += '<p id="' + stepElId + '-links" class="rwnd-links">';
        for (var id in step.links) {
            stepHtml += '<a id="' + _getElId(step, id) + '" href="#" data-rwnd-step="' + step.id + '" data-rwnd-link="' + id + '">[' + step.links[id] + ']</a> ';
        };
        stepHtml += '</p></div>';
        
        // TODO CSS Fade in
        gameEl.innerHTML += stepHtml;
        
        for (var id in step.links) {
            var linkEl = document.getElementById(_getElId(step, id));
            linkEl.addEventListener('click', _onLinkClick);
        };
    }
    
    function _getElId(step, linkId) {
        if (linkId) {
            return 'link-' + step.id + '-to-' + linkId;
        }
        else {
            return 'step-' + step.id;
        }
    }
    
    function _onLinkClick(e) {
        var linkEl = e.target;
        var targetStepId = linkEl.getAttribute('data-rwnd-link');
        gameState.currentStepId = targetStepId;
        
        // TODO Remove steps after this one if not current step
        
        _domAppend(targetStepId, []); // TODO Flags support
    }
    
})();