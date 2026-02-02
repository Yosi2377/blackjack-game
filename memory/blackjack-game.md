# Blackjack Game - Important Notes

## URLs
- **לבדוק תמיד דרך:** https://zozoblackjeck.lovable.app/lobby
- **לא לבדוק ישירות ב-Vercel** - חייב לבדוק דרך האפליקציה המוטמעת!

## מצב משחק
- מולטיפלייר - שם נמצאים התיקונים (index_multiplayer.html, CGameMultiplayer.js)
- לא single player!

## Repo
- Path: /home/yossi/clawd/blackjack-game
- GitHub: https://github.com/Yosi2377/blackjack-game
- Vercel: https://blackjack-game-seven-silk.vercel.app

## תיקונים שנעשו (2026-02-02)
1. fix/agent1-keyboard-actions - מקלדת עובדת במצבי משחק
2. fix/agent3-balance-sync - סנכרון באלאנס אחרי כל יד
3. fix/agent2-game-state-tracking - קבוע STATE_GAME_PLAYER_TURN חסר

## באגים שנמצאו
- [x] זכיות מחושבות כ-+0 (getCurBet מחזיר 0 בזמן חישוב) - **תוקן! commit 921329d**
- [ ] אינפלציית קרדיטים - יתרה עולה מהר מדי (975→5650 בכמה ידיים)
