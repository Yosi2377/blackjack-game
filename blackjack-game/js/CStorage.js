// CStorage.js - Persistent game state management
var CStorage = (function() {
    var STORAGE_KEY = 'blackjack_game_state';
    
    function isAvailable() {
        try {
            var test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    function loadState() {
        if (!isAvailable()) return null;
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('[CStorage] Failed to load state:', e);
        }
        return null;
    }
    
    function saveState(state) {
        if (!isAvailable()) return false;
        try {
            var existing = loadState() || {};
            var merged = Object.assign({}, existing, state);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return true;
        } catch (e) {
            console.warn('[CStorage] Failed to save state:', e);
            return false;
        }
    }
    
    function saveCredits(credits) {
        return saveState({ credits: credits, lastSaved: Date.now() });
    }
    
    function saveTableBg(bgNumber) {
        return saveState({ tableBg: bgNumber });
    }
    
    function getCredits() {
        var state = loadState();
        return state ? state.credits : null;
    }
    
    function getTableBg() {
        var state = loadState();
        return state ? state.tableBg : null;
    }
    
    function clearState() {
        if (!isAvailable()) return;
        localStorage.removeItem(STORAGE_KEY);
    }
    
    // Public API
    return {
        saveCredits: saveCredits,
        saveTableBg: saveTableBg,
        getCredits: getCredits,
        getTableBg: getTableBg,
        clearState: clearState,
        loadState: loadState,
        saveState: saveState
    };
})();
