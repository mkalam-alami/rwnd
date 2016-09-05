'use strict';

window.rwnd = (function() {
    
    var modelVersion = '0.2';

    return {
        loadFile: loadFile,
        load: load
    };
    
    // Game view
    
    function View(stepsEl, menuEl, options) {
        
        this.init = function(stepsEl, menuEl, options) {
            // default HTML/CSS
            var defaultStepTemplate = '\
            <div id="{{elId}}" class="rwnd-step {{#options.animate}}rwnd-step-hidden{{/options.animate}}">\
                <div class="rwnd-step-text">{{{text}}}</div>\
                <div class="rwnd-step-links">\
                {{#links}}\
                    <span id="{{linkElId}}" class="rwnd-step-link{{#options.linksDisabled}} rwnd-step-link-disabled{{/options.linksDisabled}}"\
                        data-rwnd-state="{{stateId}}" data-rwnd-link="{{linkId}}">[ {{{linkText}}} ]</span>\
                {{/links}}\
                </div>\
            </div>';
            var defaultMenuTemplate = '\
            <div class="rwnd-menu">\
                <span id="rwnd-cancel" class="rwnd-menu-link">[ Cancel ]</span>\
                <span id="rwnd-restart" class="rwnd-menu-link">[ Restart ]</span>\
            </div>';
            var defaultCss = '\
            <style type="text/css">\
            .rwnd-step { opacity: 1.0; transition: 0.5s; }\
            .rwnd-step-hidden { opacity: 0.0; }\
            .rwnd-step-links { margin: 10px; padding-bottom: 20px; }\
            .rwnd-step-link { display: block; cursor: pointer; text-decoration: none; font-weight: bold; opacity: 0.9; }\
            .rwnd-step-link:hover { opacity: 0.7; }\
            .rwnd-step-link-disabled { opacity: 0.5; cursor: not-allowed; }\
            .rwnd-step-link-disabled:hover { opacity: 0.5; }\
            .rwnd-menu-link { cursor: pointer; text-decoration: none; font-weight: bold; }\
            .rwnd-menu-link:hover { opacity: 0.7; }\
            </style>';

            // inject CSS
            if (!options.disableDefaultCss) {
                document.getElementsByTagName('head')[0].appendChild(this._stringToNode(defaultCss));
            }
            
            // inject menu
            var menuNode = this._stringToNode(options.menuTemplate || defaultMenuTemplate);
            menuEl.appendChild(menuNode);
            for (var childNode = menuNode.firstChild; childNode != null; childNode = childNode.nextSibling) {
                if (childNode.id == 'rwnd-cancel')
                    childNode.addEventListener('click', _onClickCancel, this);
                if (childNode.id == 'rwnd-restart')
                    childNode.addEventListener('click', _onClickRestart, this);
            }
            
            // view attributes
            this.stepsEl = stepsEl;
            this.stepTemplate = options.stepTemplate || defaultStepTemplate;
            this.listeners = {};
        };
        
        this.refresh = function(model) {
            this.stepsEl.innerHTML = '';
            var prependText = '';
            var states = model.states;
            var disableRewindTo = model.getLastState().disableRewindTo;
            
            for (var i = 0; i < states.length; i++) {
                var state = states[i];
                
                // detect rewind end
                if (state.step.id == disableRewindTo)
                    disableRewindTo = null;
                
                if (state.step.continue) {
                    // redirect step
                    prependText += state.step.text;
                }
                else {
                    // rendered step
                    this.appendStep(model, state.id, state.step, state.flags, {
                            linksDisabled: disableRewindTo != null,
                            animate: i == states.length - 1,
                            prependText: prependText
                        });
                    prependText = '';
                }
            }
        }
        
        this.appendStep = function(model, stateId, step, flags, options) {
            // default options
            options = options || {};
            if (options.linksDisabled === undefined) options.linksDisabled = false;
            if (options.animate === undefined) options.animate = true;
            if (options.prependText === undefined) options.prependText = '';
            
            // filter links according to the current flags, format them for rendering
            var filteredLinks = [];
            for (var id in step.links) {
                var keep = true;
                var link = step.links[id];
                if (link.ifFlag) {
                    var ifFlags = link.ifFlag.split(',');
                    ifFlags.forEach(function(ifFlag) {
                        if (!flags[ifFlag]) {
                            keep = false;
                        }
                    });
                }
                if (keep && link.ifNotFlag) {
                    var ifNotFlags = link.ifNotFlag.split(',');
                    ifNotFlags.forEach(function(ifNotFlag) {
                        if (flags[ifNotFlag]) {
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
            
            // set up template context
            var context = {
                stateId: stateId,
                elId: this._getElId(stateId),
                links: filteredLinks,
                text: window.Mustache.render(options.prependText + step.text, flags), // render text according to flags
                options: options
            };
            
            // render and append template
            var stepHtml = window.Mustache.render(this.stepTemplate, context);
            this.stepsEl.appendChild(this._stringToNode(stepHtml));
            
            // Bind click listeners
            if (!options.linksDisabled) {
                for (var id in filteredLinks) {
                    var linkEl = document.getElementById(filteredLinks[id].linkElId);
                    linkEl.addEventListener('click', _onClickLink, this);
                }
            }
            
            // Remove "rwnd-hidden" class to allow for CSS animations
            if (options.animate) {
                setTimeout(function() {
                    var hiddenEls = document.getElementsByClassName('rwnd-step-hidden');
                    for (var i = 0; i < hiddenEls.length; i++) {
                        var el = hiddenEls[i];
                        var classAttr = el.getAttribute('class');
                        el.setAttribute('class', classAttr.replace('rwnd-step-hidden', '').trim());
                    }
                });
            }
        }
        
        this.addListener = function(eventId, callback, context) {
            this.listeners[eventId] = this.listeners[eventId] || [];
            this.listeners[eventId].push({
                callback: callback,
                context: context
            })
        }
        
        this._fireEvent = function(eventId, parameters) {
            if (this.listeners[eventId]) {
                this.listeners[eventId].forEach(function(listener) {
                    listener.callback.apply(listener.context, parameters);
                });
            }
        }
        
        this._getElId = function(stateId, linkId) {
            if (linkId) {
                return 'rwnd-link-' + stateId + '-to-' + linkId;
            }
            else {
                return 'rwnd-step-' + stateId;
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
        function _onClickLink(e) {
            var linkEl = e.target;
            var linkStateId = parseInt(linkEl.getAttribute('data-rwnd-state'));
            var targetStepId = linkEl.getAttribute('data-rwnd-link');
            view._fireEvent('link', [linkStateId, targetStepId]);
        }
        function _onClickCancel(e) {
            view._fireEvent('cancel');
        }
        function _onClickRestart(e) {
            view._fireEvent('restart');
        }
        
        this.init(stepsEl, menuEl, options);
        
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
            
            // init attributes
            this.db = db;
            this.backups = this.backups || []; // never clear backup history
            this.states = [];
            this.stateIdCounter = this.stateIdCounter || 0;
            this.pushState(this.db.config.start, {});
        };
        
        this.pushState = function(stepId, flags) {
            this._backup();
            var state = {id: this.stateIdCounter++, step: this.db.steps[stepId], flags: flags};
            this.states.push(state);
            
            // compute "disableRewindTo" position
            state.disableRewindTo = null;
            for (var i = this.states.length - 1; i >= 0; i--) {
                var step = this.states[i].step;
                if (step.disableRewindTo) {
                    if (step.disableRewindTo != '-')
                        state.disableRewindTo = step.disableRewindTo;
                    break;
                }
            }
            
            return state;
        };
        
        this.rewindToState = function(stateId) {
            this._backup();
            var matchingIndex = this._stateIndexOf(stateId);
            if (matchingIndex != -1)
                this.states.splice(matchingIndex + 1);
        };
        
        this._stateIndexOf = function(stateId) {
            var matchingIndex = -1;
            this.states.forEach(function (state, stateIndex) {
                if (state.id == stateId)
                    matchingIndex = stateIndex;
            });
            return matchingIndex;
        }
        
        this._backup = function() {
            if (this.states.length > 0)
                this.backups.push(this.states.slice());
        };
        
        this.cancel = function() {
            if (this.backups.length > 0)
                this.states = this.backups.pop();
        };
        
        this.getStep = function(stepId) {
            return this.db.steps[stepId];
        };
        
        this.getState = function(stateId) {
            var matchingIndex = this._stateIndexOf(stateId);
            return (matchingIndex != -1) ? this.states[matchingIndex] : null;
        };
        
        this.getLastState = function() {
            return this.states[this.states.length - 1];
        };
        
        this.getConfig = function(key, defaultValue) {
            var value = this.db.config[key];
            return (value !== undefined) ? value : defaultValue;
        };
        
        this.saveToLocalStorage = function() {
            var saveId = this._getSaveId();
            if (saveId) {
                var states = this.states.slice();
                for (var stateId in this.states) { // don't save full steps, just IDs
                    var state = states[stateId];
                    states[stateId] = {
                        id: state.id,
                        step: state.step.id,
                        flags: state.flags,
                        disableRewindTo: state.disableRewindTo
                    };
                }
                window.localStorage[saveId] = JSON.stringify({
                    stateIdCounter: this.stateIdCounter,
                    states: states
                });
            }
        };
        
        this.loadFromLocalStorage = function() {
            var saveId = this._getSaveId();
            if (saveId && window.localStorage[saveId]) {
                var save = JSON.parse(window.localStorage[saveId]);
                this.stateIdCounter = parseInt(save.stateIdCounter);
                this.states = save.states;
                this.stateIds = save.stateIds;
                for (var stateId in this.states) { // restore steps from IDs
                    var state = this.states[stateId];
                    state.step = this.db.steps[state.step];
                }
            }
        }
        
        this._getSaveId = function() {
            var gameId = this.getConfig('gameId', null);
            return (gameId && window.localStorage) ? ('rwnd-' + modelVersion + '-' + gameId) : null;
        }
        
        return this;
    }    
    
    // Game controller
    
    function Game(model, view) {
        this.model = model;
        this.view = view;
        
        this.start = function() {
            this.view.addListener('link', this.followLink, this);
            this.view.addListener('cancel', this.cancel, this);
            this.view.addListener('restart', this.restart, this);
            this.view.refresh(this.model);
        };
        
        this.followLink = function(linkStateId, targetStepId) {
            var linkState = this.model.getState(linkStateId);
            var targetStep = this.model.getStep(targetStepId);
            var newFlags;
            if (this.model.getConfig('persistFlags', false))
                newFlags = this._copyObject(this.model.getLastState().flags);
            else
                newFlags = this._copyObject(linkState.flags);
            
            // handle rewind
            var isRewinding = this.model.getLastState().id != linkStateId;
            if (isRewinding)
                this.model.rewindToState(linkStateId);
            
            var state;
            var options = {prependText: ''};
            do {
                // set/remove flags
                if (targetStep.setFlag) {
                    targetStep.setFlag.split(',').forEach(function(rawStep) {
                        var step = rawStep.trim();
                        newFlags[step] = step;
                    });
                }
                if (targetStep.removeFlag) {
                    targetStep.setFlag.split(',').forEach(function(rawStep) {
                        var step = rawStep.trim();
                        delete newFlags[step];
                    });
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
            
            // Save
            this.model.saveToLocalStorage();
            
            // Save, update views
            if (!isRewinding && !state.disableRewindTo) {
                this.view.appendStep(this.model, state.id, state.step, state.flags, options);
            }
            else
                this.view.refresh(this.model); // TODO Performance optimization
        };
        
        this.cancel = function() {
            this.model.cancel();
            this.view.refresh(this.model);
        };

        this.restart = function() {
            this.model.init(this.model.db);
            this.view.refresh(this.model);
        };
        
        this._copyObject = function(o) {
            return JSON.parse(JSON.stringify(o));
        };
        
        return this;
    }
    
    // Launcher
    
    function loadFile(url, options) {
        var options = options || {};
        
        try {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
              if (xhttp.readyState == 4) {
                if (xhttp.status == 200) {
                    var game = load(xhttp.responseText.trim(), options);
                    if (options.callback) options.callback(game);
                }
                else if (xhttp.status == 404 && options.callback) {
                    options.callback(false);
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
    
    function load(data, options) {
        var options = options || {};
        
        // Set up view
        var view;
        if (options.customView)
            view = options.customView;
        else
            view = new View(document.getElementById('rwnd-steps'), document.getElementById('rwnd-menu'), options);
        
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
        model.loadFromLocalStorage();
        //console.log(JSON.stringify(db, null, 2)); // used for updating the JSON example
        
        // Start game
        var game = new Game(model, view);
        game.start();
        
        return game;
    }
    
})();