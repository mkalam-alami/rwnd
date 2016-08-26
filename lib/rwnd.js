window.rwnd = (function() {

    return {
        loadFile: loadFile,
        load: load
    };
    
    // View
    
    function View(el, stepTemplate) {
        this.el = el;
        this.onClickCallback = null;
        this.onClickContext = null;
        this.stepTemplate = stepTemplate;
        
        this.refresh = function(states) {
            this.el.innerHTML = '';
            for (var i = 0; i < states.length; i++) {
                var state = states[i];
                this.appendStep(state.id, state.step, state.flags, i == states.length - 1);
            }
        }
        
        this.appendStep = function(stateId, step, flags, animate) {
            // Filter links according to the current flags, format them for rendering
            var filteredLinks = [];
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
                    filteredLinks.push({
                        linkId: id,
                        linkElId: this._getElId(stateId, id),
                        linkText: link.text
                    });
                }
            }
            
            // Format flags for rendering
            var flagsMap = {};
            flags.forEach(function (flag) {
                flagsMap[flag] = true;
            });
            
            // Set up template context
            var context = {
                stateId: stateId,
                elId: this._getElId(stateId),
                links: filteredLinks,
                text: window.Mustache.render(step.text, flagsMap),
                animate: animate !== false
            };
            
            // Render and append template
            var stepHtml = window.Mustache.render(stepTemplate, context);
            var stepEl = this._stringToNode(stepHtml);
            this.el.appendChild(stepEl); // TODO CSS Fade in (remove a 'rwnd-hidden' CSS class after insertion)
            
            // Bind click listeners
            for (var id in filteredLinks) {
                var linkEl = document.getElementById(filteredLinks[id].linkElId);
                linkEl.addEventListener('click', _onClick, this);
            }
            
            // Remove "rwnd-hidden" class to allow for CSS animations
            if (animate !== false) {
                setTimeout(function() {
                    var hiddenEls = document.getElementsByClassName('rwnd-hidden');
                    for (var i = 0; i < hiddenEls.length; i++) {
                        var el = hiddenEls[i];
                        var classAttr = el.getAttribute('class');
                        el.setAttribute('class', classAttr.replace('rwnd-hidden', '').trim());
                    }
                });
            }
        }
        
        this.setOnClickCallback = function(callback, context) {
            this.onClickCallback = callback;
            this.onClickContext = context;
        }
        
        this._getElId = function(stateId, linkId) {
            if (linkId) {
                return 'link-' + stateId + '-to-' + linkId;
            }
            else {
                return 'state-' + stateId;
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
        function _onClick(e) {
            var linkEl = e.target;
            var linkStateId = parseInt(linkEl.getAttribute('data-rwnd-state'));
            var targetStepId = linkEl.getAttribute('data-rwnd-link');
            view.onClickCallback.call(view.onClickContext, linkStateId, targetStepId);
        }
        
        return this;
    }
    
    // Game model

    function Model(db) {
        this.states = [];
        this.stateIds = [];
        this.db = db;
        this.stateIdCounter = 0;
        
        this.reset = function() {            
            this.states = [];
            this.stateIds = [];
            
            this.pushState(this.db.config.start, []);
            
            // DB validation
            // TODO validate flags
            if (!this.db.config || !this.db.config.start) throw new Error('No "config.start" property set');
            if (!this.db.steps) throw new Error('No "steps" property set');
            if (!this.db.steps[this.db.config.start]) throw new Error('Starting step "' + this.db.config.start + '" missing');
            for (var id in this.db.steps) {
                var step = this.db.steps[id];
                for (var link in step.links) {
                    if (!this.db.steps[link]) throw new Error('Step "' + id + '" links to unknown step "' + link + '"');
                    if (typeof step.links[link] == 'string') {
                        step.links[link] = { // expand simple link format
                            text: step.links[link]
                        };
                    }
                }
                step.id = id; // copy id into each step for future convenience
            }
        };
        
        this.pushState = function(stepId, flags) {
            var stateId = this.stateIdCounter++;
            this.states.push({id: stateId, step: this.db.steps[stepId], flags: flags});
            this.stateIds.push(stateId);
            return stateId;
        };
        
        this.rewindToState = function(stateId) {
            var stateIndex = this.stateIds.indexOf(stateId) + 1;
            this.states.splice(stateIndex);
            this.stateIds.splice(stateIndex);
        };
        
        this.getStep = function(stepId) {
            return this.db.steps[stepId];
        };
        
        this.isLastState = function(stateId) {
            return this.stateIds.indexOf(stateId) == this.stateIds.length - 1;
        };
        
        this.getState = function(stateId) {
            return this.states[this.stateIds.indexOf(stateId)];
        };
        
        this.getLastState = function() {
            return this.states[this.states.length - 1];
        };
        
        this.getConfig = function(key, defaultValue) {
            var value = this.db.config[key];
            return (value !== undefined) ? value : defaultValue;
        };
        
        // Init game state
        this.reset();
        
        return this;
    }    
    
    // Launcher
    
    function loadFile(url, targetDomId, templateDomId, callback) {
        try {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
              if (xhttp.readyState == 4) {
                if (xhttp.status == 200) {
                    var game = load(xhttp.responseText.trim(), targetDomId, templateDomId);
                    if (callback) callback(game);
                }
                else if (xhttp.status == 404 && callback) {
                    callback(false);
                }
                else {
                    throw new Error('Failed to load "' + url + '": HTTP code ' + xhttp.status);
                }
              }
            }
            xhttp.open('GET', url, true);
            xhttp.send();
        }
        catch (e) {
            callback(false);
            throw e;
        }
    }
    
    function load(data, targetDomId, templateDomId) {
        // Set up view
        var el = document.getElementById(targetDomId);
        var stepTemplate;
        if (templateDomId.indexOf('<') == -1) {
            stepTemplate = document.getElementById(templateDomId).innerHTML;
        }
        else {
            stepTemplate = templateDomId;
        }
        var view = new View(el, stepTemplate);
        
        // Parse story & set up model
        var db;
        if (data[0] != '{' && window.jsyaml) {
            db = window.jsyaml.safeLoad(data);
            //console.log(JSON.stringify(db, null, 2)); // used for updating the JSON example
        }
        else {
            db = JSON.parse(data);
        }
        var model = new Model(db);
        
        // Start game
        var game = new Game(model, view);
        game.start();
        
        return game;
    }
    
    function Game(model, view) {
        this.model = model;
        this.view = view;
        
        this.start = function() {
            this.view.setOnClickCallback(this.followLink, this);
            this.view.refresh(this.model.states);
        };
        
        this.followLink = function(linkStateId, targetStepId) {
            var linkState = this.model.getState(linkStateId);
            var targetStep = this.model.getStep(targetStepId);
            var newFlags = this.model.db.config.persistFlags ? this.model.getLastState().flags.slice() : linkState.flags.slice();
            
            // Handle rewind
            var isRewinding = !this.model.isLastState(linkStateId);
            if (isRewinding) {
                this.model.rewindToState(linkStateId);
            }
            
            // Set flags
            if (targetStep.setFlag) {
                if (newFlags.indexOf(targetStep.setFlag) == -1) {
                    newFlags.push(targetStep.setFlag);
                }
            }
            if (targetStep.removeFlag) {
                for (var i = newFlags.length - 1; i >= 0; i--) {
                    if (newFlags[i] === targetStep.removeFlag) {
                       newFlags.splice(i, 1);
                    }
                }
            }
            
            // Move to next step
            var stateId = this.model.pushState(targetStepId, newFlags);
            
            // Update views
            if (isRewinding) {
                // TODO support removing steps for performance
                this.view.refresh(this.model.states);
            }
            else {
                this.view.appendStep(stateId, targetStep, newFlags);
            }
        };

        return this;
    }
    
})();