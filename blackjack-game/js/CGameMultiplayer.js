/**
 * CGameMultiplayer - Extended CGame with multiplayer support
 * Supports 1-5 players at positioned seats around the table
 */
function CGameMultiplayer(oData) {
    var _bUpdate = false;
    var _bPlayerTurn;
    var _bDealerLoseInCurHand = false;
    var _iInsuranceBet;
    var _iTimeElaps;
    var _iMaxBet;
    var _iMinBet;
    var _iState;
    var _iCardIndexToDeal;
    var _iDealerValueCard;
    var _iCardDealedToDealer;
    var _iAcesForDealer;
    var _iCurFichesToWait;
    var _iNextCardForPlayer;
    var _iNextCardForDealer;
    var _iGameCash;
    var _iAdsCounter;
    var _iCurrentPlayerTurn;  // Which player's turn (0-4)
    var _iNumSeats;           // Number of seats (1-5)
    
    var _aCardsDealing;
    var _aCardsInCurHandForDealer;
    var _aDealerCards;
    var _aCardDeck;
    var _aCardsInCurHandForPlayer;
    var _aCurActiveCardOffset;
    var _aCardOut;
    var _aCurDealerPattern;
    var _aSeats;              // Array of CSeat objects
    var _aPlayerBets;         // Track bets for each seat
    
    var _oStartingCardOffset;
    var _oDealerCardOffset;
    var _oReceiveWinOffset;
    var _oFichesDealerOffset;
    var _oRemoveCardsOffset;
    var _oCardContainer;
    
    var _oBg;
    var _oInterface;
    var _oGameOverPanel;
    var _oMsgBox;
    var _oMultiplayer;        // Multiplayer manager reference
    
    var _bMultiplayerMode;
    var _bWaitingForPlayers;
    var _bAllBetsPlaced;

    // Seat positions for 5 players (x, y coordinates)
    var SEAT_POSITIONS = [
        { x: 450, y: 410 },   // Seat 0 - left
        { x: 580, y: 440 },   // Seat 1 - left-center
        { x: 720, y: 460 },   // Seat 2 - center
        { x: 860, y: 440 },   // Seat 3 - right-center
        { x: 1000, y: 410 }   // Seat 4 - right
    ];

    this._init = function() {
        _iMaxBet = MAX_BET;
        _iMinBet = MIN_BET;
        _iState = -1;
        _iTimeElaps = 0;
        _iAdsCounter = 0;
        _iCurrentPlayerTurn = 0;
        _iNumSeats = oData.num_seats || 1;
        _bMultiplayerMode = oData.multiplayer || false;
        _bWaitingForPlayers = _bMultiplayerMode;
        _bAllBetsPlaced = false;

        s_oTweenController = new CTweenController();
        
        var iRandBg = Math.floor(Math.random() * 4) + 1;
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_game_' + iRandBg));
        s_oStage.addChild(_oBg);

        // Create seats based on number of players
        _aSeats = [];
        _aPlayerBets = [];
        this._createSeats(_iNumSeats);
        
        // Auto-occupy seat based on URL params or default to seat 0
        var iMySeat = oData.seat_number !== undefined ? (oData.seat_number - 1) : 0;  // Convert 1-based to 0-based
        if (iMySeat < 0 || iMySeat >= _iNumSeats) iMySeat = 0;
        
        var sPlayerName = oData.player_name || 'Player ' + (iMySeat + 1);
        
        // Occupy the seat
        _aSeats[iMySeat].setOccupied(true);
        _aSeats[iMySeat].setPlayerInfo(sPlayerName, 'local_player');
        _aSeats[iMySeat].showPlayerAvatar(true);  // Show "YOU" indicator
        
        // Hide ALL other "SIT DOWN" buttons - in solo mode, only you can play
        for (var i = 0; i < _aSeats.length; i++) {
            if (i !== iMySeat) {
                _aSeats[i].setVisibleSitDownButton(false);
            }
        }
        
        // Always allow solo play - no waiting for players
        _bWaitingForPlayers = false;

        _oCardContainer = new createjs.Container();
        s_oStage.addChild(_oCardContainer);
        
        _oInterface = new CInterface(TOTAL_MONEY);
        
        if (_bMultiplayerMode && _iNumSeats > 1 && _bWaitingForPlayers) {
            _oInterface.displayMsg(TEXT_WAITING_FOR_PLAYERS || "Waiting for players...");
        } else {
            _oInterface.displayMsg(TEXT_DISPLAY_MSG_WAITING_BET || "Place your bet!");
        }

        this.reset(true);
        
        _oStartingCardOffset = new CVector2();
        _oStartingCardOffset.set(1214, 228);
        
        _oDealerCardOffset = new CVector2();
        _oDealerCardOffset.set(788, 180);
        
        _oReceiveWinOffset = new CVector2();
        _oReceiveWinOffset.set(800, 600);
        
        _oFichesDealerOffset = new CVector2();
        _oFichesDealerOffset.set(CANVAS_WIDTH / 2, -100);
        
        _oRemoveCardsOffset = new CVector2(408, 208);

        _oGameOverPanel = new CGameOver();
        _oMsgBox = new CMsgBox();

        _oInterface.disableBetFiches();
        
        _bUpdate = true;
        
        // Auto-start betting phase when solo or single player
        if (!_bMultiplayerMode || _iNumSeats === 1 || !_bWaitingForPlayers) {
            if (_aSeats[0].getCredit() < _iMinBet) {
                this._gameOver();
                this.changeState(-1);
            } else {
                if (_oInterface) {
                    _oInterface.enableBetFiches();
                }
                this.changeState(STATE_GAME_WAITING_FOR_BET);
            }
        }
    };

    this._createSeats = function(iNumSeats) {
        // Calculate which positions to use based on number of seats
        var aPositions = this._getSeatPositions(iNumSeats);
        
        for (var i = 0; i < iNumSeats; i++) {
            var oSeat = new CSeatMultiplayer(aPositions[i].x, aPositions[i].y, i);
            oSeat.setCredit(TOTAL_MONEY);
            oSeat.addEventListener(SIT_DOWN, this._onSitDown, this);
            oSeat.addEventListener(RESTORE_ACTION, this._onSetPlayerActions);
            oSeat.addEventListener(PASS_TURN, this._onPlayerPassTurn);
            oSeat.addEventListener(END_HAND, this._onEndHand);
            oSeat.addEventListener(PLAYER_LOSE, this._playerLose);
            
            _aSeats.push(oSeat);
            _aPlayerBets.push(0);
        }
    };

    this._getSeatPositions = function(iNumSeats) {
        // Return appropriate positions based on number of players
        // Clamp to max 5 seats
        iNumSeats = Math.min(iNumSeats, 5);
        
        switch (iNumSeats) {
            case 1:
                return [SEAT_POSITIONS[2]]; // Center only
            case 2:
                return [SEAT_POSITIONS[1], SEAT_POSITIONS[3]]; // Left and right of center
            case 3:
                return [SEAT_POSITIONS[1], SEAT_POSITIONS[2], SEAT_POSITIONS[3]];
            case 4:
                return [SEAT_POSITIONS[0], SEAT_POSITIONS[1], SEAT_POSITIONS[3], SEAT_POSITIONS[4]];
            case 5:
            default:
                return SEAT_POSITIONS;
        }
    };

    this.setMultiplayerManager = function(oManager) {
        _oMultiplayer = oManager;
        
        if (_oMultiplayer) {
            // Register for multiplayer events
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_PLAYER_JOINED, this._onMPPlayerJoined, this);
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_PLAYER_LEFT, this._onMPPlayerLeft, this);
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_GAME_STATE_CHANGED, this._onMPStateChanged, this);
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_PLAYER_BET, this._onMPPlayerBet, this);
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_PLAYER_ACTION, this._onMPPlayerAction, this);
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_TURN_CHANGED, this._onMPTurnChanged, this);
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_DEAL_CARDS, this._onMPDealCards, this);
            _oMultiplayer.addEventListener(_oMultiplayer.EVENT_ROUND_END, this._onMPRoundEnd, this);
        }
    };

    // Multiplayer event handlers
    this._onMPPlayerJoined = function(oPlayer) {
        console.log('[Game] Player joined:', oPlayer.name, 'at seat', oPlayer.seatIndex);
        
        if (oPlayer.seatIndex < _aSeats.length) {
            _aSeats[oPlayer.seatIndex].setPlayerInfo(oPlayer.name, oPlayer.id);
            _aSeats[oPlayer.seatIndex].setOccupied(true);
        }
        
        this._updateWaitingMessage();
    };

    this._onMPPlayerLeft = function(oPlayer) {
        console.log('[Game] Player left:', oPlayer.name);
        
        if (oPlayer.seatIndex < _aSeats.length) {
            _aSeats[oPlayer.seatIndex].setOccupied(false);
            _aSeats[oPlayer.seatIndex].clearPlayerInfo();
        }
    };

    this._onMPStateChanged = function(oState) {
        console.log('[Game] State changed:', oState.phase);
        
        // Update all seats with player info
        for (var i = 0; i < oState.players.length; i++) {
            var oPlayer = oState.players[i];
            if (oPlayer.seatIndex < _aSeats.length) {
                _aSeats[oPlayer.seatIndex].setPlayerInfo(oPlayer.name, oPlayer.id);
                _aSeats[oPlayer.seatIndex].setOccupied(true);
                _aSeats[oPlayer.seatIndex].setCredit(oPlayer.credits);
            }
        }
        
        // Handle phase changes
        switch (oState.phase) {
            case _oMultiplayer.PHASE_BETTING:
                this._startBettingPhase();
                break;
            case _oMultiplayer.PHASE_DEALING:
                this._startDealingPhase();
                break;
            case _oMultiplayer.PHASE_PLAYING:
                _iCurrentPlayerTurn = oState.currentTurn;
                this._highlightCurrentPlayer();
                break;
        }
    };

    this._onMPPlayerBet = function(oData) {
        var iSeat = this._findSeatByPlayerId(oData.playerId);
        if (iSeat >= 0) {
            _aSeats[iSeat].setBet(oData.bet);
            _aPlayerBets[iSeat] = oData.bet;
        }
    };

    this._onMPPlayerAction = function(oData) {
        var iSeat = this._findSeatByPlayerId(oData.playerId);
        if (iSeat >= 0 && iSeat === _iCurrentPlayerTurn) {
            switch (oData.action) {
                case 'hit':
                    this._dealCardToSeat(iSeat);
                    break;
                case 'stand':
                    this._playerStand(iSeat);
                    break;
                case 'double':
                    this._playerDouble(iSeat);
                    break;
            }
        }
    };

    this._onMPTurnChanged = function(oData) {
        _iCurrentPlayerTurn = oData.turn;
        
        if (oData.turn === 'dealer' || oData.turn < 0) {
            this._startDealerTurn();
        } else {
            this._highlightCurrentPlayer();
            
            // Enable controls if it's our turn
            if (_oMultiplayer && _oMultiplayer.isMyTurn()) {
                _oInterface.enable(false, true, true, this._canDouble(_iCurrentPlayerTurn), false);
            } else {
                _oInterface.disableButtons();
            }
        }
    };

    this._onMPDealCards = function(oData) {
        if (oData.phase === 'start') {
            this.changeState(STATE_GAME_DEALING);
        }
    };

    this._onMPRoundEnd = function(oData) {
        // Host already showed results in _checkAllWinners - only clients need to show them
        // This prevents double credit addition (the bug where every keypress adds money)
        if (_oMultiplayer && _oMultiplayer.isHost()) {
            return;
        }
        // Show results for all players (clients only)
        this._showAllResults(oData.results);
    };

    this._findSeatByPlayerId = function(sPlayerId) {
        for (var i = 0; i < _aSeats.length; i++) {
            if (_aSeats[i].getPlayerId() === sPlayerId) {
                return i;
            }
        }
        return -1;
    };

    this._updateWaitingMessage = function() {
        if (!_bMultiplayerMode) return;
        
        var iOccupied = 0;
        for (var i = 0; i < _aSeats.length; i++) {
            if (_aSeats[i].isOccupied()) iOccupied++;
        }
        
        // Can play with 1 or more players - no need to wait
        if (iOccupied >= 1) {
            _oInterface.displayMsg("Press DEAL to start (" + iOccupied + " players)");
            _oInterface.enable(true, false, false, false, false);
        } else {
            _oInterface.displayMsg("Waiting for players... (" + iOccupied + "/" + _iNumSeats + ")");
        }
    };

    this._startBettingPhase = function() {
        _bAllBetsPlaced = false;
        if (_oInterface) {
            _oInterface.displayMsg("Place your bets!");
            _oInterface.enableBetFiches();
        }
        
        for (var i = 0; i < _aSeats.length; i++) {
            _aSeats[i].enableBetting(true);
            _aPlayerBets[i] = 0;
        }
    };

    this._startDealingPhase = function() {
        if (_oInterface) {
            _oInterface.disableBetFiches();
            _oInterface.disableButtons();
            _oInterface.displayMsg(TEXT_DISPLAY_MSG_DEALING);
        }
        this._dealing();
    };

    this._highlightCurrentPlayer = function() {
        for (var i = 0; i < _aSeats.length; i++) {
            _aSeats[i].setActive(i === _iCurrentPlayerTurn);
        }
        
        if (_iCurrentPlayerTurn >= 0 && _iCurrentPlayerTurn < _aSeats.length && _oInterface) {
            var sName = _aSeats[_iCurrentPlayerTurn].getPlayerName();
            _oInterface.displayMsg(sName + "'s turn");
        }
    };

    this._canDouble = function(iSeat) {
        if (iSeat < 0 || iSeat >= _aSeats.length) return false;
        var oSeat = _aSeats[iSeat];
        return oSeat.getNumCardsForHand(0) === 2 && 
               oSeat.getHandValue(0) > 8 && 
               oSeat.getHandValue(0) < 16 &&
               oSeat.getCredit() >= oSeat.getCurBet();
    };

    this._dealCardToSeat = function(iSeat) {
        if (iSeat < 0 || iSeat >= _aSeats.length || !_aSeats[iSeat]) return;
        
        var oSeat = _aSeats[iSeat];
        if (!oSeat.isOccupied()) return;
        
        var pStartingPoint = new CVector2(_oStartingCardOffset.getX(), _oStartingCardOffset.getY());
        var pEndingPoint = oSeat.getAttachCardOffset();
        
        // Ensure we have cards
        if (_iNextCardForPlayer >= _aCardsInCurHandForPlayer.length) {
            this.shuffleCard();
        }
        
        // Create and deal a card to the player
        var oCard = new CCard(_oStartingCardOffset.getX(), _oStartingCardOffset.getY(), _oCardContainer);
        var iCard = _aCardsInCurHandForPlayer[_iNextCardForPlayer];
        _iNextCardForPlayer++;
        
        oCard.setInfo(pStartingPoint, pEndingPoint, iCard, s_oGameSettings.getCardValue(iCard), false, oSeat.newCardDealed());
        oCard.seatIndex = iSeat;
        oCard.isHitCard = true;  // Mark as hit card for special handling
        oCard.addEventListener(ON_CARD_ANIMATION_ENDING, this._onHitCardArrived);
        oCard.addEventListener(ON_CARD_TO_REMOVE, this._onRemoveCard);
        
        _aCardsDealing.push(oCard);
        _aCardOut[iCard] += 1;
        
        playSound("card", 1, false);
    };
    
    this._onHitCardArrived = function(oCard, bDealerCard, iCount) {
        // Remove from dealing array
        for (var i = 0; i < _aCardsDealing.length; i++) {
            if (_aCardsDealing[i] === oCard) {
                _aCardsDealing.splice(i, 1);
                break;
            }
        }
        
        var iSeat = oCard.seatIndex;
        if (iSeat >= 0 && iSeat < _aSeats.length && _aSeats[iSeat]) {
            _aSeats[iSeat].addCardToHand(oCard);
            _aSeats[iSeat].increaseHandValue(oCard.getValue());
            _aSeats[iSeat].refreshCardValue();
            
            // Check if player busted or got 21
            var iHandValue = _aSeats[iSeat].getHandValue(0);
            if (iHandValue > 21) {
                // Check for aces
                if (_aSeats[iSeat].getAces && _aSeats[iSeat].getAces() > 0) {
                    _aSeats[iSeat].removeAce();
                    _aSeats[iSeat].refreshCardValue();
                    iHandValue = _aSeats[iSeat].getHandValue(0);
                }
                
                if (iHandValue > 21) {
                    // Busted - show result and move to next player
                    _aSeats[iSeat].showWinner(0, 'BUST!', 0);
                    playSound("lose", 1, false);
                    setTimeout(function() { s_oGame._onPlayerPassTurn(); }, 500);
                }
            } else if (iHandValue === 21) {
                // Got 21 - automatically stand
                setTimeout(function() { s_oGame._onPlayerPassTurn(); }, 500);
            }
        }
    };

    this._playerStand = function(iSeat) {
        if (iSeat < 0 || iSeat >= _aSeats.length) return;
        _aSeats[iSeat].stand();
    };

    this._playerDouble = function(iSeat) {
        if (iSeat < 0 || iSeat >= _aSeats.length) return;
        
        var oSeat = _aSeats[iSeat];
        var iDoubleBet = oSeat.getCurBet();
        
        oSeat.doubleAction(iDoubleBet * 2);
        oSeat.changeBet(iDoubleBet * 2);
        oSeat.decreaseCredit(iDoubleBet);
        
        this._dealCardToSeat(iSeat);
        
        // After double, player must stand
        setTimeout(function() {
            s_oGame._playerStand(iSeat);
        }, 500);
    };

    this._startDealerTurn = function() {
        _bPlayerTurn = false;
        _oInterface.disableButtons();
        
        // Transition to finalize state - dealer's turn
        this.changeState(STATE_GAME_FINALIZE);
        
        // Show dealer's hidden card
        if (_aDealerCards.length > 1) {
            _aDealerCards[1].showCard();
        }
        
        // Display the dealer's current sum (from the initial 2 cards dealt)
        _oInterface.refreshDealerCardValue(_iDealerValueCard);
        
        _oInterface.displayMsg(TEXT_DISPLAY_MSG_DEALER_TURN);
        
        // Dealer hits until 17
        this._dealerPlay();
    };

    this._dealerPlay = function() {
        if (_iDealerValueCard < 17) {
            this.hitDealer();
        } else {
            this._checkAllWinners();
        }
    };

    this._checkAllWinners = function() {
        var aResults = [];
        
        // Transition to show winner state
        this.changeState(STATE_GAME_SHOW_WINNER);
        
        for (var i = 0; i < _aSeats.length; i++) {
            if (!_aSeats[i].isOccupied()) continue;
            
            var oSeat = _aSeats[i];
            var iPlayerValue = oSeat.getHandValue(0);
            var oResult = {
                seatIndex: i,
                playerId: oSeat.getPlayerId(),
                playerValue: iPlayerValue,
                dealerValue: _iDealerValueCard,
                result: 'lose',
                winAmount: 0
            };
            
            // FIX: Use getBetForHand(0) instead of getCurBet() because after stand,
            // _iCurHand becomes -1 and getCurBet() returns 0
            var iBet = oSeat.getBetForHand(0);
            
            if (iPlayerValue > 21) {
                oResult.result = 'bust';
            } else if (_iDealerValueCard > 21) {
                oResult.result = 'win';
                oResult.winAmount = iBet * 2;
            } else if (iPlayerValue > _iDealerValueCard) {
                oResult.result = 'win';
                oResult.winAmount = iBet * 2;
            } else if (iPlayerValue === _iDealerValueCard) {
                oResult.result = 'push';
                oResult.winAmount = iBet;
            } else {
                oResult.result = 'lose';
            }
            
            // Check for blackjack
            if (iPlayerValue === 21 && oSeat.getNumCardsForHand(0) === 2) {
                oResult.result = 'blackjack';
                oResult.winAmount = iBet * 2.5;
            }
            
            aResults.push(oResult);
            this._showSeatResult(i, oResult);
        }
        
        // Notify multiplayer manager
        if (_oMultiplayer && _oMultiplayer.isHost()) {
            _oMultiplayer.endRound(aResults);
        }
        
        // SYNC BALANCE TO PARENT - Trigger save_score after round results
        // Small delay to ensure credits are updated
        setTimeout(function() {
            var iCurrentCredits = s_oGame.getMoney();
            console.log('[CGameMultiplayer] Round ended, syncing balance:', iCurrentCredits);
            $(s_oMain).trigger("save_score", [iCurrentCredits]);
        }, 500);
        
        // BUG FIX: Trigger end of hand to reset for new round
        // Without this, the game stays stuck on "DEALER TURN" state
        setTimeout(function() {
            console.log('[CGameMultiplayer] Triggering end of hand to reset game');
            s_oGame._onEndHand();
        }, 2000);  // 2 second delay to show results before clearing
    };

    this._showSeatResult = function(iSeat, oResult) {
        var oSeat = _aSeats[iSeat];
        var sText = '';
        
        switch (oResult.result) {
            case 'win':
                sText = TEXT_SHOW_WIN_PLAYER + ': +' + oResult.winAmount;
                oSeat.increaseCredit(oResult.winAmount);
                playSound("win", 1, false);
                break;
            case 'blackjack':
                sText = 'BLACKJACK! +' + oResult.winAmount;
                oSeat.increaseCredit(oResult.winAmount);
                playSound("win", 1, false);
                break;
            case 'push':
                sText = TEXT_SHOW_STANDOFF;
                oSeat.increaseCredit(oResult.winAmount);
                break;
            case 'bust':
                sText = 'BUST!';
                playSound("lose", 1, false);
                break;
            default:
                sText = TEXT_SHOW_LOSE_PLAYER;
                playSound("lose", 1, false);
        }
        
        oSeat.showWinner(0, sText, oResult.winAmount);
    };

    this._showAllResults = function(aResults) {
        for (var i = 0; i < aResults.length; i++) {
            this._showSeatResult(aResults[i].seatIndex, aResults[i]);
        }
    };

    // Override original methods for multiplayer support
    
    this.unload = function() {
        _bUpdate = false;

        for (var i = 0; i < _aCardsDealing.length; i++) {
            _aCardsDealing[i].unload();
        }
        
        for (var j = 0; j < _aSeats.length; j++) {
            var aCards = _aSeats[j].getPlayerCards();
            for (var k = 0; k < aCards.length; k++) {
                aCards[k].unload();
            }
        }
        
        _oInterface.unload();
        _oGameOverPanel.unload();
        _oMsgBox.unload();
        s_oStage.removeAllChildren();
        
        if (_oMultiplayer) {
            _oMultiplayer.disconnect();
        }
    };

    this.reset = function(bFirstPlay) {
        _bPlayerTurn = true;
        _iTimeElaps = 0;
        _iCardIndexToDeal = 0;
        _iDealerValueCard = 0;
        _iCardDealedToDealer = 0;
        _iAcesForDealer = 0;
        _iCurFichesToWait = 0;
        _iCurrentPlayerTurn = 0;
        _bAllBetsPlaced = false;

        for (var i = 0; i < _aSeats.length; i++) {
            _aSeats[i].reset();
            _aPlayerBets[i] = 0;
        }

        _aCardsDealing = [];
        _aDealerCards = [];

        if (_oInterface) {
            _oInterface.reset();
            
            if (!_bMultiplayerMode) {
                _oInterface.enableBetFiches();
            }
        }
        
        if (bFirstPlay) {
            this.shuffleCard();
        } else if (_iNextCardForPlayer > (_aCardsInCurHandForPlayer.length / 2) || 
                   _iNextCardForDealer > (_aCardsInCurHandForDealer.length / 2)) {
            this.shuffleCard();
        }
    };

    this.shuffleCard = function() {
        _aCardDeck = [];
        _aCardDeck = s_oGameSettings.getShuffledCardDeck();

        _aCardsInCurHandForPlayer = [];
        _aCardsInCurHandForDealer = [];
        
        for (var k = 0; k < _aCardDeck.length; k++) {
            if (k % 2 === 0) {
                _aCardsInCurHandForPlayer.push(_aCardDeck[k]);
            } else {
                _aCardsInCurHandForDealer.push(_aCardDeck[k]);
            }
        }

        _iNextCardForPlayer = 0;
        _iNextCardForDealer = 0;
        
        _aCardOut = [];
        for (var m = 0; m < _aCardDeck.length; m++) {
            _aCardOut[m] = 0;
        }
    };

    this.changeState = function(iState) {
        _iState = iState;

        switch (_iState) {
            case STATE_GAME_DEALING:
                _oInterface.disableButtons();
                _oInterface.displayMsg(TEXT_DISPLAY_MSG_DEALING);
                this._dealing();
                break;
        }
    };

    this._dealing = function() {
        // Count occupied seats
        var aOccupiedSeats = [];
        for (var s = 0; s < _aSeats.length; s++) {
            if (_aSeats[s] && _aSeats[s].isOccupied()) {
                aOccupiedSeats.push(s);
            }
        }
        
        // Deal 2 cards to each occupied player, then 2 to dealer
        var iNumOccupied = aOccupiedSeats.length;
        var iTotalCards = (iNumOccupied * 2) + 2; // Players + dealer
        
        if (_iCardIndexToDeal < iTotalCards) {
            // Calculate which round (0 or 1) and target within round
            var iRound = Math.floor(_iCardIndexToDeal / (iNumOccupied + 1));
            var iTargetInRound = _iCardIndexToDeal % (iNumOccupied + 1);
            
            var oCard = new CCard(_oStartingCardOffset.getX(), _oStartingCardOffset.getY(), _oCardContainer);
            var pStartingPoint = new CVector2(_oStartingCardOffset.getX(), _oStartingCardOffset.getY());
            var pEndingPoint;

            if (iTargetInRound < iNumOccupied) {
                // Deal to player at occupied seat
                var iSeatIndex = aOccupiedSeats[iTargetInRound];
                var oSeat = _aSeats[iSeatIndex];
                
                pEndingPoint = oSeat.getAttachCardOffset();
                
                var iCard = _aCardsInCurHandForPlayer[_iNextCardForPlayer];
                oCard.setInfo(pStartingPoint, pEndingPoint, iCard, 
                              s_oGameSettings.getCardValue(iCard), false, oSeat.newCardDealed());
                oCard.seatIndex = iSeatIndex;  // Track which seat
                
                _aCardOut[iCard] += 1;
                _iNextCardForPlayer++;
            } else {
                // Deal to dealer
                _iCardDealedToDealer++;
                pEndingPoint = new CVector2(
                    _oDealerCardOffset.getX() + (CARD_WIDTH + 2) * (_iCardDealedToDealer - 1),
                    _oDealerCardOffset.getY()
                );

                var iDealerCard = _aCardsInCurHandForDealer[_iNextCardForDealer];
                oCard.setInfo(pStartingPoint, pEndingPoint, iDealerCard,
                              s_oGameSettings.getCardValue(iDealerCard), true, _iCardDealedToDealer);
                
                if (_iCardDealedToDealer === 2) {
                    oCard.addEventListener(ON_CARD_SHOWN, this._onCardShown);
                }
                
                _aCardOut[iDealerCard] += 1;
                _iNextCardForDealer++;
            }

            oCard.addEventListener(ON_CARD_ANIMATION_ENDING, this.cardFromDealerArrived);
            oCard.addEventListener(ON_CARD_TO_REMOVE, this._onRemoveCard);
            
            _aCardsDealing.push(oCard);
            _iCardIndexToDeal++;

            playSound("card", 1, false);
        } else {
            // All initial cards dealt - start player turns
            this._checkAvailableActionForPlayer();
        }
    };

    this.cardFromDealerArrived = function(oCard, bDealerCard, iCount) {
        for (var i = 0; i < _aCardsDealing.length; i++) {
            if (_aCardsDealing[i] === oCard) {
                _aCardsDealing.splice(i, 1);
                break;
            }
        }

        if (!bDealerCard) {
            var iSeat = oCard.seatIndex !== undefined ? oCard.seatIndex : _iCurrentPlayerTurn;
            if (iSeat >= 0 && iSeat < _aSeats.length && _aSeats[iSeat]) {
                _aSeats[iSeat].addCardToHand(oCard);
                _aSeats[iSeat].increaseHandValue(oCard.getValue());
                if (iCount > 2) {
                    _aSeats[iSeat].refreshCardValue();
                }
            }
        } else {
            _iDealerValueCard += oCard.getValue();
            if (_iCardDealedToDealer > 2) {
                _oInterface.refreshDealerCardValue(_iDealerValueCard);
            }
            if (oCard.getValue() === 11) {
                _iAcesForDealer++;
            }
            _aDealerCards.push(oCard);
        }

        // Count occupied seats for accurate total card calculation
        var iOccupiedSeats = 0;
        for (var j = 0; j < _aSeats.length; j++) {
            if (_aSeats[j] && _aSeats[j].isOccupied()) {
                iOccupiedSeats++;
            }
        }
        var iTotalCards = (iOccupiedSeats * 2) + 2;
        
        // Continue dealing or check hands
        if (_iCardIndexToDeal < iTotalCards) {
            s_oGame._dealing();
        } else {
            s_oGame._checkAvailableActionForPlayer();
        }
    };

    this._checkAvailableActionForPlayer = function() {
        // Find first active player that can still play
        _iCurrentPlayerTurn = 0;
        while (_iCurrentPlayerTurn < _aSeats.length) {
            var oSeat = _aSeats[_iCurrentPlayerTurn];
            if (oSeat && oSeat.isOccupied()) {
                var iHandValue = oSeat.getHandValue(0);
                // Player can play if they don't have 21 and haven't busted
                if (iHandValue < 21) {
                    break;
                }
            }
            _iCurrentPlayerTurn++;
        }

        if (_iCurrentPlayerTurn >= _aSeats.length) {
            // All players done or have blackjack/busted
            this._startDealerTurn();
            return;
        }

        // Transition to player turn state - dealing is complete
        this.changeState(STATE_GAME_PLAYER_TURN);

        // Refresh all card values
        for (var i = 0; i < _aSeats.length; i++) {
            if (_aSeats[i] && _aSeats[i].isOccupied()) {
                _aSeats[i].refreshCardValue();
            }
        }

        this._highlightCurrentPlayer();
        
        // Enable controls for current player (in single player or if it's our turn)
        if (!_bMultiplayerMode || _iNumSeats === 1 || (_oMultiplayer && _oMultiplayer.isMyTurn())) {
            var bDouble = this._canDouble(_iCurrentPlayerTurn);
            _oInterface.enable(false, true, true, bDouble, false);
        }

        _oInterface.displayMsg(TEXT_DISPLAY_MSG_YOUR_ACTION || "Your turn!");
    };

    this._onPlayerPassTurn = function() {
        // Move to next player
        _iCurrentPlayerTurn++;
        
        // Find next active player
        while (_iCurrentPlayerTurn < _aSeats.length) {
            var oSeat = _aSeats[_iCurrentPlayerTurn];
            if (oSeat.isOccupied() && oSeat.getHandValue(0) < 21) {
                break;
            }
            _iCurrentPlayerTurn++;
        }

        if (_iCurrentPlayerTurn >= _aSeats.length) {
            // All players done
            s_oGame._startDealerTurn();
        } else {
            s_oGame._highlightCurrentPlayer();
            
            if (!_bMultiplayerMode || (_oMultiplayer && _oMultiplayer.isMyTurn())) {
                var bDouble = s_oGame._canDouble(_iCurrentPlayerTurn);
                _oInterface.enable(false, true, true, bDouble, false);
            }
        }
        
        // Notify multiplayer
        if (_oMultiplayer && _oMultiplayer.isHost()) {
            _oMultiplayer._nextTurn();
        }
    };

    this.hitDealer = function() {
        var pStartingPoint = new CVector2(_oStartingCardOffset.getX(), _oStartingCardOffset.getY());
        var pEndingPoint = new CVector2(
            _oDealerCardOffset.getX() + ((CARD_WIDTH + 3) * _iCardDealedToDealer),
            _oDealerCardOffset.getY()
        );
        _iCardDealedToDealer++;

        var oCard = new CCard(_oStartingCardOffset.getX(), _oStartingCardOffset.getY(), _oCardContainer);
        var iCard = _aCardsInCurHandForDealer[_iNextCardForDealer];
        
        oCard.setInfo(pStartingPoint, pEndingPoint, iCard, s_oGameSettings.getCardValue(iCard), true, _iCardDealedToDealer);
        oCard.addEventListener(ON_CARD_ANIMATION_ENDING, this._onDealerCardArrived);
        
        _aCardsDealing.push(oCard);
        _aCardOut[iCard] += 1;
        _iNextCardForDealer++;

        playSound("card", 1, false);
    };

    this._onDealerCardArrived = function(oCard, bDealerCard, iCount) {
        _iDealerValueCard += oCard.getValue();
        
        if (oCard.getValue() === 11) {
            _iAcesForDealer++;
        }
        
        _aDealerCards.push(oCard);
        _oInterface.refreshDealerCardValue(_iDealerValueCard);

        // Remove from dealing array
        for (var i = 0; i < _aCardsDealing.length; i++) {
            if (_aCardsDealing[i] === oCard) {
                _aCardsDealing.splice(i, 1);
                break;
            }
        }

        // Check if dealer busts or needs to hit again
        if (_iDealerValueCard > 21 && _iAcesForDealer > 0) {
            _iAcesForDealer--;
            _iDealerValueCard -= 10;
            _oInterface.refreshDealerCardValue(_iDealerValueCard);
        }

        if (_iDealerValueCard < 17) {
            setTimeout(function() { s_oGame.hitDealer(); }, 500);
        } else {
            s_oGame._checkAllWinners();
        }
    };

    this._onEndHand = function() {
        var pRemoveOffset = new CVector2(_oRemoveCardsOffset.getX(), _oRemoveCardsOffset.getY());
        
        // Remove dealer cards
        for (var i = 0; i < _aDealerCards.length; i++) {
            _aDealerCards[i].initRemoving(pRemoveOffset);
            _aDealerCards[i].hideCard();
        }

        // Remove all player cards
        for (var j = 0; j < _aSeats.length; j++) {
            var aCards = _aSeats[j].getPlayerCards();
            for (var k = 0; k < aCards.length; k++) {
                aCards[k].initRemoving(pRemoveOffset);
                aCards[k].hideCard();
            }
            _aSeats[j].clearText();
        }

        _oInterface.clearDealerText();
        _iTimeElaps = 0;
        
        playSound("fiche_collect", 1, false);
        
        // SYNC BALANCE TO PARENT before starting new round
        var iCurrentCredits = s_oGame.getMoney();
        console.log('[CGameMultiplayer] Hand ended, syncing balance:', iCurrentCredits);
        $(s_oMain).trigger("save_score", [iCurrentCredits]);

        // Start new round after delay
        setTimeout(function() {
            s_oGame.reset(false);
            
            if (_bMultiplayerMode && _oMultiplayer && _oMultiplayer.isHost()) {
                _oMultiplayer.startBetting();
            } else {
                // BUG FIX: Always transition to betting state for:
                // - Single player mode (!_bMultiplayerMode)
                // - Solo multiplayer (no _oMultiplayer or not host)
                console.log('[CGameMultiplayer] Transitioning to betting state');
                s_oGame.changeState(STATE_GAME_WAITING_FOR_BET);
                if (_oInterface) {
                    _oInterface.enableBetFiches();
                    _oInterface.displayMsg(TEXT_DISPLAY_MSG_WAITING_BET || "Place your bet!");
                }
            }
        }, TIME_END_HAND);
    };

    this.onDeal = function() {
        console.log('[Game] onDeal called');
        console.log('[Game] _aSeats length:', _aSeats ? _aSeats.length : 'undefined');
        console.log('[Game] _iMinBet:', _iMinBet);
        
        // Check if any seat has a valid bet
        var bHasBet = false;
        for (var i = 0; i < _aSeats.length; i++) {
            var seatInfo = _aSeats[i] ? {
                occupied: _aSeats[i].isOccupied(),
                bet: _aSeats[i].getCurBet()
            } : null;
            console.log('[Game] Seat', i, ':', JSON.stringify(seatInfo));
            
            if (_aSeats[i] && _aSeats[i].isOccupied() && _aSeats[i].getCurBet() >= _iMinBet) {
                bHasBet = true;
                console.log('[Game] Valid bet found at seat', i);
                break;
            }
        }
        
        if (!bHasBet) {
            console.log('[Game] No valid bet found! Showing error message');
            _oMsgBox.show(TEXT_ERROR_MIN_BET || "Place a bet first!");
            return;
        }
        
        console.log('[Game] Proceeding to deal');
        
        // Count occupied seats
        var iOccupied = 0;
        for (var i = 0; i < _aSeats.length; i++) {
            if (_aSeats[i] && _aSeats[i].isOccupied()) iOccupied++;
        }
        
        // In single player mode, or if only one player is seated, just start dealing
        if (!_bMultiplayerMode || iOccupied <= 1) {
            this.changeState(STATE_GAME_DEALING);
        } else if (_oMultiplayer && _oMultiplayer.isHost()) {
            // True multiplayer with multiple players - host starts the round
            _oMultiplayer.startDealing();
        }
    };

    this.onHit = function() {
        // Count occupied seats
        var iOccupied = 0;
        for (var i = 0; i < _aSeats.length; i++) {
            if (_aSeats[i] && _aSeats[i].isOccupied()) iOccupied++;
        }
        
        if (_bMultiplayerMode && _oMultiplayer && iOccupied > 1) {
            _oMultiplayer.sendAction('hit');
        } else {
            // Single player or solo multiplayer
            this._dealCardToSeat(_iCurrentPlayerTurn);
            this.changeState(STATE_GAME_HITTING);
        }
    };

    this.onStand = function() {
        // Count occupied seats
        var iOccupied = 0;
        for (var i = 0; i < _aSeats.length; i++) {
            if (_aSeats[i] && _aSeats[i].isOccupied()) iOccupied++;
        }
        
        if (_bMultiplayerMode && _oMultiplayer && iOccupied > 1) {
            _oMultiplayer.sendAction('stand');
        } else {
            // Single player or solo multiplayer
            if (_iCurrentPlayerTurn >= 0 && _iCurrentPlayerTurn < _aSeats.length && _aSeats[_iCurrentPlayerTurn]) {
                _aSeats[_iCurrentPlayerTurn].stand();
            }
            s_oGame._onPlayerPassTurn();
        }
    };

    this.onDouble = function() {
        if (_bMultiplayerMode && _oMultiplayer) {
            _oMultiplayer.sendAction('double');
        } else {
            this._playerDouble(_iCurrentPlayerTurn);
        }
    };

    // Original bet handling for single player
    this.ficheSelected = function(iFicheValue, iFicheIndex) {
        // Only allow betting during the betting phase
        if (_iState !== STATE_GAME_WAITING_FOR_BET && _iState !== -1) {
            console.log('[CGameMultiplayer] Betting not allowed in state:', _iState);
            return;
        }
        
        // Validate parameters
        if (typeof iFicheValue !== 'number' || isNaN(iFicheValue) || iFicheValue <= 0) {
            console.warn('[Game] Invalid fiche value:', iFicheValue);
            return;
        }
        if (typeof iFicheIndex !== 'number' || iFicheIndex < 0 || iFicheIndex > 5) {
            console.warn('[Game] Invalid fiche index:', iFicheIndex, '- guessing from value');
            // Try to find correct index based on value
            var aFichesValues = s_oGameSettings.getFichesValues();
            iFicheIndex = aFichesValues.indexOf(iFicheValue);
            if (iFicheIndex < 0) iFicheIndex = 0;
        }
        
        if (_bMultiplayerMode) {
            // In multiplayer, bets go to the player's own seat
            var iMySeat = _oMultiplayer ? _oMultiplayer.getSeatIndex() : 0;
            // If no multiplayer manager or seat not set, default to seat 0
            if (iMySeat < 0 || iMySeat === undefined) {
                iMySeat = 0;
            }
            
            var oSeat = _aSeats[iMySeat];
            var iCurBet = oSeat.getCurBet();
            
            if (iFicheValue > oSeat.getCredit()) {
                _oMsgBox.show(TEXT_NO_MONEY);
                return;
            }
            
            if ((iCurBet + iFicheValue) > _iMaxBet) {
                _oMsgBox.show(TEXT_ERROR_MAX_BET);
                return;
            }
            
            iCurBet += iFicheValue;
            oSeat.decreaseCredit(iFicheValue);
            oSeat.changeBet(iCurBet);
            oSeat.refreshFiches(iFicheValue, iFicheIndex, 0, 0);
            oSeat.bet(iCurBet, false);
            
            _oInterface.refreshCredit(oSeat.getCredit());
            _oInterface.enable(true, false, false, false, false);
            
            // Notify multiplayer
            if (_oMultiplayer) {
                _oMultiplayer.placeBet(iCurBet);
            }
        } else {
            // Single player - original logic
            var oSeat = _aSeats[0];
            var iCurBet = oSeat.getCurBet();
            
            if (iFicheValue > oSeat.getCredit()) {
                _oMsgBox.show(TEXT_NO_MONEY);
            } else if ((iCurBet + iFicheValue) > _iMaxBet) {
                _oMsgBox.show(TEXT_ERROR_MAX_BET);
            } else {
                iCurBet += iFicheValue;
                iCurBet = Number(iCurBet.toFixed(1));

                oSeat.decreaseCredit(iFicheValue);
                _iGameCash += iFicheValue;

                oSeat.changeBet(iCurBet);
                oSeat.refreshFiches(iFicheValue, iFicheIndex, 0, 0);
                oSeat.bet(iCurBet, false);
                
                _oInterface.enable(true, false, false, false, false);
                _oInterface.refreshCredit(oSeat.getCredit());
            }
        }
    };

    this.onFicheSelected = function(iFicheIndex, iFicheValue) {
        this.ficheSelected(iFicheValue, iFicheIndex);
    };

    this._onSitDown = function(iSeatIndex) {
        // Mark this seat as occupied by the local player
        if (iSeatIndex >= 0 && iSeatIndex < _aSeats.length) {
            _aSeats[iSeatIndex].setOccupied(true);
            _aSeats[iSeatIndex].setPlayerInfo('Player ' + (iSeatIndex + 1), 'local_player');
            
            // HIDE ALL OTHER "SIT DOWN" BUTTONS - player can only sit in one seat
            for (var i = 0; i < _aSeats.length; i++) {
                if (i !== iSeatIndex) {
                    _aSeats[i].setVisibleSitDownButton(false);
                }
            }
            
            // Show avatar/indicator on the player's seat
            _aSeats[iSeatIndex].showPlayerAvatar(true);
            
            // Tell the multiplayer manager which seat we're in
            if (_bMultiplayerMode && _oMultiplayer) {
                _oMultiplayer.setSeatIndex(iSeatIndex);
            }
        }
        
        // Enable betting when player sits down (both single and multiplayer)
        this.changeState(STATE_GAME_WAITING_FOR_BET);
        if (_oInterface) {
            _oInterface.enableBetFiches();
            _oInterface.displayMsg(TEXT_DISPLAY_MSG_WAITING_BET || "Place your bet!");
        }
        
        // In multiplayer, also trigger the betting phase
        if (_bMultiplayerMode && _oMultiplayer && _oMultiplayer.isHost()) {
            _oMultiplayer.startBetting();
        }
    };

    this._onSetPlayerActions = function(bDeal, bHit, bStand, bDouble, bSplit) {
        _oInterface.enable(bDeal, bHit, bStand, bDouble, bSplit);
        _aSeats[_iCurrentPlayerTurn].refreshCardValue();
    };

    this._onCardShown = function() {
        s_oGame._checkHand();
    };

    this._checkHand = function() {
        // Check current player's hand
        var oSeat = _aSeats[_iCurrentPlayerTurn];
        if (!oSeat || !oSeat.isOccupied()) {
            this._onPlayerPassTurn();
            return;
        }

        var iValue = oSeat.getHandValue(0);
        
        if (iValue > 21) {
            // Bust - check for aces
            if (oSeat.getAces() > 0) {
                oSeat.removeAce();
                oSeat.refreshCardValue();
                
                if (oSeat.getHandValue(0) >= 21) {
                    this._onPlayerPassTurn();
                }
            } else {
                // Player busted
                oSeat.showWinner(0, 'BUST!', 0);
                playSound("lose", 1, false);
                this._onPlayerPassTurn();
            }
        } else if (iValue === 21) {
            // Blackjack or 21
            this._onPlayerPassTurn();
        }
    };

    this._onRemoveCard = function(oCard) {
        oCard.unload();
    };

    this._gameOver = function() {
        _oGameOverPanel.show();
    };

    this.onExit = function() {
        this.unload();
        $(s_oMain).trigger("save_score", [_aSeats[0].getCredit()]);
        $(s_oMain).trigger("end_session");
        s_oMain.gotoMenu();
    };

    this.getState = function() {
        return _iState;
    };

    this.getMoney = function() {
        if (_bMultiplayerMode && _oMultiplayer) {
            var iSeat = _oMultiplayer.getSeatIndex();
            if (iSeat >= 0 && iSeat < _aSeats.length) {
                return _aSeats[iSeat].getCredit();
            }
        }
        return _aSeats[0] ? _aSeats[0].getCredit() : 0;
    };

    this.setMoney = function(iMoney) {
        if (_bMultiplayerMode && _oMultiplayer) {
            var iSeat = _oMultiplayer.getSeatIndex();
            if (iSeat >= 0 && iSeat < _aSeats.length) {
                _aSeats[iSeat].setCredit(iMoney);
            }
        } else {
            _aSeats[0].setCredit(iMoney);
        }
        _oInterface.refreshCredit(iMoney);
    };

    this._updateWaitingBet = function() {
        // Skip in multiplayer - betting is handled differently
        if (_bMultiplayerMode) return;
        
        _iTimeElaps += s_iTimeElaps;
        if (_iTimeElaps > BET_TIME) {
            _iTimeElaps = 0;
            
            if (_aSeats[0].getCurBet() < _iMinBet) {
                return;
            }
            _oInterface.disableBetFiches();
            _oInterface.enable(true, false, false, false, false);
            this.changeState(STATE_GAME_DEALING);
        } else {
            var iCountDown = Math.floor((BET_TIME - _iTimeElaps) / 1000);
            _oInterface.displayMsg(TEXT_MIN_BET + ":" + _iMinBet + "\n" + TEXT_MAX_BET + ":" + _iMaxBet, 
                                   TEXT_DISPLAY_MSG_WAITING_BET + " " + iCountDown);
        }
    };

    this._updateDealing = function() {
        for (var i = 0; i < _aCardsDealing.length; i++) {
            _aCardsDealing[i].update();
        }
    };

    this._updateHitting = function() {
        for (var i = 0; i < _aCardsDealing.length; i++) {
            _aCardsDealing[i].update();
        }
    };

    this.update = function() {
        if (!_bUpdate) return;

        switch (_iState) {
            case STATE_GAME_WAITING_FOR_BET:
                this._updateWaitingBet();
                break;
            case STATE_GAME_DEALING:
                this._updateDealing();
                break;
            case STATE_GAME_HITTING:
                this._updateHitting();
                break;
            case STATE_GAME_PLAYER_TURN:
                // Waiting for player input - update any card animations in progress
                this._updateHitting();
                break;
            case STATE_GAME_FINALIZE:
                // Dealer's turn - update card animations
                this._updateHitting();
                break;
            case STATE_GAME_SHOW_WINNER:
                // Showing results - update any remaining animations
                this._updateHitting();
                break;
        }
    };

    s_oGame = this;

    TOTAL_MONEY = oData.money;
    MIN_BET = oData.min_bet;
    MAX_BET = oData.max_bet;
    BET_TIME = oData.bet_time;
    BLACKJACK_PAYOUT = oData.blackjack_payout;
    WIN_OCCURRENCE = oData.win_occurrence;
    _iGameCash = oData.game_cash;
    AD_SHOW_COUNTER = oData.ad_show_counter;

    this._init();
}

var s_oGame;
var s_oTweenController;
