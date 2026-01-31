function CMain(oData){
    var _bUpdate;
    var _iCurResource = 0;
    var RESOURCE_TO_LOAD = 0;
    var _iState = STATE_LOADING;
    
    var _oData;
    var _oPreloader;
    var _oMenu;
    var _oHelp;
    var _oGame;

    this.initContainer = function(){
        var canvas = document.getElementById("canvas");
        s_oStage = new createjs.Stage(canvas);       
        
        s_bMobile = isMobile();
        if(s_bMobile === false){
            s_oStage.enableMouseOver(20);  
            
        }else{
            createjs.Touch.enable(s_oStage, true);
        }
        s_iPrevTime = new Date().getTime();

        createjs.Ticker.setFPS(30);
	createjs.Ticker.addEventListener("tick", this._update);
		if(navigator.userAgent.match(/Windows Phone/i)){
			DISABLE_SOUND_MOBILE = true;
		}

        s_oSpriteLibrary  = new CSpriteLibrary();

        //ADD PRELOADER
        _oPreloader = new CPreloader();
        
        s_oGameSettings=new CGameSettings();
        _bUpdate = true;
    };
	
    this.preloaderReady = function(){
        this._loadImages();
		
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            this._initSounds();
        }
    };

    this.soundLoaded = function(){
        _iCurResource++;
	var iPerc = Math.floor(_iCurResource/RESOURCE_TO_LOAD *100);

        _oPreloader.refreshLoader(iPerc);

    };
    
    this._initSounds = function(){
		Howler.mute(!s_bAudioActive);

        s_aSoundsInfo  = new Array();
        s_aSoundsInfo.push({path: './sounds/',filename:'card',loop:false,volume:1, ingamename: 'card'});
        s_aSoundsInfo.push({path: './sounds/',filename:'chip',loop:false,volume:1, ingamename: 'chip'});
        s_aSoundsInfo.push({path: './sounds/',filename:'fiche_collect',loop:false,volume:1, ingamename: 'fiche_collect'});
        s_aSoundsInfo.push({path: './sounds/',filename:'press_but',loop:false,volume:1, ingamename: 'press_but'});
        s_aSoundsInfo.push({path: './sounds/',filename:'win',loop:false,volume:1, ingamename: 'win'});
        s_aSoundsInfo.push({path: './sounds/',filename:'lose',loop:false,volume:1, ingamename: 'lose'});
        
        RESOURCE_TO_LOAD += s_aSoundsInfo.length;

        s_aSounds = new Array();
        for(var i=0; i<s_aSoundsInfo.length; i++){
            this.tryToLoadSound(s_aSoundsInfo[i], false);
        }

        
    };  
    
    this.tryToLoadSound = function(oSoundInfo, bDelay){
        
       setTimeout(function(){        
            s_aSounds[oSoundInfo.ingamename] = new Howl({ 
                                                            src: [oSoundInfo.path+oSoundInfo.filename+'.mp3'],
                                                            autoplay: false,
                                                            preload: true,
                                                            loop: oSoundInfo.loop, 
                                                            volume: oSoundInfo.volume,
                                                            onload: s_oMain.soundLoaded,
                                                            onloaderror: function(szId,szMsg){
                                                                               for(var i=0; i < s_aSoundsInfo.length; i++){
                                                                                    if ( s_aSounds[s_aSoundsInfo[i].ingamename]._sounds.length>0 && szId === s_aSounds[s_aSoundsInfo[i].ingamename]._sounds[0]._id){
                                                                                        s_oMain.tryToLoadSound(s_aSoundsInfo[i], true);
                                                                                        break;
                                                                                    }else{
                                                                                        document.querySelector("#block_game").style.display = "none";
                                                                                    }
                                                                                }

                                                                        },
                                                            onplayerror: function(szId) {
                                                                for(var i=0; i < s_aSoundsInfo.length; i++){
                                                                                     if ( szId === s_aSounds[s_aSoundsInfo[i].ingamename]._sounds[0]._id){
                                                                                          s_aSounds[s_aSoundsInfo[i].ingamename].once('unlock', function() {
                                                                                            s_aSounds[s_aSoundsInfo[i].ingamename].play();


                                                                                          });
                                                                                         break;
                                                                                     }
                                                                                 }
                                                                       
                                                            } 
                                                        });

            
        }, (bDelay ? 200 : 0) );
        
        
    };


    this._loadImages = function(){
        s_oSpriteLibrary.init( this._onImagesLoaded,this._onAllImagesLoaded, this );

        s_oSpriteLibrary.addSprite("but_menu_bg","./sprites/but_menu_bg.png");
        s_oSpriteLibrary.addSprite("but_game_bg","./sprites/but_game_bg.png");
        s_oSpriteLibrary.addSprite("but_game_small_bg","./sprites/but_game_small_bg.png");
        s_oSpriteLibrary.addSprite("but_game_very_small_bg","./sprites/but_game_very_small_bg.png");
        s_oSpriteLibrary.addSprite("but_exit","./sprites/but_exit.png");
        s_oSpriteLibrary.addSprite("bg_menu","./sprites/bg_menu.jpg");
        s_oSpriteLibrary.addSprite("audio_icon","./sprites/audio_icon.png");
        s_oSpriteLibrary.addSprite("bg_game_1","./sprites/bg_game_1.jpg");
        s_oSpriteLibrary.addSprite("bg_game_2","./sprites/bg_game_2.jpg");
        s_oSpriteLibrary.addSprite("bg_game_3","./sprites/bg_game_3.jpg");
        s_oSpriteLibrary.addSprite("bg_game_4","./sprites/bg_game_4.jpg");
        s_oSpriteLibrary.addSprite("seat","./sprites/seat.png");
        s_oSpriteLibrary.addSprite("card_spritesheet","./sprites/card_spritesheet.png");
        s_oSpriteLibrary.addSprite("arrow_hand","./sprites/arrow_hand.png");
        s_oSpriteLibrary.addSprite("msg_box","./sprites/msg_box.png");
        s_oSpriteLibrary.addSprite("display_bg","./sprites/display_bg.png");
        s_oSpriteLibrary.addSprite("bet_bg","./sprites/bet_bg.png");
        s_oSpriteLibrary.addSprite("money_bg","./sprites/money_bg.png");
        s_oSpriteLibrary.addSprite("but_fullscreen","./sprites/but_fullscreen.png");
        s_oSpriteLibrary.addSprite("logo_ctl","./sprites/logo_ctl.png");
        s_oSpriteLibrary.addSprite("but_credits","./sprites/but_credits.png");
        
        for(var i=0;i<NUM_FICHES;i++){
            s_oSpriteLibrary.addSprite("fiche_"+i,"./sprites/fiche_"+i+".png");
        }
        
        RESOURCE_TO_LOAD += s_oSpriteLibrary.getNumSprites();

        s_oSpriteLibrary.loadSprites();
    };
    
    this._onImagesLoaded = function(){
        _iCurResource++;

        var iPerc = Math.floor(_iCurResource/RESOURCE_TO_LOAD *100);

        _oPreloader.refreshLoader(iPerc);
    };
    
    this._onAllImagesLoaded = function(){
        
    };

    this._onRemovePreloader = function(){
        _oPreloader.unload();

        this.gotoMenu();
    };
    
    this.gotoMenu = function(){
        _oMenu = new CMenu();
        _iState = STATE_MENU;
    };
    
    this.gotoGame = function(){
        // Check if multiplayer mode is enabled and num_seats > 1
        if (_oData.multiplayer && _oData.num_seats > 1 && typeof CGameMultiplayer !== 'undefined' && typeof CSeatMultiplayer !== 'undefined') {
            console.log('[CMain] Starting CGameMultiplayer with', _oData.num_seats, 'seats');
            _oGame = new CGameMultiplayer(_oData);
        } else if (_oData.multiplayer && _oData.num_seats === 1 && typeof CGameMultiplayer !== 'undefined' && typeof CSeatMultiplayer !== 'undefined') {
            // Single player in multiplayer mode - still use CGameMultiplayer for consistency
            console.log('[CMain] Starting CGameMultiplayer with 1 seat');
            _oGame = new CGameMultiplayer(_oData);
        } else {
            console.log('[CMain] Starting regular CGame');
            _oGame = new CGame(_oData);
        }
							
        _iState = STATE_GAME;
    };
    
    this.gotoHelp = function(){
        _oHelp = new CHelp();
        _iState = STATE_HELP;
    };
    
    this.stopUpdate = function(){
        _bUpdate = false;
        createjs.Ticker.paused = true;
        $("#block_game").css("display","block");
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            Howler.mute(true);
        }
        
    };

    this.startUpdate = function(){
        s_iPrevTime = new Date().getTime();
        _bUpdate = true;
        createjs.Ticker.paused = false;
        $("#block_game").css("display","none");
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            if(s_bAudioActive){
                Howler.mute(false);
            }
        }
        
    };
    
    this._update = function(event){
        if(!_bUpdate){
            return;
        }
        var iCurTime = new Date().getTime();
        s_iTimeElaps = iCurTime - s_iPrevTime;
        s_iCntTime += s_iTimeElaps;
        s_iCntFps++;
        s_iPrevTime = iCurTime;
        
        if ( s_iCntTime >= 1000 ){
            s_iCurFps = s_iCntFps;
            s_iCntTime-=1000;
            s_iCntFps = 0;
        }
                
        if(_iState === STATE_GAME){
            _oGame.update();
        }
        
        s_oStage.update(event);

    };
    
    s_oMain = this;
    
    _oData = oData;
    ENABLE_CHECK_ORIENTATION = oData.check_orientation;
    ENABLE_FULLSCREEN = oData.fullscreen;
    SHOW_CREDITS = oData.show_credits;
    s_bAudioActive = oData.audio_enable_on_startup;

    this.initContainer();
}

var s_bMobile;
var s_bAudioActive = true;
var s_iCntTime = 0;
var s_iTimeElaps = 0;
var s_iPrevTime = 0;
var s_iCntFps = 0;
var s_iCurFps = 0;

var s_oDrawLayer;
var s_oStage;
var s_oMain;
var s_oSpriteLibrary;
var s_oGameSettings;
var s_bFullscreen = false;
var s_aSounds;
var s_aSoundsInfo;