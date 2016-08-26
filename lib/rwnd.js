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
        gameState.currentStep = gameDb.config.start;
        gameState.stepHistory = [gameState.currentStep];
        gameState.flags = [];
        _domRefresh();
    }
    
    function _domRefresh() {
        gameEl.innerHTML = '';
        gameState.stepHistory.forEach(function(stepId) {
            _domAppend(gameDb.steps[stepId]);
        });
    }
    
    function _domAppend(step) {
        var stepHtml = '';
        stepHtml += '<p id="step-' + step.id + '" class="rwnd-text">' + gameDb.steps[gameState.currentStep].text + '</p>';
        stepHtml += '<p id="step-' + step.id + '-links" class="rwnd-links">';
        for (var id in step.links) {
            stepHtml += '<a href="#" data-rwnd-step="' + id + '">[' + step.links[id] + ']</a> ';
        };
        stepHtml += '</p>';
        gameEl.innerHTML += stepHtml;
    }
	
})();