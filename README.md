# DateIdeas

Aplicație web pentru cupluri: idei de date-uri comune, amintiri cu poze și notițe, chat privat.
HTML, CSS și JavaScript modern (module ES), fără pas de build. Backend: Firebase (Auth, Firestore, Storage, Cloud Functions).

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

`firebase deploy` publică site-ul, Cloud Functions **și** regulile de securitate din `firestore.rules` și `storage.rules`,
deci nu mai trebuie copiate manual în consolă. Înainte de primul deploy, vezi „Sugestii de poze” mai jos (secretele și `npm install` în `functions/`).

Pentru actualizări: modifici fișierele și rulezi din nou `firebase deploy`.

## Sugestii de poze pentru idei

Când scrii titlul unei idei (minimum 3 caractere), aplicația caută singură poze potrivite:
- **Google Places** pentru locuri concrete (un restaurant, „Jumbo”, Castelul Corvinilor), cu eticheta „Loc”;
- **Pixabay** pentru idei generale (picnic, patinaj, cină la lumânări), cu eticheta „Pixabay”.

Alegi una din grilă sau pui o poză din telefon; dacă nu alegi nimic, ideea primește prima sugestie.
Dacă îți dă voie, aplicația folosește o singură dată locația aproximativă, pentru locuri din apropiere.
Din detaliul ideii, „Schimbă poza” deschide aceleași opțiuni.

Cum se salvează poza:
- **din telefon**: se micșorează și se urcă în Storage (`coupleUploads/{cuplu}/ideas/`);
- **Pixabay**: serverul o descarcă și o salvează în același folder (Pixabay nu permite hotlinking);
- **Google Places**: nu se salvează (termenii Google Maps Platform interzic stocarea pozelor);
  păstrăm doar `imagePlaceId` și creditul, iar URL-ul pozei se cere la fiecare afișare.

Cheile API (`PLACES_API_KEY`, `PIXABAY_API_KEY`) stau doar pe server, ca secrete Firebase.
Creditul pozei (autorul, cu link) apare în detaliul ideii.

### Configurare (o singură dată)

1. **Google Places**: în Google Cloud Console (proiectul Firebase), activează *Places API (New)* și creează o cheie API.
   Restricționeaz-o la *Places API (New)*. Proiectul trebuie să fie pe planul Blaze (Cloud Functions îl cer oricum).
2. **Pixabay**: fă-ți cont pe https://pixabay.com și ia cheia de la https://pixabay.com/api/docs/.
3. Din folderul proiectului:
   ```
   cd functions
   npm install
   cd ..
   firebase functions:secrets:set PLACES_API_KEY
   firebase functions:secrets:set PIXABAY_API_KEY
   firebase deploy --only functions,hosting,firestore:rules,storage
   ```

### Testare locală (emulator)

Pune cheile în `functions/.secret.local` (fișierul e în `.gitignore`, nu ajunge în git):
```
PLACES_API_KEY=...
PIXABAY_API_KEY=...
```
apoi rulează `firebase emulators:start --only functions,auth,firestore,storage`.
Verificarea de sintaxă pentru tot codul (aplicație + functions): `npm --prefix functions run check`.

## Pe iPhone

Deschide linkul în Safari, apasă butonul de Share, apoi „Adaugă pe ecranul principal”.
DateIdeas se deschide apoi ca o aplicație, pe tot ecranul.

## Structura codului

```
js/
  app.js              composition root: creează obiectele și le leagă (injecție de dependențe)
  core/               infrastructură: SDK, event bus (Observer), sesiune, router, erori
  repositories/       singurul strat care vorbește cu Firestore (Repository pattern)
  services/           logica aplicației: auth, profil, împerechere, idei, amintiri, chat, poze, sugestii de poze, locație, notificări
  ui/
    components/       componente reutilizabile: bilet, polaroid, sheet, toast, chat, shell, sugestii de poze
    views/            ecranele; fiecare e o clasă View cu render() și destroy()
functions/            Cloud Functions (Node 20, europe-west1), callable, cer cont și cuplu
  index.js            searchImages, importPixabayImage, resolvePlacePhoto
  src/                clienți Places și Pixabay, cereri cu timeout, cache scurt, verificări, salvare în Storage
  .secret.local       cheile pentru emulator (nu se urcă în git)
css/styles.css        tokeni de design, componente, ecrane, responsive
firestore.rules       reguli de securitate pentru baza de date
storage.rules         reguli de securitate pentru poze
```

Principii urmate:
- **Single responsibility**: fiecare clasă face un singur lucru (ex. `ImageCompressor` doar micșorează poze).
- **Open/closed**: ecranele noi se adaugă cu `router.add()`, fără să modifici routerul.
- **Dependency inversion**: serviciile primesc repository-urile prin constructor; doar `app.js` știe de Firebase.
- **Fără chei în frontend**: căutările de poze trec prin Cloud Functions; aplicația web nu vede cheile API.
- **Observer**: `EventBus` + `CoupleDataHub` țin un singur abonament real-time pentru idei și mesaje.
- Textul utilizatorilor e inserat mereu ca text, nu ca HTML (protecție XSS).

## Modelul de date

```
users/{uid}                    username, displayName, photoURL, coupleId
usernames/{username}           { uid }  garantează unicitatea
partnerRequests/{id}           from/to, status: pending | accepted | declined
couples/{uid1_uid2}            members, anniversary
ideas/{id}                     titlu, descriere, categorie, imagine, autor, likes, status, doneDate
                               imagine: imageUrl, imagePath, imageSource (upload | pixabay | places),
                               imagePlaceId (doar places), imageCredit { name, url } | null
ideas/{id}/entries/{id}        amintirea unei persoane: notă + poze
messages/{coupleId}/msgs/{id}  mesajele din chat
```
