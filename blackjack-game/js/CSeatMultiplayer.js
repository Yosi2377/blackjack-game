/**
 * CSeatMultiplayer - Seat with position support and multiplayer features
 */
function CSeatMultiplayer(iX, iY, iSeatIndex) {
    
    var _bDoubleActive;
    var _bInsuranceActive;
    var _bOccupied;
    var _bActive;
    var _iCurHand;
    var _iCardDealedToPlayer;
    var _iCredit;
    var _iSeatIndex;
    var _sPlayerId;
    var _sPlayerName;
    var _aHands;
    var _aPlayerCards;
    var _aFichesOnTable;
    var _vAttachPos;
    
    var _oGroup;
    var _oCurCardValueText;
    var _oCurCardSplitValueText;
    var _oCurBetText;
    var _oCurSplitBetText;
    var _oSitDownBut;
    var _oInsuranceFiches;
    var _oCardOffset;
    var _oSplitOffset;
    var _oResultText_0;
    var _oResultText_1;
    var _oArrowCurPlayer;
    var _oPlayerNameText;
    var _oActiveIndicator;
    
    var _oMainFichesController;
    var _oSplitFichesController;
    var _oPlayerAvatar;
    var _oYouIndicator;
    
    var _aCbCompleted;
    var _aCbOwner;

    this._init = function(iX, iY, iSeatIndex) {
        _iSeatIndex = iSeatIndex;
        _bOccupied = false;
        _bActive = false;
        _sPlayerId = null;
        _sPlayerName = 'Player ' + (iSeatIndex + 1);
        
        _oGroup = new createjs.Container();
        _oGroup.x = iX;
        _oGroup.y = iY;
        
        // Seat background
        var oBg = createBitmap(s_oSpriteLibrary.getSprite('seat'));
        oBg.x = -50;
        oBg.y = 50;
        oBg.regX = 0;
        oBg.regY = 0;
        _oGroup.addChild(oBg);
        
        // Active indicator (glow effect)
        _oActiveIndicator = new createjs.Shape();
        _oActiveIndicator.graphics.beginFill("rgba(255, 215, 0, 0.3)").drawRoundRect(-60, 40, 230, 200, 10);
        _oActiveIndicator.visible = false;
        _oGroup.addChild(_oActiveIndicator);
        
        // Player name
        _oPlayerNameText = new createjs.Text(_sPlayerName, "18px " + FONT_GAME_1, "#ffffff");
        _oPlayerNameText.shadow = new createjs.Shadow("#000000", 2, 2, 1);
        _oPlayerNameText.x = 55;
        _oPlayerNameText.y = 250;
        _oPlayerNameText.textAlign = "center";
        _oGroup.addChild(_oPlayerNameText);
        
        // Sit down button (for empty seats in multiplayer)
        var oSprite = s_oSpriteLibrary.getSprite('but_game_small_bg');
        _oSitDownBut = new CTextButton(55, 150, oSprite, TEXT_SIT_DOWN, FONT_GAME_1, "#ffffff", 18, _oGroup);
        _oSitDownBut.addEventListener(ON_MOUSE_UP, this._onSitDown, this);
        _oSitDownBut.setVisible(true);
        
        // Current bet text
        _oCurBetText = new createjs.Text("", "18px " + FONT_GAME_1, "#ffde00");
        _oCurBetText.shadow = new createjs.Shadow("#000000", 2, 2, 1);
        _oCurBetText.x = 20;
        _oCurBetText.y = 80;
        _oCurBetText.textAlign = "right";
        _oGroup.addChild(_oCurBetText);
        
        // Split bet text
        _oCurSplitBetText = new createjs.Text("", "18px " + FONT_GAME_1, "#ffde00");
        _oCurSplitBetText.shadow = new createjs.Shadow("#000000", 2, 2, 1);
        _oCurSplitBetText.x = 110;
        _oCurSplitBetText.y = 80;
        _oCurSplitBetText.textAlign = "left";
        _oGroup.addChild(_oCurSplitBetText);
        
        // Card value text
        _oCurCardValueText = new createjs.Text("", "20px " + FONT_GAME_1, "#ffffff");
        _oCurCardValueText.shadow = new createjs.Shadow("#000000", 2, 2, 1);
        _oCurCardValueText.x = -10;
        _oCurCardValueText.y = 0;
        _oCurCardValueText.textAlign = "right";
        _oGroup.addChild(_oCurCardValueText);
        
        // Split card value text
        _oCurCardSplitValueText = new createjs.Text("", "20px " + FONT_GAME_1, "#ffffff");
        _oCurCardSplitValueText.shadow = new createjs.Shadow("#000000", 2, 2, 1);
        _oCurCardSplitValueText.x = 80;
        _oCurCardSplitValueText.y = 0;
        _oCurCardSplitValueText.textAlign = "left";
        _oGroup.addChild(_oCurCardSplitValueText);
        
        // Result text
        _oResultText_0 = new createjs.Text("", "22px " + FONT_GAME_1, "#ffffff");
        _oResultText_0.shadow = new createjs.Shadow("#000000", 2, 2, 1);
        _oResultText_0.x = 55;
        _oResultText_0.y = 115;
        _oResultText_0.textAlign = "center";
        _oGroup.addChild(_oResultText_0);
        
        _oResultText_1 = new createjs.Text("", "20px " + FONT_GAME_1, "#ffffff");
        _oResultText_1.shadow = new createjs.Shadow("#000000", 2, 2, 1);
        _oResultText_1.x = 130;
        _oResultText_1.y = 115;
        _oResultText_1.textAlign = "left";
        _oGroup.addChild(_oResultText_1);
        
        // Turn indicator arrow
        _oArrowCurPlayer = createBitmap(s_oSpriteLibrary.getSprite('arrow_hand'));
        _oArrowCurPlayer.visible = false;
        _oArrowCurPlayer.x = 30;
        _oArrowCurPlayer.y = -20;
        _oGroup.addChild(_oArrowCurPlayer);
        
        // Player avatar (emoji indicator) - shows which seat is YOURS
        _oPlayerAvatar = new createjs.Text("👤", "40px Arial", "#ffffff");
        _oPlayerAvatar.x = 55;
        _oPlayerAvatar.y = 200;
        _oPlayerAvatar.textAlign = "center";
        _oPlayerAvatar.visible = false;
        _oGroup.addChild(_oPlayerAvatar);
        
        // "YOU" indicator text
        _oYouIndicator = new createjs.Text("◀ YOU", "bold 16px Arial", "#00ff00");
        _oYouIndicator.shadow = new createjs.Shadow("#000000", 2, 2, 2);
        _oYouIndicator.x = 120;
        _oYouIndicator.y = 255;
        _oYouIndicator.visible = false;
        _oGroup.addChild(_oYouIndicator);

        s_oStage.addChild(_oGroup);
        
        // Insurance fiches position
        _oInsuranceFiches = new CVector2();
        _oInsuranceFiches.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        // Fiches controller
        _oMainFichesController = new CFichesController({ x: iX + 55, y: iY + 200 }, _oInsuranceFiches);
        
        _iCredit = 0;
        _aHands = [];
        _aPlayerCards = [];
        
        this.reset();
        
        // Card attachment offset (relative to seat position)
        _oCardOffset = new CVector2();
        _oCardOffset.set(0, 40);
        _vAttachPos = new CVector2(_oCardOffset.getX(), _oCardOffset.getY());
        
        // Split offset
        _oSplitOffset = new CVector2();
        _oSplitOffset.set(90, 40);
        
        _aCbCompleted = [];
        _aCbOwner = [];
    };
    
    this.unload = function() {
        s_oStage.removeChild(_oGroup);
    };
    
    this.addEventListener = function(iEvent, cbCompleted, cbOwner) {
        _aCbCompleted[iEvent] = cbCompleted;
        _aCbOwner[iEvent] = cbOwner;
    };
    
    this.reset = function() {
        _iCurHand = 0;
        _iCardDealedToPlayer = 0;
        _bDoubleActive = false;
        _bInsuranceActive = false;

        for (var i = 0; i < _aHands.length; i++) {
            if (_aHands[i].getFichesController()) {
                _aHands[i].getFichesController().reset();
            }
        }

        _aHands = [];
        var oHand = new CHandController(_oCardOffset, _oMainFichesController);
        _aHands.push(oHand);

        for (var k = 0; k < _aPlayerCards.length; k++) {
            _aPlayerCards[k].unload();
        }
        _aPlayerCards = [];
        _aFichesOnTable = [];

        _oMainFichesController.addEventListener(FICHES_END_MOV, this._onFichesEndMove);
        _oSplitFichesController = null;
        
        this.clearText();
        this.setActive(false);
    };
    
    this.clearText = function() {
        _oCurBetText.text = "";
        _oCurSplitBetText.text = "";
        _oCurCardValueText.text = "";
        _oCurCardSplitValueText.text = "";
        _oResultText_0.text = "";
        _oResultText_1.text = "";
    };
    
    this.clearBet = function() {
        _oMainFichesController.reset();
        _aFichesOnTable = [];
        _oCurBetText.text = "";
        if (_aHands[_iCurHand]) {
            _aHands[_iCurHand].changeBet(0);
        }
    };
    
    this.clearPlayerInfo = function() {
        _sPlayerId = null;
        _sPlayerName = 'Player ' + (_iSeatIndex + 1);
        _oPlayerNameText.text = _sPlayerName;
    };

    // Multiplayer methods
    
    this.setPlayerInfo = function(sName, sId) {
        _sPlayerName = sName;
        _sPlayerId = sId;
        _oPlayerNameText.text = sName;
        _oSitDownBut.setVisible(false);
    };
    
    this.getPlayerId = function() {
        return _sPlayerId;
    };
    
    this.getPlayerName = function() {
        return _sPlayerName;
    };
    
    this.getSeatIndex = function() {
        return _iSeatIndex;
    };
    
    this.setOccupied = function(bOccupied) {
        _bOccupied = bOccupied;
        _oSitDownBut.setVisible(!bOccupied);
        
        if (!bOccupied) {
            this.clearPlayerInfo();
            this.reset();
        }
    };
    
    this.isOccupied = function() {
        return _bOccupied;
    };
    
    this.setActive = function(bActive) {
        _bActive = bActive;
        _oActiveIndicator.visible = bActive;
        _oArrowCurPlayer.visible = bActive;
        
        if (bActive) {
            // Pulse animation
            createjs.Tween.removeTweens(_oActiveIndicator);
            createjs.Tween.get(_oActiveIndicator, { loop: true })
                .to({ alpha: 0.5 }, 500)
                .to({ alpha: 1 }, 500);
        } else {
            createjs.Tween.removeTweens(_oActiveIndicator);
            _oActiveIndicator.alpha = 1;
        }
    };
    
    this.isActive = function() {
        return _bActive;
    };
    
    this.enableBetting = function(bEnable) {
        // Visual feedback that betting is enabled for this seat
        if (bEnable) {
            _oGroup.alpha = 1;
        } else {
            _oGroup.alpha = 0.7;
        }
    };
    
    this.setBet = function(iBet) {
        if (_aHands[_iCurHand]) {
            _aHands[_iCurHand].changeBet(iBet);
        }
        _oCurBetText.text = iBet > 0 ? TEXT_CURRENCY + iBet : "";
    };

    // Original CSeat methods (slightly modified)
    
    this.addCardToHand = function(oCard) {
        _aHands[_iCurHand].addCard(oCard);
        _aPlayerCards.push(oCard);
        oCard.addEventListener(ON_CARD_TO_REMOVE, this._onRemoveCard);
    };
    
    this.increaseHandValue = function(iValue) {
        _aHands[_iCurHand].increaseHandValue(iValue);
    };
    
    this.refreshCardValue = function() {
        _oCurCardValueText.text = "" + this.getHandValue(0);
        if (this.getHandValue(1) > 0) {
            _oCurCardSplitValueText.text = "" + this.getHandValue(1);
        }
    };
    
    this.setCredit = function(iNewCredit) {
        _iCredit = iNewCredit;
    };
    
    this.increaseCredit = function(iCreditToAdd) {
        _iCredit += iCreditToAdd;
    };
    
    this.changeBet = function(iBet) {
        _aHands[_iCurHand].changeBet(iBet);
    };
    
    this.checkHand = function() {
        var iHandValue = _aHands[_iCurHand].getValue();
        
        if (iHandValue === 21) {
            this.checkPlayerLastHand(PASS_TURN);
        } else if (iHandValue > 21) {
            if (_aHands[_iCurHand].getAces() > 0) {
                _aHands[_iCurHand].removeAce();

                if (_aHands[_iCurHand].getValue() === 21) {
                    this.checkPlayerLastHand(PASS_TURN);
                } else if (_bDoubleActive) {
                    this.checkPlayerLastHand(PASS_TURN);
                } else {
                    if (_aCbCompleted[RESTORE_ACTION]) {
                        _aCbCompleted[RESTORE_ACTION].call(_aCbOwner[RESTORE_ACTION], false, true, true, false, false);
                    }
                }
                this.refreshCardValue();
            } else {
                if (_aHands.length > 1 || _bInsuranceActive) {
                    this.checkPlayerLastHand(PASS_TURN);
                } else {
                    this.checkPlayerLastHand(PLAYER_LOSE);
                }
            }
        } else {
            if (_bDoubleActive) {
                this.checkPlayerLastHand(PASS_TURN);
            } else {
                var bActivateDouble = false;
                if (_aHands[_iCurHand].getNumCards() === 2 && iHandValue > 8 && iHandValue < 16) {
                    bActivateDouble = true;
                } else if (this.getAces() > 0) {
                    if (iHandValue > 21) {
                        iHandValue -= 10;
                        this.removeAce();
                        if ((iHandValue > 8) && (iHandValue < 16)) {
                            bActivateDouble = true;
                        }
                    } else {
                        var iTmpValue = iHandValue - 10;
                        if (_aHands[_iCurHand].getNumCards() === 2 && iTmpValue > 8 && iTmpValue < 16) {
                            bActivateDouble = true;
                        }
                    }
                }

                if (_aCbCompleted[RESTORE_ACTION]) {
                    _aCbCompleted[RESTORE_ACTION].call(_aCbOwner[RESTORE_ACTION], false, true, true, bActivateDouble, false);
                }
            }
        }
    };
    
    this.checkPlayerLastHand = function(szAction) {
        _iCurHand--;
        if (_iCurHand > -1) {
            if (_aCbCompleted[RESTORE_ACTION]) {
                _aCbCompleted[RESTORE_ACTION].call(_aCbOwner[RESTORE_ACTION], false, true, true, false, false);
            }
            _oArrowCurPlayer.x = _oCardOffset.getX();
        } else {
            if (_aCbCompleted[szAction]) {
                _aCbCompleted[szAction].call(_aCbOwner[szAction], _iSeatIndex);
            }
            this.removeArrow();
        }
    };
    
    this.bet = function(iBet, bSplit) {
        if (bSplit) {
            _oCurBetText.text = TEXT_CURRENCY + (iBet / 2);
            _oCurSplitBetText.text = TEXT_CURRENCY + (iBet / 2);
        } else {
            _oCurBetText.text = TEXT_CURRENCY + iBet;
        }
    };
    
    this.setSplitHand = function() {
        var aSplitBet = [];
        for (var i = 0; i < _aFichesOnTable.length; i++) {
            aSplitBet.push(_aFichesOnTable[i]);
        }

        var oSplitFichesPos = { 
            x: _oGroup.x + _oSplitOffset.getX() + 55, 
            y: _oGroup.y + _oSplitOffset.getY() + 160 
        };
        
        _oSplitFichesController = new CFichesController(oSplitFichesPos, _oInsuranceFiches);
        _oSplitFichesController.refreshFiches(aSplitBet, 0, 0, false);
        _oSplitFichesController.addEventListener(FICHES_END_MOV, this._onFichesEndMove);
        
        var oHand = new CHandController(_oSplitOffset, _oSplitFichesController);
        _aHands.push(oHand);

        _aHands[1].addCard(_aHands[0].getCard(1));
        _aHands[0].removeCard(1);
      
        if (_aHands[0].getValue() === 1) {
            _aHands[0].setHandValue(11);
            _aHands[0].increaseAces();
        }
        _aHands[1].setHandValue(_aHands[0].getValue());

        _iCurHand = _aHands.length - 1;
    };
    
    this.decreaseCredit = function(iCreditToSubtract) {
        _iCredit -= iCreditToSubtract;
    };
    
    this.stand = function() {
        this.checkPlayerLastHand(PASS_TURN);
    };
    
    this.refreshFiches = function(iFicheValue, iFicheIndex, iXPos, iYPos) {
        _aFichesOnTable.push({ value: iFicheValue, index: iFicheIndex });
        _oMainFichesController.refreshFiches(_aFichesOnTable, iXPos, iYPos);
    };
    
    this.initMovement = function(iHand, iEndX, iEndY) {
        var oCurFichesController = this.getFichesController(iHand);
        oCurFichesController.initMovement(iEndX, iEndY, false);
    };
                
    this.initInsuranceMov = function(iXPos, iYPos) {
        _oMainFichesController.initInsuranceMov(iXPos, iYPos);
    };
    
    this.showWinner = function(iHand, szWinner, iTotalWin) {
        if (iTotalWin > 0) {
            if (iHand === 0) {
                _oResultText_0.text = szWinner;
            } else {
                _oResultText_1.text = szWinner;
            }
        } else {
            if (iHand === 0) {
                _oResultText_0.text = szWinner;
            } else {
                _oResultText_1.text = szWinner;
            }
        }
        
        var oParent = this;

        if (iHand === 0) {
            _oResultText_0.alpha = 0;
            createjs.Tween.get(_oResultText_0).to({ alpha: 1 }, TIME_SHOW_FINAL_CARDS / 2).call(function() {
                oParent.endWinAnim();
            });
        } else {
            _oResultText_1.alpha = 0;
            createjs.Tween.get(_oResultText_1).to({ alpha: 1 }, TIME_SHOW_FINAL_CARDS / 2).call(function() {
                oParent.endWinAnim();
            });
        }

        // FIX: Remove duplicate save_score - CGameMultiplayer already handles balance sync
        // $(s_oMain).trigger("save_score", [_iCredit]);
    };
    
    this.endWinAnim = function() {
        // Result stays visible until reset
    };
    
    this.newCardDealed = function() {
        _iCardDealedToPlayer++;
        return _iCardDealedToPlayer;
    };
    
    this.removeAce = function() {
        _aHands[_iCurHand].removeAce();
    };
    
    this.removeArrow = function() {
        _oArrowCurPlayer.visible = false;
    };
    
    this.doubleAction = function(iCurBet) {
        _aHands[_iCurHand].changeBet(iCurBet);

        var aDoubleBet = [];
        for (var i = 0; i < _aFichesOnTable.length; i++) {
            aDoubleBet.push(_aFichesOnTable[i]);
        }

        if (_aHands.length > 1) {
            if (_iCurHand === 1) {
                _oSplitFichesController.refreshFiches(aDoubleBet, 0, 40);
            } else {
                _oMainFichesController.refreshFiches(aDoubleBet, 0, 40);
            }
        } else {
            _oMainFichesController.refreshFiches(aDoubleBet, 0, 40);
        }
    };
    
    this.split = function() {
        var baseX = _oGroup.x;
        var baseY = _oGroup.y;
        
        _aPlayerCards[0].initSplit(new CVector2(baseX + _oCardOffset.getX(), baseY + _oCardOffset.getY()));
        _aPlayerCards[1].initSplit(new CVector2(baseX + _oSplitOffset.getX(), baseY + _oSplitOffset.getY()));
        _aPlayerCards[1].addEventListener(SPLIT_CARD_END_ANIM, this._onSplitCardEndAnim);
    };
    
    this.insurance = function(iCurBet, iCredit, iInsuranceBet) {
        this.changeBet(iCurBet);
        this.increaseCredit(iCredit);

        var aFichePile = _oMainFichesController.createFichesPile(iInsuranceBet, true);
        _aFichesOnTable = [];
        for (var k = 0; k < aFichePile.length; k++) {
            _aFichesOnTable.push({ value: aFichePile[k].value, index: aFichePile[k].index });
        }
            
        _bInsuranceActive = true;
    };
    
    this.rebet = function() {
        var iValue = _oMainFichesController.getPrevBet();

        if (iValue > _iCredit || iValue === 0) {
            return 0;
        } else {
            this.decreaseCredit(iValue);
            this.changeBet(iValue);
            
            var aFichePile = _oMainFichesController.createFichesPile(iValue, false);
            _aFichesOnTable = [];
            for (var k = 0; k < aFichePile.length; k++) {
                _aFichesOnTable.push({ value: aFichePile[k].value, index: aFichePile[k].index });
            }
            
            this.bet(iValue, false);
            return iValue;
        }
    };
    
    this.setVisibleSitDownButton = function(bVisible) {
        _oSitDownBut.setVisible(bVisible);
    };
    
    this.showPlayerAvatar = function(bShow) {
        _oPlayerAvatar.visible = bShow;
        _oYouIndicator.visible = bShow;
        
        if (bShow) {
            // Pulse animation for the avatar
            createjs.Tween.removeTweens(_oPlayerAvatar);
            createjs.Tween.get(_oPlayerAvatar, { loop: true })
                .to({ scaleX: 1.1, scaleY: 1.1 }, 500)
                .to({ scaleX: 1, scaleY: 1 }, 500);
        } else {
            createjs.Tween.removeTweens(_oPlayerAvatar);
            _oPlayerAvatar.scaleX = 1;
            _oPlayerAvatar.scaleY = 1;
        }
    };
    
    this._onSitDown = function() {
        _oSitDownBut.setVisible(false);
        if (_aCbCompleted[SIT_DOWN]) {
            _aCbCompleted[SIT_DOWN].call(_aCbOwner[SIT_DOWN], _iSeatIndex);
        }
    };
    
    this._onFichesEndMove = function() {
        if (_aCbCompleted[ASSIGN_FICHES]) {
            _aCbCompleted[ASSIGN_FICHES].call(_aCbOwner[ASSIGN_FICHES]);
        }
    };
                
    this._onRemoveCard = function(oCard) {
        for (var i = 0; i < _aPlayerCards.length; i++) {
            if (_aPlayerCards[i] === oCard) {
                _aPlayerCards.splice(i, 1);
                break;
            }
        }
    };
    
    this._onSplitCardEndAnim = function() {
        s_oGame._onSplitCardEndAnim();

        _oArrowCurPlayer.x = _oSplitOffset.getX() + 30;
        _oArrowCurPlayer.y = _oSplitOffset.getY() - 20;
        _oArrowCurPlayer.visible = true;
    };
    
    this.updateFichesController = function(iTime) {
        if (_oSplitFichesController) {
            _oSplitFichesController.update(iTime);
        }
        _oMainFichesController.update(iTime);
    };
    
    this.updateSplit = function() {
        for (var i = 0; i < _aPlayerCards.length; i++) {
            _aPlayerCards[i].update(s_iTimeElaps);
        }
    };
    
    this.isSplitAvailable = function() {
        if (!_aPlayerCards[0] || !_aPlayerCards[1]) {
            return false;
        }

        if (Math.abs(_aPlayerCards[0].getFotogram() - _aPlayerCards[1].getFotogram()) % 13 === 0) {
            return true;
        } else {
            return false;
        }
    };
    
    this.getAttachCardOffset = function() {
        var baseX = _oGroup.x;
        var baseY = _oGroup.y;
        
        if (_iCurHand === 0) {
            _vAttachPos.set(
                baseX + _oCardOffset.getX() + ((CARD_WIDTH / 2) * _aHands[_iCurHand].getNumCards()),
                baseY + _oCardOffset.getY() - (CARD_HEIGHT / 2) * _aHands[_iCurHand].getNumCards()
            );
        } else {
            var iXPos = baseX + _oSplitOffset.getX() + ((CARD_WIDTH / 2) * _aHands[_iCurHand].getNumCards());
            var iYPos = baseY + _oSplitOffset.getY() - (CARD_HEIGHT / 2) * _aHands[_iCurHand].getNumCards();
            _vAttachPos.set(iXPos, iYPos);
        }

        return _vAttachPos;
    };
    
    this.getCurBet = function() {
        return _aHands[_iCurHand] ? _aHands[_iCurHand].getCurBet() : 0;
    };
    
    this.getCredit = function() {
        return _iCredit;
    };
    
    this.getHandValue = function(iIndex) {
        if (iIndex > _aHands.length - 1) {
            return 0;
        }
        return _aHands[iIndex].getValue();
    };
    
    this.getNumHands = function() {
        return _aHands.length;
    };
    
    this.getNumCardsForHand = function(iIndex) {
        return _aHands[iIndex] ? _aHands[iIndex].getNumCards() : 0;
    };
    
    this.getBetForHand = function(iHand) {
        return _aHands[iHand] ? _aHands[iHand].getCurBet() : 0;
    };
                
    this.getAces = function() {
        return _aHands[_iCurHand] ? _aHands[_iCurHand].getAces() : 0;
    };
                
    this.getFichesController = function(iHandIndex) {
        return _aHands[iHandIndex] ? _aHands[iHandIndex].getFichesController() : null;
    };
    
    this.getCardOffset = function() {
        return _oCardOffset;
    };
    
    this.getPlayerCards = function() {
        return _aPlayerCards;
    };
    
    this.getStartingBet = function() {
        return _oMainFichesController.getValue();
    };

    this._init(iX, iY, iSeatIndex);
}
