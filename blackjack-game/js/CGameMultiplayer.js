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

    // Seat positions for 1-5 players (x, y coordinates)
    var SEAT_POSITIONS = [
        { x: 450, y: 400 },   // Seat 0 - far left
        { x: 620, y: 440 },   // Seat 1 - left
        { x: 800, y: 460 },   // Seat 2 - center
        { x: 980, y: 440 },   // Seat 3 - right  
        { x: 1150, y: 400 }   // Seat 4 - far right
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

        _oCardContainer = new createjs.Container();
        s_oStage.addChild(_oCardContainer);
        
        _oInterface = new CInterface(TOTAL_MONEY);
        
        if (_bMultiplayerMode) {
            _oInterface.displayMsg(TEXT_WAITING_FOR_PLAYERS || "Waiting for players...");
        } else {
            _oInterface.displayMsg(TEXT_DISPLAY_MSG_SIT_DOWN);
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
        
        if (!_bMultiplayerMode) {
            // Single player mode - start immediately
            if (_aSeats[0].getCredit() < _iMinBet) {
                this._gameOver();
                this.changeState(-1);
            } else {
                _bUpdate = true;
            }
        } else {
            _bUpdate = true;
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
        switch (iNumSeats) {
            case 1:
                return [SEAT_POSITIONS[2]]; // Center only
            case 2:
                return [SEAT_POSITIONS[1], SEAT_POSITIONS[3]]; // Left and right
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
        // Show results for all players
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
        
        if (iOccupied < 2) {
            _oInterface.displayMsg("Waiting for players... (" + iOccupied + "/" + _iNumSeats + ")");
        } else {
            _oInterface.displayMsg("Press DEAL to start");
            _oInterface.enable(true, false, false, false, false);
        }
    };

    this._startBettingPhase = function() {
        _bAllBetsPlaced = false;
        _oInterface.displayMsg("Place your bets!");
        _oInterface.enableBetFiches();
        
        for (var i = 0; i < _aSeats.length; i++) {
            _aSeats[i].enableBetting(true);
            _aPlayerBets[i] = 0;
        }
    };

    this._startDealingPhase = function() {
        _oInterface.disableBetFiches();
        _oInterface.disableButtons();
        _oInterface.displayMsg(TEXT_DISPLAY_MSG_DEALING);
        this._dealing();
    };

    this._highlightCurrentPlayer = function() {
        for (var i = 0; i < _aSeats.length; i++) {
            _aSeats[i].setActive(i === _iCurrentPlayerTurn);
        }
        
        if (_iCurrentPlayerTurn >= 0 && _iCurrentPlayerTurn < _aSeats.length) {
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
        if (iSeat < 0 || iSeat >= _aSeats.length) return;
        
        var oSeat = _aSeats[iSeat];
        var pStartingPoint = new CVector2(_oStartingCardOffset.getX(), _oStartingCardOffset.getY());
        var pEndingPoint = oSeat.getAttachCardOffset();
        
        this.attachCardToPlayer(pStartingPoint, pEndingPoint, iSeat, oSeat.newCardDealed());
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
        
        // Show dealer's hidden card
        if (_aDealerCards.length > 1) {
            _aDealerCards[1].showCard();
        }
        
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
            
            if (iPlayerValue > 21) {
                oResult.result = 'bust';
            } else if (_iDealerValueCard > 21) {
                oResult.result = 'win';
                oResult.winAmount = oSeat.getCurBet() * 2;
            } else if (iPlayerValue > _iDealerValueCard) {
                oResult.result = 'win';
                oResult.winAmount = oSeat.getCurBet() * 2;
            } else if (iPlayerValue === _iDealerValueCard) {
                oResult.result = 'push';
                oResult.winAmount = oSeat.getCurBet();
            } else {
                oResult.result = 'lose';
            }
            
            // Check for blackjack
            if (iPlayerValue === 21 && oSeat.getNumCardsForHand(0) === 2) {
                oResult.result = 'blackjack';
                oResult.winAmount = oSeat.getCurBet() * 2.5;
            }
            
            aResults.push(oResult);
            this._showSeatResult(i, oResult);
        }
        
        // Notify multiplayer manager
        if (_oMultiplayer && _oMultiplayer.isHost()) {
            _oMultiplayer.endRound(aResults);
        }
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

        _oInterface.reset();
        
        if (!_bMultiplayerMode) {
            _oInterface.enableBetFiches();
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
        // Deal 2 cards to each player, then 2 to dealer
        var iTotalCards = (_aSeats.length * 2) + 2; // Players + dealer
        
        if (_iCardIndexToDeal < iTotalCards) {
            var iRound = Math.floor(_iCardIndexToDeal / (_aSeats.length + 1));
            var iTarget = _iCardIndexToDeal % (_aSeats.length + 1);
            
            var oCard = new CCard(_oStartingCardOffset.getX(), _oStartingCardOffset.getY(), _oCardContainer);
            var pStartingPoint = new CVector2(_oStartingCardOffset.getX(), _oStartingCardOffset.getY());
            var pEndingPoint;

            if (iTarget < _aSeats.length) {
                // Deal to player
                var oSeat = _aSeats[iTarget];
                if (oSeat.isOccupied()) {
                    pEndingPoint = oSeat.getAttachCardOffset();
                    
                    var iCard = _aCardsInCurHandForPlayer[_iNextCardForPlayer];
                    oCard.setInfo(pStartingPoint, pEndingPoint, iCard, 
                                  s_oGameSettings.getCardValue(iCard), false, oSeat.newCardDealed());
                    oCard.seatIndex = iTarget;  // Track which seat
                    
                    _aCardOut[iCard] += 1;
                    _iNextCardForPlayer++;
                } else {
                    // Skip empty seat
                    _iCardIndexToDeal++;
                    this._dealing();
                    return;
                }
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
            if (iSeat >= 0 && iSeat < _aSeats.length) {
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

        // Continue dealing or check hands
        var iTotalCards = (_aSeats.length * 2) + 2;
        if (_iCardIndexToDeal < iTotalCards) {
            s_oGame._dealing();
        } else {
            s_oGame._checkAvailableActionForPlayer();
        }
    };

    this._checkAvailableActionForPlayer = function() {
        // Find first active player
        _iCurrentPlayerTurn = 0;
        while (_iCurrentPlayerTurn < _aSeats.length && 
               (!_aSeats[_iCurrentPlayerTurn].isOccupied() || 
                _aSeats[_iCurrentPlayerTurn].getHandValue(0) === 21)) {
            _iCurrentPlayerTurn++;
        }

        if (_iCurrentPlayerTurn >= _aSeats.length) {
            // All players done or have blackjack
            this._startDealerTurn();
            return;
        }

        // Refresh all card values
        for (var i = 0; i < _aSeats.length; i++) {
            if (_aSeats[i].isOccupied()) {
                _aSeats[i].refreshCardValue();
            }
        }

        this._highlightCurrentPlayer();
        
        // Enable controls for current player
        if (!_bMultiplayerMode || (_oMultiplayer && _oMultiplayer.isMyTurn())) {
            var bDouble = this._canDouble(_iCurrentPlayerTurn);
            _oInterface.enable(false, true, true, bDouble, false);
        }

        _oInterface.displayMsg(TEXT_DISPLAY_MSG_YOUR_ACTION);
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
            this._startDealerTurn();
        } else {
            this._highlightCurrentPlayer();
            
            if (!_bMultiplayerMode || (_oMultiplayer && _oMultiplayer.isMyTurn())) {
                var bDouble = this._canDouble(_iCurrentPlayerTurn);
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

        // Start new round after delay
        setTimeout(function() {
            s_oGame.reset(false);
            
            if (_bMultiplayerMode && _oMultiplayer && _oMultiplayer.isHost()) {
                _oMultiplayer.startBetting();
            } else if (!_bMultiplayerMode) {
                s_oGame.changeState(STATE_GAME_WAITING_FOR_BET);
            }
        }, TIME_END_HAND);
    };

    this.onDeal = function() {
        if (_bMultiplayerMode) {
            if (_oMultiplayer && _oMultiplayer.isHost()) {
                _oMultiplayer.startBetting();
            }
        } else {
            // Single player - check bet and start
            var oSeat = _aSeats[0];
            if (oSeat.getCurBet() < _iMinBet) {
                _oMsgBox.show(TEXT_ERROR_MIN_BET);
                return;
            }
            this.changeState(STATE_GAME_DEALING);
        }
    };

    this.onHit = function() {
        if (_bMultiplayerMode && _oMultiplayer) {
            _oMultiplayer.sendAction('hit');
        } else {
            this._dealCardToSeat(_iCurrentPlayerTurn);
        }
    };

    this.onStand = function() {
        if (_bMultiplayerMode && _oMultiplayer) {
            _oMultiplayer.sendAction('stand');
        } else {
            this._playerStand(_iCurrentPlayerTurn);
            this._onPlayerPassTurn();
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
        if (_bMultiplayerMode) {
            // In multiplayer, bets go to the player's own seat
            var iMySeat = _oMultiplayer ? _oMultiplayer.getSeatIndex() : 0;
            if (iMySeat < 0) return;
            
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

    this._onSitDown = function() {
        if (!_bMultiplayerMode) {
            this.changeState(STATE_GAME_WAITING_FOR_BET);
            _oInterface.enableBetFiches();
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
