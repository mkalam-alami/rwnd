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
        this.disableRewindTo = null;
        
        this.refresh = function(model) {
            // First pass: find where to disable rewind to
            this.disableRewindTo = null;
            var states = model.states;
            for (var i = states.length - 1; i >= 0; i--) {
                var step = states[i].step;
                if (step.disableRewindTo) {
                    if (step.disableRewindTo != '-')
                        this.disableRewindTo = step.disableRewindTo;
                    break;
                }
            }

            // Second pass: update view
            this.el.innerHTML = '';
            var linksDisabled = this.disableRewindTo != null;
            for (var i = 0; i < states.length; i++) {
                var state = states[i];
                if (linksDisabled && state.step.id == this.disableRewindTo) {
                    linksDisabled = false;
                }
                this.appendStep(model, state.id, state.step, state.flags, {
                        linksDisabled: linksDisabled,
                        animate: i == states.length - 1
                    });
            }
        }
        
        this.appendStep = function(model, stateId, step, flags, options) {
            // Default options
            options = options || {};
            if (options.linksDisabled === undefined) options.linksDisabled = false;
            if (options.animate === undefined) options.animate = true;
            if (options.prependText === undefined) options.prependText = '';
            
            // Handle 'continue' parameter
            if (step.continue) {
                options.prependText += step.text;
                this.appendStep(model, stateId, model.getStep(step.continue), flags, options);
            }
            
            else {
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
                
                // Render text
                var flagsMap = {};
                flags.forEach(function (flag) {
                    flagsMap[flag] = true;
                });
                var renderedText = window.Mustache.render(options.prependText + step.text, flagsMap);
                
                // Set up template context
                var context = {
                    stateId: stateId,
                    elId: this._getElId(stateId),
                    links: filteredLinks,
                    text: renderedText,
                    options: options
                };
                
                // Render and append template
                var stepHtml = window.Mustache.render(stepTemplate, context);
                this.el.appendChild(this._stringToNode(stepHtml));
                
                // Bind click listeners
                if (!options.linksDisabled) {
                    for (var id in filteredLinks) {
                        var linkEl = document.getElementById(filteredLinks[id].linkElId);
                        linkEl.addEventListener('click', _onClick, this);
                    }
                }
                
                // Remove "rwnd-hidden" class to allow for CSS animations
                if (options.animate) {
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

    function Model() {
        this.markdownParser = window.showdown ? new window.showdown.Converter() : null;
        
        this.init = function(db) {
            // DB validation
            // TODO validate flags
            if (!db.config || !db.config.start)
                throw new Error('No "config.start" property set');
            if (!db.steps)
                throw new Error('No "steps" property set');
            if (!db.steps[db.config.start])
                throw new Error('Start step "' + db.config.start + '" missing');
            
            for (var id in db.steps) {
                if (id == '-')
                    throw new Error('"' + id + '" cannot be used as a step id');
                
                var step = db.steps[id];
                step.id = id; // copy id into each step for future convenience
                
                for (var targetId in step.links) {
                    if (!db.steps[targetId])
                        console.error('WARNING: Step "' + id + '" links to unknown step "' + targetId + '"');
                    var link = step.links[targetId];
                    if (typeof link == 'string')
                        step.links[targetId] = {text: link}; // expand simple link format
                }
                
                // text newline handling
                if (step.text) {
                    var paragraphs = step.text.replace(/[\n]/g, '<br />').split('<br /><br />');
                    step.text = '';
                    paragraphs.forEach(function(paragraph) {
                       step.text += this.markdownParser ? this.markdownParser.makeHtml(paragraph) : paragraph;
                    }, this);
                }
                else {
                    step.text = '';
                }
            }
            
            // Init attributes
            this.db = db;
            this.states = [];
            this.stateIds = [];
            this.stateIdCounter = 0;
            this.pushState(this.db.config.start, []);
        };
        
        this.pushState = function(stepId, flags) {
            var state = {id: this.stateIdCounter++, step: this.db.steps[stepId], flags: flags};
            this.states.push(state);
            this.stateIds.push(state.id);
            return state;
        };
        
        this.rewindToState = function(stateId) {
            var stateIndex = this.stateIds.indexOf(stateId) + 1;
            this.states.splice(stateIndex);
            this.stateIds.splice(stateIndex);
        };
        
        this.getStep = function(stepId) {
            return this.db.steps[stepId];
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
        if (templateDomId.indexOf('<') == -1)
            stepTemplate = document.getElementById(templateDomId).innerHTML;
        else
            stepTemplate = templateDomId;
        var view = new View(el, stepTemplate);
        
        // Parse story & set up model
        var db;
        if (data[0] != '{' && window.jsyaml)
            db = window.jsyaml.safeLoad(data);
        else if (typeof data == 'string')
            db = JSON.parse(data);
        else
            db = data;
        var model = new Model();
        model.init(db);
        //console.log(JSON.stringify(db, null, 2)); // used for updating the JSON example
        
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
            this.view.refresh(this.model);
        };
        
        this.followLink = function(linkStateId, targetStepId) {
            var linkState = this.model.getState(linkStateId);
            var targetStep = this.model.getStep(targetStepId);
            var newFlags;
            if (this.model.getConfig('persistFlags', false))
                newFlags = this.model.getLastState().flags.slice()
            else
                newFlags = linkState.flags.slice();
            
            // Handle rewind
            var isRewinding = this.model.getLastState().id != linkStateId;
            if (isRewinding)
                this.model.rewindToState(linkStateId);
            
            var state;
            var options = {prependText: ''};
            do {
                // Set/Remove flags
                if (targetStep.setFlag && newFlags.indexOf(targetStep.setFlag) == -1)
                    newFlags.push(targetStep.setFlag);
                if (targetStep.removeFlag) {
                    for (var i = newFlags.length - 1; i >= 0; i--) {
                        if (newFlags[i] === targetStep.removeFlag)
                           newFlags.splice(i, 1);
                    }
                }
                
                // Move to next step
                state = this.model.pushState(targetStepId, newFlags);
                
                // Handle 'continue' attribute
                if (state.step.continue) {
                    options.prependText += state.step.text;
                    targetStepId = state.step.continue;
                    targetStep = this.model.getStep(targetStepId);
                }
            } while (state.step.continue);
            
            // Update views
            if (!isRewinding && !state.step.disableRewindTo)
                this.view.appendStep(this.model, state.id, state.step, state.flags, options);
            else
                this.view.refresh(this.model);
        };

        return this;
    }
    
})();