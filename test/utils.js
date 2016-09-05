window.rwndTest = (function() {
    
    return {
        run: run,
        runFromData: runFromData
    };
    
    function run(url, options) {
        rwnd.run('/base/test/' + url, _withCustomView(options));
    }
    
    function runFromData(data, options) {
        rwnd.runFromData(data, _withCustomView(options));
    }
    
    function _withCustomView(options) {
        if (typeof options == 'function') {
            options = {callback: options};
        }
        options = options || {};
        options.customView = new TestView();
        options.customView.init();
        return options;
    }
    
    function TestView() {
        
        // View API implementation 
        
        this.init = function(options) {
            this.listeners = {};
            this.model = null;
        }
        
        this.refresh = function(model) {
            this.model = model;
        }
        
        this.appendStep = function(model, state, renderOptions) {
            this.model = model;
        }
        
        this.addListener = function(eventId, callback, context) {
            this.listeners[eventId] = this.listeners[eventId] || [];
            this.listeners[eventId].push({
                callback: callback,
                context: context
            })
        }
        
        // Test functions > Click
        
        this.clickLink = function(stepIdOrState, linkIndex) {
            var state;
            if (typeof stepIdOrState == 'string')
                state = this.findLastStepState(stepIdOrState);
            else
                state = stepIdOrState;
            
            if (state != null) {
                if (this.isLinkSatisfied(state, linkIndex))
                    this._fireEvent('link', [state.id, linkIndex])
                else
                    throw new Error('link ' + linkIndex + ' of step ' + stepId + ' is not visible');
            }
            else {
                throw new Error('step ID not found: ' + stepId);
            }
        }
        
        this.clickCancel = function() {
            this._fireEvent('cancel');
        }
        
        this.clickRestart = function() {
            this._fireEvent('restart');
        }
        
        // Test functions > Find states
        
        this.findStepStates = function(stepId) {
            var states = [];
            this.model.states.forEach(function(state) {
                if (state.step.id == stepId)
                    states.push(state);
            });
            return states;
        }        
        
        this.findLastStepState = function(stepId) {
            var states = this.findStepStates(stepId);
            return (states.length > 0) ? states[states.length - 1] : null;
        }
        
        // Test functions > test history
        
        this.isStepShown = function(stepId) {
            return this.findStepStates(stepId).length > 0;
        }
        
        this.computeHistory = function() {
            var history = [];
            this.model.states.forEach(function(state) {
                history.push(state.step.id);
            });
            return history;
        }
        
        this.matchHistory = function(stepIds) {
            var history = this.computeHistory();
            if (this.model.states.length != stepIds.length) {
                return false;
            }
            else {
                for (var i = 0; i < stepIds.length; i++) {
                    if (history[i] != stepIds[i]) {
                        return false;
                    }
                }
            }
            return true;
        }
        
        // Test functions > test links
        
        this.visibleLinksMatch = function(linkIndexes, state) {
            state = state || this.model.getLastState();
            var linkIndexesIndex = 0;
            var match = true;
            state.step.links.forEach(function(link, index) {
                if (this.isLinkSatisfied(link, state.flags)) {
                    if (index != linkIndexes[linkIndexesIndex]) {
                        match = false;
                    }
                    linkIndexesIndex++;
                }
            }, this);
            return match;
        }
        
        this.isLinkSatisfied = function(stepIdOrState, linkIndex) {
            var state;
            if (typeof stepIdOrState == 'string')
                state = this.findLastStepState(stepIdOrState);
            else
                state = stepIdOrState;
            return this.model.isSatisfied(state.step.links[linkIndex], state.flags);
        }
        
        // Test functions > flags
        
        this.isFlagSet = function(flag) {
            var state = this.model.getLastState();
            return state.flags[flag];
        }
        
        // Test functions > internal
        
        this._fireEvent = function(eventId, parameters) {
            if (this.listeners[eventId]) {
                this.listeners[eventId].forEach(function(listener) {
                    listener.callback.apply(listener.context, parameters);
                });
            }
        }
        
        return this;
    }
    
})();