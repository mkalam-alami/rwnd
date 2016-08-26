window.rwnd = (function() {

    var game = null;

    return {
        loadFile: loadFile,
        load: load,
        getGame: getGame
    };
    
    // View
    
    function View(el) {
        this.el = el;
        this.onLinkClickCallback = null;
        this.onLinkClickContext = null;
        this.template = template(document.getElementById('rwnd-template').innerHTML);
        
        this.refresh = function(state) {
            this.el.innerHTML = '';
            state.forEach(function(historyInfo) {
                this.appendStep(historyInfo.step, historyInfo.flags);
            }, this);
        }
        
        this.appendStep = function(step, flags) {
            // TODO Flag support
            
            var linksElIds = {};
            for (var id in step.links) {
                linksElIds[id] = this._getElId(step, id);
            }
            var context = {
                id: step.id,
                elId: this._getElId(step),
                links: step.links,
                linksElIds: linksElIds,
                text: step.text
            };
            
            var stepHtml = this.template(context);
            var stepEl = this._stringToNode(stepHtml);
            
            // TODO CSS Fade in (remove a 'rwnd-hidden' CSS class after insertion)
            this.el.appendChild(stepEl);
            
            for (var id in step.links) {
                var linkEl = document.getElementById(this._getElId(step, id));
                linkEl.addEventListener('click', _onLinkClick, this);
            }
        }
        
        this.bindOnLinkClick = function(callback, context) {
            this.onLinkClickCallback = callback;
            this.onLinkClickContext = context;
        }
        
        this._getElId = function(step, linkId) {
            if (linkId) {
                return 'link-' + step.id + '-to-' + linkId;
            }
            else {
                return 'step-' + step.id;
            }
        }
        
        this._stringToNode = function(htmlString) {
            var wrapper = document.createElement('div');
            wrapper.innerHTML = htmlString;
            for (var i = 0; i < wrapper.childNodes.length; i++) { // skip text nodes
                if (wrapper.childNodes[i].hasChildNodes()) {
                    return wrapper.childNodes[i];
                }
            }
        }
        
        var view = this;
        function _onLinkClick(e) {
            var linkEl = e.target;
            var linkStepId = linkEl.getAttribute('data-rwnd-step');
            var targetStepId = linkEl.getAttribute('data-rwnd-link');
            view.onLinkClickCallback.call(view.onLinkClickContext, linkStepId, targetStepId);
        }
        
        return this;
    }
    
    // Game model

    function Model(db) {
        this.state = [];
        this.stateIds = [];
        
        this.reset = function(db) {            
            this.state = [];
            this.stateIds = [];
            this.pushStep(this.db.config.start, []);
            
            // DB validation
            if (!db.config || !db.config.start) console.error('No "config.start" property set');
            if (!db.steps) console.error('No "steps" property set');
            if (!db.steps[db.config.start]) console.error('Starting step "' + db.config.start + '" missing');
            for (var id in db.steps) {
                var step = db.steps[id];
                for (var link in step.links) {
                    if (!db.steps[link]) console.error('Step "' + id + '" links to unknown step "' + link + '"');
                }
                step.id = id; // copy id into each step for future convenience
            }
            this.db = db;

        };
        
        this.pushStep = function(stepId, flags) {
            this.state.push({step: this.db.steps[stepId], flags: flags});
            this.stateIds.push(stepId);
        };
        
        this.rewindToStep = function(stepId) {
            var stepIndex = this.stateIds.indexOf(stepId) + 1;
            this.state.splice(stepIndex);
            this.stateIds.splice(stepIndex);
        };
        
        this.getStep = function(stepId) {
            return this.db.steps[stepId];
        };
        
        this.isLastStep = function(stepId) {
            return this.stateIds.indexOf(stepId) == this.stateIds.length - 1;
        };
        
        this.getConfig = function(key, defaultValue) {
            var value = this.db.config[key];
            return (value !== undefined) ? value : defaultValue;
        };
        
        // TODO use for flags support
        this._hashCode = function(string) {
            // source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
            var hash = 0, c;
            if (string.length == 0) return hash;
            for (i = 0; i < string.length; i++) {
                c = string.charCodeAt(i);
                hash = ((hash << 5) - hash) + c;
                hash = hash & hash;
            }
            return hash;
        }
        
        // DB 
        this.db = db;
        
        this.reset(db);
        
        return this;
    }    
    
    // Launcher
    
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
        el = document.getElementById(targetDomId);
        var view = new View(el);
        
        var db;
        if (data[0] != '{' && jsyaml)
            db = jsyaml.safeLoad(data);
        else
            db = JSON.parse(data);
        var model = new Model(db);
        
        game = new Game(model, view);
        game.start();
    }
    
    function Game(model, view) {
        this.model = model;
        this.view = view;
        
        this.start = function() {
            this.view.bindOnLinkClick(this.followLink, this);
            this.view.refresh(this.model.state);
        };
        
        this.followLink = function(linkStepId, targetStepId) {
            // TODO rewind performance (remove/add view elements rather than refreshing everything)
            // TODO flags support
            this.model.rewindToStep(linkStepId);
            this.model.pushStep(targetStepId, []);
            this.view.refresh(this.model.state);
            //this.view.appendStep(this.model.getStep(targetStepId), []);
        };

        return this;
    }
    
    function getGame() {
        return game;
    }
    
})();