'use strict';

window.rwnd = (function() {

var modelVersion = '0.2';

var defaultStepTemplate = '\
<div id="{{elId}}" class="rwnd-step{{#options.animate}} rwnd-step-hidden{{/options.animate}}">\
    <div class="rwnd-step-text">{{{text}}}</div>\
    <div class="rwnd-step-links">\
    {{#links}}\
        <span id="{{linkElId}}" class="rwnd-step-link{{#options.linksDisabled}} rwnd-step-link-disabled{{/options.linksDisabled}}"\
            data-rwnd-state="{{stateId}}" data-rwnd-link="{{linkIndex}}">[ {{{linkText}}} ]</span>\
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

return {
    run: run,
    runFromData: runFromData,
    download: download
};

// Game view

function View() {
    
    this.init = function(options) {
        // inject CSS
        if (!options.disableDefaultCss) {
            document.getElementsByTagName('head')[0].appendChild(this._stringToNode(defaultCss));
        }
        
        // inject menu
        var menuNode = this._stringToNode(options.menuTemplate || defaultMenuTemplate);
        var menuEl = options.menuEl || document.getElementById('rwnd-menu');
        menuEl.appendChild(menuNode);
        for (var childNode = menuNode.firstChild; childNode != null; childNode = childNode.nextSibling) {
            if (childNode.id == 'rwnd-cancel')
                childNode.addEventListener('click', _onClickCancel, this);
            if (childNode.id == 'rwnd-restart')
                childNode.addEventListener('click', _onClickRestart, this);
        }
        
        // view attributes
        this.stepsEl = options.stepsEl || document.getElementById('rwnd-steps');
        this.stepTemplate = options.stepTemplate || defaultStepTemplate;
        this.listeners = {};
        this.prependText = '';
    };
    
    this.refresh = function(model) {
        this.stepsEl.innerHTML = '';
        var states = model.states;
        var disableRewindTo = model.getLastState().disableRewindTo;
        
        for (var i = 0; i < states.length; i++) {
            var state = states[i];
            if (state.step.id == disableRewindTo)
                disableRewindTo = null;
            
            this.appendStep(model, state, {
                    linksDisabled: disableRewindTo != null,
                    animate: i == states.length - 1
                });
        }
    }
    
    // note: call refresh() instead if the step has a "disableRewindTo" attribute
    this.appendStep = function(model, state, renderOptions) {
        if (state.isRedirect) {
            this.prependText += this._renderFlags(state);
        }
        else {
            // default options
            renderOptions = renderOptions || {};
            if (renderOptions.linksDisabled === undefined) renderOptions.linksDisabled = false;
            if (renderOptions.animate === undefined) renderOptions.animate = true;
            
            // filter links according to the current flags, format them for rendering
            var filteredLinks = [];
            var links = state.step.links;
            for (var linkIndex in links) {
                var link = links[linkIndex];
                if (model.isSatisfied(link, state.flags)) {
                    filteredLinks.push({
                        linkIndex: linkIndex,
                        linkElId: this._getElId(state.id, linkIndex),
                        linkText: link.text
                    });
                }
            }
            
            // set up template context
            var context = {
                stateId: state.id,
                elId: this._getElId(state.id),
                links: filteredLinks,
                text: this.prependText + this._renderFlags(state),
                options: renderOptions
            };
            
            // render and append template
            var stepHtml = window.Mustache.render(this.stepTemplate, context);
            this.stepsEl.appendChild(this._stringToNode(stepHtml));
            
            // bind click listeners
            if (!renderOptions.linksDisabled) {
                for (var id in filteredLinks) {
                    var linkEl = document.getElementById(filteredLinks[id].linkElId);
                    linkEl.addEventListener('click', _onClickLink, this);
                }
            }
            
            // remove "rwnd-hidden" class on next tick to allow for CSS animations
            if (renderOptions.animate) {
                setTimeout(function() {
                    var hiddenEls = document.getElementsByClassName('rwnd-step-hidden');
                    for (var i = 0; i < hiddenEls.length; i++) {
                        var newClass = hiddenEls[i].getAttribute('class').replace('rwnd-step-hidden', '').trim();
                        hiddenEls[i].setAttribute('class', newClass);
                    }
                });
            }
            
            this.prependText = '';
        }
    }
    
    this.addListener = function(eventId, callback, context) {
        this.listeners[eventId] = this.listeners[eventId] || [];
        this.listeners[eventId].push({
            callback: callback,
            context: context
        })
    }
    
    this._renderFlags = function(state) {
        return window.Mustache.render(state.step.text, state.flags);
    }
    
    this._fireEvent = function(eventId, parameters) {
        if (this.listeners[eventId]) {
            this.listeners[eventId].forEach(function(listener) {
                listener.callback.apply(listener.context, parameters);
            });
        }
    }
    
    this._getElId = function(stateId, linkId) {
        if (linkId !== undefined) {
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
        var linkIndex = parseInt(linkEl.getAttribute('data-rwnd-link'));
        view._fireEvent('link', [linkStateId, linkIndex]);
    }
    function _onClickCancel(e) {
        view._fireEvent('cancel');
    }
    function _onClickRestart(e) {
        view._fireEvent('restart');
    }
    
    return this;
}

// Game model

function Model() {
    this.markdownParser = window.showdown ? new window.showdown.Converter() : null;
    
    this.init = function(db) {
        // validate general db format
        if (!db.steps)
            throw new Error('No "steps" property set');
        db.config = db.config || {};
        db.config.initialStep = db.config.initialStep || 'start';
        if (!db.steps[db.config.initialStep])
            throw new Error('Initial step "' + db.config.initialStep + '" missing');
        
        // validate and transform steps data
        for (var id in db.steps) {
            if (id == '-')
                throw new Error('"' + id + '" cannot be used as a step id');
            
            var step = db.steps[id];
            step.id = id; // copy id into each step for future convenience
            if (step.set)
                step.set = this._parseFlags(step.set);
            if (step.unset)
                step.unset = this._parseFlags(step.unset);
            
            // validate, parse links & redirects
            step.links = step.links || [];
            step.links.forEach(function (link, index) {
                if (!db.steps[link.to])
                    console.error('WARNING: Step "' + id + '" links to unknown step "' + link.to + '"');
                step.links[index] = this._parseLinkOrRedirect(link);
            }, this);
            step.redirects = step.redirects || [];
            step.redirects.forEach(function(redirect, index) {
                if (!db.steps[redirect.to])
                    console.error('WARNING: Redirect "' + id + '" links to unknown step "' + redirect.to + '"');
                step.redirects[index] = this._parseLinkOrRedirect(redirect);
            }, this);
            
            // text templating & newline handling
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
        this.pushState(this.getConfig('initialStep'), {});
    }
    
    this._parseLinkOrRedirect = function(o) {
        if (o.set)
            o.set = this._parseFlags(o.set);
        if (o.unset)
            o.unset = this._parseFlags(o.unset);
        if (o.if)
            o.if = this._parseFlags(o.if);
        if (o.ifNot)
            o.ifNot = this._parseFlags(o.ifNot);
        return o;
    }
    
    this._parseFlags = function(rawFlags) {
        if (typeof rawFlags == 'number') {
            rawFlags = rawFlags.toString();
        }
        if (typeof rawFlags == 'string') {
            var flags = rawFlags.split(',');
            for (var i = 0; i < flags.length; i++) {
                flags[i] = flags[i].trim();
            }
            return flags;
        }
        else {
            return rawFlags;
        }
    }
    
    this.pushState = function(stepId, flags, isRedirect) {
        this._backup();
        var state = {
            id: this.stateIdCounter++,
            step: this.db.steps[stepId],
            flags: flags,
            isRedirect: isRedirect,
            disableRewindTo: null
        };
        this.states.push(state);
        
        // compute "disableRewindTo" position
        for (var i = this.states.length - 1; i >= 0; i--) {
            var step = this.states[i].step;
            if (step.disableRewindTo) {
                if (step.disableRewindTo != '-')
                    state.disableRewindTo = step.disableRewindTo;
                break;
            }
        }
        
        return state;
    }
    
    this.rewindToState = function(stateId) {
        this._backup();
        var matchingIndex = this._stateIndexOf(stateId);
        if (matchingIndex != -1)
            this.states.splice(matchingIndex + 1);
    }
    
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
    }
    
    this.cancel = function() {
        if (this.backups.length > 0)
            this.states = this.backups.pop();
    }
    
    this.getStep = function(stepId) {
        return this.db.steps[stepId];
    }
    
    this.getState = function(stateId) {
        var matchingIndex = this._stateIndexOf(stateId);
        return (matchingIndex != -1) ? this.states[matchingIndex] : null;
    }
    
    this.getLastState = function() {
        return this.states[this.states.length - 1];
    }
    
    this.getConfig = function(key, defaultValue) {
        var value = this.db.config[key];
        return (value !== undefined) ? value : defaultValue;
    }
    
    this.saveToLocalStorage = function() {
        var saveKey = this._getSaveKey();
        if (saveKey) {
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
            window.localStorage[saveKey] = JSON.stringify({
                stateIdCounter: this.stateIdCounter,
                states: states
            });
        }
    }
    
    this.loadFromLocalStorage = function() {
        var saveKey = this._getSaveKey();
        if (saveKey && window.localStorage[saveKey]) {
            var save = JSON.parse(window.localStorage[saveKey]);
            this.stateIdCounter = parseInt(save.stateIdCounter);
            this.states = save.states;
            this.stateIds = save.stateIds;
            for (var stateId in this.states) { // restore steps from IDs
                var state = this.states[stateId];
                state.step = this.db.steps[state.step];
            }
        }
    }
    
    this._getSaveKey = function() {
        var saveId = this.getConfig('saveId', null);
        return (saveId && window.localStorage) ? ('rwnd-' + modelVersion + '-' + saveId) : null;
    }
    
    this.isSatisfied = function(linkOrRedirect, flags) {
        var satisfied = true;
        if (linkOrRedirect.if) {
            linkOrRedirect.if.forEach(function(step) {
                if (!flags[step])
                    satisfied = false;
            });
        }
        if (satisfied && linkOrRedirect.ifNot) {
            linkOrRedirect.ifNot.forEach(function(step) {
                if (flags[step])
                    satisfied = false;
            });
        }
        return satisfied;
    }
    
    this.writeFlags = function(stepOrLinkOrRedirect, flags) {
        if (stepOrLinkOrRedirect.set) {
            stepOrLinkOrRedirect.set.forEach(function(step) {
                flags[step] = true;
            });
        }
        if (stepOrLinkOrRedirect.unset) {
            stepOrLinkOrRedirect.unset.forEach(function(step) {
                delete flags[step];
            });
        }
        return flags;
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
    }
    
    this.followLink = function(linkStateId, linkId) {
        var linkState = this.model.getState(linkStateId);
        var clickedLink = linkState.step.links[linkId];
        var targetStep = this.model.getStep(clickedLink.to);
        var forceViewRefresh = false;
        
        // apply link flags
        var newFlags;
        if (this.model.getConfig('persistFlags', false))
            newFlags = this._copyObject(this.model.getLastState().flags);
        else
            newFlags = this._copyObject(linkState.flags);
        newFlags = this.model.writeFlags(clickedLink, newFlags);
        
        // handle rewind
        if (this.model.getLastState().id != linkStateId) {
            this.model.rewindToState(linkStateId);
            forceViewRefresh = true;
        }
        
        var state;
        do {
            // apply step flags
            newFlags = this.model.writeFlags(targetStep, newFlags);
            
            // register step
            var redirect = this._computeRedirect(targetStep, newFlags);
            state = this.model.pushState(targetStep.id, newFlags, redirect != null);
            
            // update view
            if (state.step.disableRewindTo)
                forceViewRefresh = true;
            if (!forceViewRefresh)
                this.view.appendStep(this.model, state);
            
            // follow redirect
            if (redirect != null) {
                this.model.writeFlags(redirect, newFlags);
                targetStep = this.model.getStep(redirect.to);
            }
        } while (state.isRedirect);
        
        // save
        this.model.saveToLocalStorage();
        
        // force view refresh (if we are rewinding, or a "disableRewindTo" flag has been set)
        if (forceViewRefresh)
            this.view.refresh(this.model);
    }
    
    this._computeRedirect = function(step, flags) {
        var pickedRedirect = null;
        if (step.redirects) {
            step.redirects.forEach(function(redirect) {
                if (!pickedRedirect && this.model.isSatisfied(redirect, flags))
                    pickedRedirect = redirect;
            }, this);
        }
        return pickedRedirect;
    }
    
    this.cancel = function() {
        this.model.cancel();
        this.view.refresh(this.model);
    }

    this.restart = function() {
        this.model.init(this.model.db);
        this.view.refresh(this.model);
        this.model.saveToLocalStorage();
    }
    
    this._copyObject = function(o) {
        return JSON.parse(JSON.stringify(o));
    }
    
    return this;
}

// Launcher

function run(url, options) {
    var options = options || {};
    
    download(url, function(status, text) {
        if (status == 200)
            runFromData(text, options);
        else if (status == 404 && options.callback)
            options.callback(false);
        else
            throw new Error('Failed to load "' + url + '": HTTP code ' + status);
    });
}

function runFromData(data, options) {
    var options = options || {};
    if (typeof options == 'function') {
        options = {callback: options}; // allow to just pass a callback rather than options
    }
    
    // set up view
    var view;
    if (options.customView) {
        view = options.customView;
    }
    else {
        view = new View();
        view.init(options);
    }
    
    // parse story & set up model
    var db;
    if (data[0] != '{' && window.jsyaml)
        db = window.jsyaml.safeLoad(data);
    else if (typeof data == 'string')
        db = JSON.parse(data);
    else
        db = data;
    if (options.logJson)
        console.log(JSON.stringify(db, null, 2));
    var model = new Model();
    model.init(db);
    if (options.logDb)
        console.log(JSON.stringify(db, null, 2));
    model.loadFromLocalStorage();
    
    // start game
    var game = new Game(model, view);
    game.start();
    
    // callback
    if (options.callback)
        options.callback(game);
    
    return game;
}

function download(url, callback) {
    try {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4) {
                callback(xhttp.status, xhttp.responseText.trim());
            }
        }
        xhttp.open('GET', url, true);
        xhttp.send();
    }
    catch (e) {
        callback(-1);
        throw e;
    }
}
    
})();