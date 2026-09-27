# DateIdeas

Aplicație web pentru cupluri: idei de date-uri comune, amintiri cu poze și notițe, chat privat.
HTML, CSS și JavaScript modern (module ES), fără pas de build. Backend: Firebase (Auth, Firestore, Storage).

## Publicare pe Firebase Hosting (o singură dată, de pe calculator)

1. Instalează Node.js de pe https://nodejs.org (varianta LTS).
2. Dezarhivează proiectul, deschide folderul `dateideas`, apoi deschide un terminal în el
   (în Windows: click în bara de adresă a folderului, scrie `cmd`, Enter).
3. Rulează, pe rând:
   ```
   npm install -g firebase-tools
   firebase login
   firebase deploy
   ```
4. La final apare linkul aplicației: **https://dateideas-1bfd9.web.app**

`firebase deploy` publică site-ul **și** regulile de securitate din `firestore.rules` și `storage.rules`,
deci nu mai trebuie copiate manual în consolă.

Pentru actualizări: modifici fișierele și rulezi din nou `firebase deploy`.

## Pe iPhone

Deschide linkul în Safari, apasă butonul de Share, apoi „Adaugă pe ecranul principal”.
DateIdeas se deschide apoi ca o aplicație, pe tot ecranul.

## Structura codului

```
js/
  app.js              composition root: creează obiectele și le leagă (injecție de dependențe)
  core/               infrastructură: SDK, event bus (Observer), sesiune, router, erori
  repositories/       singurul strat care vorbește cu Firestore (Repository pattern)
  services/           logica aplicației: auth, profil, împerechere, idei, amintiri, chat, poze, notificări
  ui/
    components/       componente reutilizabile: bilet, polaroid, sheet, toast, chat, shell
    views/            ecranele; fiecare e o clasă View cu render() și destroy()
css/styles.css        tokeni de design, componente, ecrane, responsive
firestore.rules       reguli de securitate pentru baza de date
storage.rules         reguli de securitate pentru poze
```

Principii urmate:
- **Single responsibility**: fiecare clasă face un singur lucru (ex. `ImageCompressor` doar micșorează poze).
- **Open/closed**: ecranele noi se adaugă cu `router.add()`, fără să modifici routerul.
- **Dependency inversion**: serviciile primesc repository-urile prin constructor; doar `app.js` știe de Firebase.
- **Observer**: `EventBus` + `CoupleDataHub` țin un singur abonament real-time pentru idei și mesaje.
- Textul utilizatorilor e inserat mereu ca text, nu ca HTML (protecție XSS).

## Modelul de date

```
users/{uid}                    username, displayName, photoURL, coupleId
usernames/{username}           { uid }  garantează unicitatea
partnerRequests/{id}           from/to, status: pending | accepted | declined
couples/{uid1_uid2}            members, anniversary
ideas/{id}                     titlu, descriere, categorie, imagine, autor, likes, status, doneDate
ideas/{id}/entries/{id}        amintirea unei persoane: notă + poze
messages/{coupleId}/msgs/{id}  mesajele din chat
```
