# פרויקט בלאקג'ק מולטיפלייר - זוזו

## סטטוס: פעיל ✅

## URLs חשובים
- **Frontend (Lovable):** https://zozoblackjeck.lovable.app
- **Game Engine (Vercel):** https://blackjack-game-seven-silk.vercel.app
- **Multiplayer:** https://zozoblackjeck.lovable.app/multiplayer

## Repos
- **blackjack-game:** /home/yossi/clawd/blackjack-game (GitHub: Yosi2377/blackjack-game)
- **zozoblackjeck:** /home/yossi/clawd/zozoblackjeck (GitHub: Yosi2377/zozoblackjeck)

## באגים שתוקנו (2026-02-01)

### 1. מסך שחור במולטיפלייר
- **בעיה:** SEAT_POSITIONS תמך ב-5 מושבים, ניסה ליצור 7
- **תיקון:** הוספתי 7 פוזיציות ב-CGameMultiplayer.js
- **קובץ:** blackjack-game/js/CGameMultiplayer.js

### 2. $NaN בתצוגת כסף
- **בעיה:** credits לא מאומתים לפני תצוגה
- **תיקון:** validation ב-CInterface.js וב-CGame.js

### 3. Origin check שגוי
- **בעיה:** בדק netlify.app במקום vercel.app
- **תיקון:** עדכון ב-Arcade.tsx

### 4. Iframe rendering
- **בעיה:** sizeHandler נקרא לפני שה-iframe קיבל גודל
- **תיקון:** קריאות מושהות (500ms, 1000ms, 2000ms) + retry logic
- **קבצים:** index.html, index_multiplayer.html, ctl_utils.js

## מבנה המשחק
- **CMain.js** - Entry point, טוען את המשחק
- **CGame.js** - Single player logic
- **CGameMultiplayer.js** - Multiplayer logic
- **CSeatMultiplayer.js** - מושב שחקן במולטיפלייר
- **CMultiplayerManager.js** - Supabase real-time sync
- **CInterface.js** - UI (כפתורים, תצוגת כסף)

## Supabase
- **URL:** https://lquazxoxvrntoocuvdsa.supabase.co
- **Tables:** game_tables, table_players, game_users

## באג מקלדת (2025-06-30 → 2026-02-01) - תוקן חלקית ✅

### הבעיה המקורית
לחיצת מקלדת גורמת למסך שחור. הסיבה: iframe resize ל-1x600 אחרי keyboard event.

### תיקונים שנעשו
1. **ctl_utils.js** - נעילת גודל iframe:
   - זיהוי iframe וכפיית גודל קבוע (785x600)
   - מניעת resize לאחר LOCK ראשוני
   
2. **main.css** - z-index לcanvas + הסתרת check-fonts

3. **index_multiplayer.html** - force repaint אחרי keyboard:
   - s_oStage.update()
   - opacity toggle trick

4. **Arcade.tsx** - 
   - preventDefault על keyboard events
   - backgroundColor ירוק ל-iframe

### סטטוס נוכחי
- ✅ עכבר עובד מצוין
- ✅ מקלדת עובדת (הפקודות מתקבלות)
- ⚠️ יש flicker למסך שחור לכמה שניות אחרי keyboard event
- ⚠️ המשחק ממשיך לרוץ ברקע וחוזר

### מה נשאר
- לחקור את הflicker - ייתכן בעיית compositing של canvas ב-iframe
- אפשרות: להוסיף CSS transform: translateZ(0) לאלץ GPU layer

## הערות
- המשחק משתמש ב-CreateJS לרינדור canvas
- ⚠️ יוסי רוצה **רק מולטיפלייר** - אסור לגעת בסינגל פלייר בכלל!
- ⚠️ לא לבדוק, לא להזכיר, לא לפתוח - רק מולטיפלייר!
- הקליקים על canvas לא עובדים דרך DOM events (CreateJS משתמש במערכת משלו)
