/**
 * CMultiplayerManager - Handles multiplayer synchronization via Supabase
 */
function CMultiplayerManager(oConfig) {
    var _self = this;
    var _oSupabase = null;
    var _sTableId = null;
    var _sPlayerId = null;
    var _sPlayerName = null;
    var _iSeatIndex = -1;
    var _oChannel = null;
    var _aPlayers = [];
    var _oGameState = null;
    var _bIsHost = false;
    var _aCbCompleted = {};
    var _aCbOwner = {};

    // Events
    this.EVENT_PLAYER_JOINED = 'player_joined';
    this.EVENT_PLAYER_LEFT = 'player_left';
    this.EVENT_GAME_STATE_CHANGED = 'game_state_changed';
    this.EVENT_PLAYER_BET = 'player_bet';
    this.EVENT_PLAYER_ACTION = 'player_action';
    this.EVENT_TURN_CHANGED = 'turn_changed';
    this.EVENT_DEAL_CARDS = 'deal_cards';
    this.EVENT_ROUND_END = 'round_end';
    this.EVENT_CONNECTED = 'connected';
    this.EVENT_DISCONNECTED = 'disconnected';
    this.EVENT_ERROR = 'error';

    // Game phases
    this.PHASE_WAITING = 'waiting';
    this.PHASE_BETTING = 'betting';
    this.PHASE_DEALING = 'dealing';
    this.PHASE_PLAYING = 'playing';
    this.PHASE_DEALER_TURN = 'dealer_turn';
    this.PHASE_RESULTS = 'results';

    this._init = function() {
        _sPlayerId = this._generatePlayerId();
        _sPlayerName = oConfig.playerName || 'Player_' + _sPlayerId.substr(0, 4);
        
        // Initialize Supabase if URL and key provided
        if (oConfig.supabaseUrl && oConfig.supabaseKey) {
            this._initSupabase(oConfig.supabaseUrl, oConfig.supabaseKey);
        }
    };

    this._initSupabase = function(url, key) {
        if (typeof supabase !== 'undefined') {
            _oSupabase = supabase.createClient(url, key);
            console.log('[MP] Supabase initialized');
        } else {
            console.error('[MP] Supabase library not loaded');
        }
    };

    this._generatePlayerId = function() {
        return 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    };

    /**
     * Create a new table/room
     */
    this.createTable = function(sTableName, iMaxPlayers, cbComplete) {
        _sTableId = sTableName || 'table_' + Math.random().toString(36).substr(2, 6);
        _bIsHost = true;
        
        _oGameState = {
            tableId: _sTableId,
            phase: this.PHASE_WAITING,
            hostId: _sPlayerId,
            maxPlayers: iMaxPlayers || 4,
            players: [],
            currentTurn: -1,
            dealerCards: [],
            dealerValue: 0,
            deck: [],
            roundNumber: 0
        };

        this._joinChannel(function(bSuccess) {
            if (bSuccess) {
                _self._addPlayer(_sPlayerId, _sPlayerName, 0);
                _self._broadcastState();
            }
            if (cbComplete) cbComplete(bSuccess, _sTableId);
        });
    };

    /**
     * Join an existing table
     */
    this.joinTable = function(sTableId, cbComplete) {
        _sTableId = sTableId;
        _bIsHost = false;

        this._joinChannel(function(bSuccess) {
            if (bSuccess) {
                // Request current state from host
                _self._sendMessage('request_state', { playerId: _sPlayerId, playerName: _sPlayerName });
            }
            if (cbComplete) cbComplete(bSuccess);
        });
    };

    this._joinChannel = function(cbComplete) {
        if (!_oSupabase) {
            console.error('[MP] Supabase not initialized');
            if (cbComplete) cbComplete(false);
            return;
        }

        _oChannel = _oSupabase.channel('table:' + _sTableId, {
            config: {
                broadcast: { self: false }
            }
        });

        _oChannel
            .on('broadcast', { event: 'game_message' }, function(payload) {
                _self._handleMessage(payload.payload);
            })
            .on('presence', { event: 'sync' }, function() {
                var state = _oChannel.presenceState();
                console.log('[MP] Presence sync:', state);
            })
            .on('presence', { event: 'join' }, function(payload) {
                console.log('[MP] Player joined presence:', payload);
            })
            .on('presence', { event: 'leave' }, function(payload) {
                console.log('[MP] Player left presence:', payload);
                _self._handlePlayerDisconnect(payload);
            })
            .subscribe(function(status) {
                console.log('[MP] Channel status:', status);
                if (status === 'SUBSCRIBED') {
                    // Track presence
                    _oChannel.track({
                        odUser_id: _sPlayerId,
                        user_name: _sPlayerName,
                        online_at: new Date().toISOString()
                    });
                    
                    _self._fireEvent(_self.EVENT_CONNECTED, { tableId: _sTableId });
                    if (cbComplete) cbComplete(true);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    _self._fireEvent(_self.EVENT_DISCONNECTED, { reason: status });
                    if (cbComplete) cbComplete(false);
                }
            });
    };

    this._sendMessage = function(sType, oData) {
        if (!_oChannel) return;
        
        _oChannel.send({
            type: 'broadcast',
            event: 'game_message',
            payload: {
                type: sType,
                senderId: _sPlayerId,
                data: oData,
                timestamp: Date.now()
            }
        });
    };

    this._broadcastState = function() {
        this._sendMessage('state_update', _oGameState);
    };

    this._handleMessage = function(oPayload) {
        var sType = oPayload.type;
        var sSenderId = oPayload.senderId;
        var oData = oPayload.data;

        console.log('[MP] Received:', sType, oData);

        switch (sType) {
            case 'request_state':
                if (_bIsHost) {
                    // Find available seat for new player
                    var iSeat = this._findAvailableSeat();
                    if (iSeat >= 0) {
                        this._addPlayer(oData.playerId, oData.playerName, iSeat);
                        this._broadcastState();
                    } else {
                        this._sendMessage('table_full', { playerId: oData.playerId });
                    }
                }
                break;

            case 'state_update':
                if (!_bIsHost) {
                    _oGameState = oData;
                    // Find our seat
                    for (var i = 0; i < _oGameState.players.length; i++) {
                        if (_oGameState.players[i].id === _sPlayerId) {
                            _iSeatIndex = _oGameState.players[i].seatIndex;
                            break;
                        }
                    }
                    this._fireEvent(this.EVENT_GAME_STATE_CHANGED, _oGameState);
                }
                break;

            case 'player_bet':
                if (_bIsHost) {
                    this._updatePlayerBet(sSenderId, oData.bet);
                    this._broadcastState();
                    this._checkAllBetsPlaced();
                }
                this._fireEvent(this.EVENT_PLAYER_BET, { playerId: sSenderId, bet: oData.bet });
                break;

            case 'player_action':
                if (_bIsHost) {
                    this._processPlayerAction(sSenderId, oData.action, oData.params);
                }
                this._fireEvent(this.EVENT_PLAYER_ACTION, { playerId: sSenderId, action: oData.action });
                break;

            case 'deal_cards':
                this._fireEvent(this.EVENT_DEAL_CARDS, oData);
                break;

            case 'turn_change':
                this._fireEvent(this.EVENT_TURN_CHANGED, oData);
                break;

            case 'round_end':
                this._fireEvent(this.EVENT_ROUND_END, oData);
                break;

            case 'table_full':
                if (oData.playerId === _sPlayerId) {
                    this._fireEvent(this.EVENT_ERROR, { message: 'Table is full' });
                }
                break;
        }
    };

    this._addPlayer = function(sPlayerId, sPlayerName, iSeatIndex) {
        var oPlayer = {
            id: sPlayerId,
            name: sPlayerName,
            seatIndex: iSeatIndex,
            bet: 0,
            cards: [],
            handValue: 0,
            status: 'waiting', // waiting, betting, playing, stand, bust, blackjack
            credits: 1000
        };
        
        _oGameState.players.push(oPlayer);
        
        if (sPlayerId === _sPlayerId) {
            _iSeatIndex = iSeatIndex;
        }
        
        this._fireEvent(this.EVENT_PLAYER_JOINED, oPlayer);
        return oPlayer;
    };

    this._findAvailableSeat = function() {
        var aOccupied = _oGameState.players.map(function(p) { return p.seatIndex; });
        for (var i = 0; i < _oGameState.maxPlayers; i++) {
            if (aOccupied.indexOf(i) === -1) {
                return i;
            }
        }
        return -1;
    };

    this._updatePlayerBet = function(sPlayerId, iBet) {
        for (var i = 0; i < _oGameState.players.length; i++) {
            if (_oGameState.players[i].id === sPlayerId) {
                _oGameState.players[i].bet = iBet;
                _oGameState.players[i].status = 'ready';
                break;
            }
        }
    };

    this._checkAllBetsPlaced = function() {
        if (_oGameState.phase !== this.PHASE_BETTING) return;
        
        var bAllReady = true;
        for (var i = 0; i < _oGameState.players.length; i++) {
            if (_oGameState.players[i].bet <= 0) {
                bAllReady = false;
                break;
            }
        }
        
        if (bAllReady) {
            this.startDealing();
        }
    };

    this._processPlayerAction = function(sPlayerId, sAction, oParams) {
        // Verify it's this player's turn
        var iCurrentTurn = _oGameState.currentTurn;
        if (iCurrentTurn < 0 || _oGameState.players[iCurrentTurn].id !== sPlayerId) {
            console.warn('[MP] Not this player\'s turn');
            return;
        }

        var oPlayer = _oGameState.players[iCurrentTurn];

        switch (sAction) {
            case 'hit':
                // Deal card to player (handled by CGame)
                break;
            case 'stand':
                oPlayer.status = 'stand';
                this._nextTurn();
                break;
            case 'double':
                oPlayer.bet *= 2;
                // Deal one card then stand
                break;
            case 'split':
                // Handle split
                break;
        }

        this._broadcastState();
    };

    this._nextTurn = function() {
        var iNext = _oGameState.currentTurn + 1;
        
        // Find next active player
        while (iNext < _oGameState.players.length) {
            var oPlayer = _oGameState.players[iNext];
            if (oPlayer.status !== 'bust' && oPlayer.status !== 'stand' && oPlayer.status !== 'blackjack') {
                break;
            }
            iNext++;
        }

        if (iNext >= _oGameState.players.length) {
            // All players done, dealer's turn
            _oGameState.phase = this.PHASE_DEALER_TURN;
            _oGameState.currentTurn = -1;
            this._sendMessage('turn_change', { turn: 'dealer' });
        } else {
            _oGameState.currentTurn = iNext;
            this._sendMessage('turn_change', { turn: iNext, playerId: _oGameState.players[iNext].id });
        }

        this._fireEvent(this.EVENT_TURN_CHANGED, { turn: _oGameState.currentTurn });
    };

    this._handlePlayerDisconnect = function(oPayload) {
        // Remove player from game state
        if (_bIsHost && oPayload.leftPresences) {
            for (var i = 0; i < oPayload.leftPresences.length; i++) {
                var sLeftId = oPayload.leftPresences[i].user_id;
                for (var j = 0; j < _oGameState.players.length; j++) {
                    if (_oGameState.players[j].id === sLeftId) {
                        var oLeftPlayer = _oGameState.players.splice(j, 1)[0];
                        this._fireEvent(this.EVENT_PLAYER_LEFT, oLeftPlayer);
                        break;
                    }
                }
            }
            this._broadcastState();
        }
    };

    // Public methods

    this.startBetting = function() {
        if (!_bIsHost) return;
        
        _oGameState.phase = this.PHASE_BETTING;
        for (var i = 0; i < _oGameState.players.length; i++) {
            _oGameState.players[i].bet = 0;
            _oGameState.players[i].status = 'betting';
            _oGameState.players[i].cards = [];
            _oGameState.players[i].handValue = 0;
        }
        _oGameState.dealerCards = [];
        _oGameState.dealerValue = 0;
        _oGameState.roundNumber++;
        
        this._broadcastState();
    };

    this.placeBet = function(iBet) {
        this._sendMessage('player_bet', { bet: iBet });
        
        // If host, also update locally
        if (_bIsHost) {
            this._updatePlayerBet(_sPlayerId, iBet);
            this._broadcastState();
            this._checkAllBetsPlaced();
        }
    };

    this.startDealing = function() {
        if (!_bIsHost) return;
        
        _oGameState.phase = this.PHASE_DEALING;
        this._broadcastState();
        this._sendMessage('deal_cards', { phase: 'start' });
    };

    this.startPlayerTurns = function() {
        if (!_bIsHost) return;
        
        _oGameState.phase = this.PHASE_PLAYING;
        _oGameState.currentTurn = 0;
        
        // Skip players with blackjack
        while (_oGameState.currentTurn < _oGameState.players.length && 
               _oGameState.players[_oGameState.currentTurn].status === 'blackjack') {
            _oGameState.currentTurn++;
        }
        
        this._broadcastState();
        this._fireEvent(this.EVENT_TURN_CHANGED, { turn: _oGameState.currentTurn });
    };

    this.sendAction = function(sAction, oParams) {
        this._sendMessage('player_action', { action: sAction, params: oParams || {} });
        
        if (_bIsHost) {
            this._processPlayerAction(_sPlayerId, sAction, oParams);
        }
    };

    this.endRound = function(aResults) {
        if (!_bIsHost) return;
        
        _oGameState.phase = this.PHASE_RESULTS;
        this._broadcastState();
        this._sendMessage('round_end', { results: aResults });
    };

    this.addEventListener = function(sEvent, cbCompleted, cbOwner) {
        _aCbCompleted[sEvent] = cbCompleted;
        _aCbOwner[sEvent] = cbOwner;
    };

    this._fireEvent = function(sEvent, oData) {
        if (_aCbCompleted[sEvent]) {
            _aCbCompleted[sEvent].call(_aCbOwner[sEvent], oData);
        }
    };

    // Getters

    this.getPlayerId = function() { return _sPlayerId; };
    this.getPlayerName = function() { return _sPlayerName; };
    this.getTableId = function() { return _sTableId; };
    this.getSeatIndex = function() { return _iSeatIndex; };
    this.isHost = function() { return _bIsHost; };
    this.getGameState = function() { return _oGameState; };
    this.getPlayers = function() { return _oGameState ? _oGameState.players : []; };
    this.getCurrentTurn = function() { return _oGameState ? _oGameState.currentTurn : -1; };
    this.getPhase = function() { return _oGameState ? _oGameState.phase : null; };
    this.isMyTurn = function() {
        if (!_oGameState || _oGameState.currentTurn < 0) return false;
        return _oGameState.players[_oGameState.currentTurn].id === _sPlayerId;
    };

    this.disconnect = function() {
        if (_oChannel) {
            _oChannel.unsubscribe();
            _oChannel = null;
        }
        _oGameState = null;
        _sTableId = null;
    };

    this._init();
}

var s_oMultiplayerManager = null;
