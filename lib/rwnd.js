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
            var filteredLinks = {};
            var filteredLinksElIds = {};
            for (var id in step.links) {
                var keep = true;
                var link = step.links[id];
                if (link.ifFlag) {
                    var ifFlags = link.ifFlag.split(',');
                    ifFlags.forEach(function(ifFlag) {
                        if (flags.indexOf(ifFlag) == -1) {
                            keep = false;
                        }
                    });
                }
                if (keep && link.ifNotFlag) {
                    var ifNotFlags = link.ifNotFlag.split(',');
                    ifNotFlags.forEach(function(ifNotFlag) {
                        if (flags.indexOf(ifNotFlag) != -1) {
                            keep = false;
                        }
                    });
                }
                
                if (keep) {
                    filteredLinks[id] = link;
                    filteredLinksElIds[id] = this._getElId(step, id);
                }
            }
            var context = {
                id: step.id,
                elId: this._getElId(step),
                links: filteredLinks,
                linksElIds: filteredLinksElIds,
                text: step.text
            };
            
            var stepHtml = this.template(context);
            var stepEl = this._stringToNode(stepHtml);
            
            // TODO CSS Fade in (remove a 'rwnd-hidden' CSS class after insertion)
            this.el.appendChild(stepEl);
            
            for (var id in filteredLinks) {
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
                    if (typeof step.links[link] == 'string') {
                        step.links[link] = { // expand simple link format
                            text: step.links[link]
                        };
                    }
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
        
        this.getState = function(stepId) {
            return this.state[this.stateIds.indexOf(stepId)];
        };
        
        this.getLastState = function() {
            return this.state[this.state.length - 1];
        };
        
        this.getConfig = function(key, defaultValue) {
            var value = this.db.config[key];
            return (value !== undefined) ? value : defaultValue;
        };
        
        // TODO use hash to support having the same step several times in the history
        this._hashCode = function(stepId, flags) {
            var string = stepId + '::';
            flags.forEach(function(flag) {
                string += flag + ':';
            });
            
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
        if (data[0] != '{' && jsyaml) {
            db = jsyaml.safeLoad(data);
            //console.log(JSON.stringify(db, null, 2)); // used for updating JSON example
        }
        else {
            db = JSON.parse(data);
        }
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
            var linkState = this.model.getState(linkStepId);
            var targetStep = this.model.getStep(targetStepId);
            var newFlags = this.model.db.config.persistFlags ? this.model.getLastState().flags.slice() : linkState.flags.slice();
            
            // Handle rewind
            var isRewinding = !this.model.isLastStep(linkStepId);
            if (isRewinding) {
                this.model.rewindToStep(linkStepId);
            }
            
            // Set flags
            if (targetStep.setFlag) {
                if (newFlags.indexOf(targetStep.setFlag) == -1) {
                    newFlags.push(targetStep.setFlag);
                }
            }
            if (targetStep.deleteFlag) {
                for (var i = newFlags.length - 1; i >= 0; i--) {
                    if (newFlags[i] === targetStep.deleteFlag) {
                       newFlags.splice(i, 1);
                    }
                }
            }
            
            // Move to next step
            this.model.pushStep(targetStepId, newFlags);
            
            // Update views
            if (isRewinding) {
                // TODO support removing steps for performance
                this.view.refresh(this.model.state);
            }
            else {
                this.view.appendStep(targetStep, newFlags);
            }
        };

        return this;
    }
    
    function getGame() {
        return game;
    }
    
})();