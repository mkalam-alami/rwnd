window.rwnd = (function() {

    return {
        loadFile: loadFile,
        load: load
    };
    
    // Game view
    
    function View(stepsEl, menuEl, options) {
        
        this.init = function(stepsEl, menuEl, options) {
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
            .rwnd-step-links { margin: 10px; padding-bottom: 20px; }\
            .rwnd-step-link { display: block; cursor: pointer; text-decoration: none; font-weight: bold; color: #012; }\
            .rwnd-step-link:hover { color: #356; }\
            .rwnd-step-link-disabled { color: #A96; cursor: not-allowed; }\
            .rwnd-step-link-disabled:hover { color: #A96; }\
            .rwnd-step-hidden { opacity: 0.0 !important; }\
            .rwnd-menu-link { cursor: pointer; text-decoration: none; font-weight: bold; color: #012; }\
            .rwnd-menu-link:hover { color: #356; }\
            </style>';

            // Initialize attributes
            this.stepsEl = stepsEl;
            this.menuEl = menuEl;
            this.stepTemplate = options.stepTemplate || defaultStepTemplate;
            this.callbacks = [];
            
            // Initialize CSS
            if (!options.disableDefaultCss) {
                document.getElementsByTagName('head')[0].appendChild(this._stringToNode(defaultCss));
            }
            
            // Initialize menu
            var footerNode = this._stringToNode(options.menuTemplate || defaultMenuTemplate);
            this.menuEl.appendChild(footerNode);
            document.getElementById('rwnd-cancel').addEventListener('click', _onClickCancel, this); // TODO search footer children instead
            document.getElementById('rwnd-restart').addEventListener('click', _onClickRestart, this);
        };
        
        this.refresh = function(model) {
            // First pass: find where to disable rewind to
            // TODO move to model
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
            this.stepsEl.innerHTML = '';
            var linksDisabled = this.disableRewindTo != null;
            var prependText = '';
            for (var i = 0; i < states.length; i++) {
                var state = states[i];
                if (linksDisabled && state.step.id == this.disableRewindTo)
                    linksDisabled = false;
                
                if (state.step.continue)
                    prependText += state.step.text;
                else {
                    this.appendStep(model, state.id, state.step, state.flags, {
                            linksDisabled: linksDisabled,
                            animate: i == states.length - 1,
                            prependText: prependText
                        });
                    prependText = '';
                }
            }
        }
        
        this.appendStep = function(model, stateId, step, flags, options) {
            // Default options
            options = options || {};
            if (options.linksDisabled === undefined) options.linksDisabled = false;
            if (options.animate === undefined) options.animate = true;
            if (options.prependText === undefined) options.prependText = '';
            
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
        
        this.setCallback = function(id, callback, context) {
            if (['link', 'cancel', 'restart'].indexOf(id) != -1) {
                this.callbacks[id] = {
                    callback: callback,
                    context: context
                };
            }
            else
                throw new Error('Invalid callback ID: "' + id + '"');
        }
        
        this._runCallback = function(id, params) {
            var callbackInfo = this.callbacks[id];
            if (callbackInfo)
                callbackInfo.callback.apply(callbackInfo.context, params);
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
            view._runCallback('link', [linkStateId, targetStepId]);
        }
        
        function _onClickCancel(e) {
            view._runCallback('cancel');
        }
        
        function _onClickRestart(e) {
            view._runCallback('restart');
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
            
            // Init attributes
            this.db = db;
            this.backups = this.backups || []; // never clear backup history
            this.states = [];
            this.stateIds = [];
            this.stateIdCounter = this.stateIdCounter || 0;
            this.pushState(this.db.config.start, []);
        };
        
        this.pushState = function(stepId, flags) {
            this._backup();
            var state = {id: this.stateIdCounter++, step: this.db.steps[stepId], flags: flags};
            this.states.push(state);
            this.stateIds.push(state.id);
            return state;
        };
        
        this.rewindToState = function(stateId) {
            this._backup();
            var stateIndex = this.stateIds.indexOf(stateId) + 1;
            this.states.splice(stateIndex);
            this.stateIds.splice(stateIndex);
        };
        
        this._backup = function() {
            if (this.states.length >= 1) {
                this.backups.push({
                    states: this.states.slice(),
                    ids: this.stateIds.slice()
                });
            }
        };
        
        this.cancel = function() {
            if (this.backups.length > 1) {
                var backup = this.backups.pop();
                this.states = backup.states;
                this.stateIds = backup.ids;
            }
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
        
        this.saveToLocalStorage = function() {
            var gameId = this.getConfig('gameId', null);
            if (gameId && window.localStorage) {
                var states = this.states.slice();
                for (var stateId in this.states) { // don't save full steps, just IDs
                    var state = states[stateId];
                    states[stateId] = {
                        id: state.id,
                        step: state.step.id,
                        flags: state.flags
                    };
                }
                window.localStorage[gameId] = JSON.stringify({
                    stateIdCounter: this.stateIdCounter,
                    states: states,
                    stateIds: this.stateIds.slice()
                });
            }
        };
        
        this.loadFromLocalStorage = function() {
            var gameId = this.getConfig('gameId', null);
            if (gameId && window.localStorage && window.localStorage[gameId]) {
                var save = JSON.parse(window.localStorage[gameId]);
                this.stateIdCounter = parseInt(save.stateIdCounter);
                this.states = save.states;
                this.stateIds = save.stateIds;
                for (var stateId in this.states) { // restore steps from IDs
                    var state = this.states[stateId];
                    state.step = this.db.steps[state.step];
                }
            }
        }
        
        return this;
    }    
    
    // Game controller
    
    function Game(model, view) {
        this.model = model;
        this.view = view;
        
        this.start = function() {
            this.view.setCallback('link', this.followLink, this);
            this.view.setCallback('cancel', this.cancel, this);
            this.view.setCallback('restart', this.restart, this);
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
            
            // Save
            this.model.saveToLocalStorage();
            
            // Save, update views
            if (!isRewinding && !state.step.disableRewindTo) {
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