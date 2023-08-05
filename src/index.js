// Imports 
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, onSnapshot, 
    addDoc, deleteDoc, doc, setDoc,
    query, where,
    orderBy, serverTimestamp,
    getDoc, updateDoc, getDocs
} from 'firebase/firestore'
import { 
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged

} from 'firebase/auth'

// Firebase Config.  Don't Touch.
const firebaseConfig = {
    apiKey: "AIzaSyC61HybpprKggSz0hCpkVWXDdCv7SyXHHo",
    authDomain: "hhs-piano-page.firebaseapp.com",
    projectId: "hhs-piano-page",
    storageBucket: "hhs-piano-page.appspot.com",
    messagingSenderId: "324874631780",
    appId: "1:324874631780:web:afd0e3f3dd50ddd76a7d71"
};


//init firebase app
const app = initializeApp(firebaseConfig)


// init services
const db = getFirestore(app)
const auth = getAuth()
const user = auth.currentUser
const provider = new GoogleAuthProvider();

/*
^^^^^^^^^^^^
Don't touch anything above this line.

*/


let songList = document.getElementsByClassName("song-list");

let iframe = document.getElementById("iframe");
let splash = document.getElementById("splash");
let videoLink = document.getElementById("video-link");
let pdfLink = document.getElementById("pdf-link");
let homeButton = document.getElementById("home-button");
let backButton = document.getElementById("back-button");



// NAV ELEMENT ANCHORS

const navListWrapper = document.getElementById("nav-list-wrapper")
let levelList
let levelUl



// DEFINE COLLECTIONS REFERENCES
const usersRef = collection(db, 'userProfiles')
const songsRef = collection(db, 'songs')



// FETCH USER DATA FROM SERVER -> LOCAL

let userID = ''
let pendingSongs = []
let completedSongs = []
let failedSongs = []
let userLevel;
let songs = []

function getUserData(docSnap) {
  userLevel = docSnap.get("Level")
  pendingSongs = docSnap.get("pendingSongs")
  completedSongs = docSnap.get("completedSongs")
  failedSongs = docSnap.get("failedSongs")
  console.log(userLevel)
  console.log(pendingSongs)
  console.log(completedSongs)
  console.log(failedSongs)
}



// CLEAR DATA ON LOG OUT

function clearData() {
  while (navListWrapper.firstChild) {
    navListWrapper.removeChild(navListWrapper.firstChild)
  }
  userID = ''
  pendingSongs = []
  completedSongs = []
  failedSongs = []
  userLevel = null;
  songs = []
}



// FETCH SONGS APPROPRIATE TO THE USER'S LEVEL

async function getSongs() {
  for (let i=1; i <= userLevel; i++) {
    window['level' + i] = []
    let q = query(songsRef, where("level", "==", i), orderBy("sequence"))
    await getDocs(q)
    .then((snapshot) => {
      snapshot.docs.forEach((doc) => {
        window['level' + i].push({ ...doc.data(), id: doc.id })
      })
      songs.push(window['level' + i])
    })
  }
}



// GENERATE THE SONG CONTENT TO THE PAGE

function printSongs () {
  levelList = document.createElement('div')
  levelList.setAttribute('id', 'level-list')
  levelUl = document.createElement('ul')
  levelUl.setAttribute('id', 'level-ul')
  navListWrapper.appendChild(levelList)
  levelList.appendChild(levelUl)

  for (let i=1; i <= songs.length; i++) {

    // Print the level list
    let levelButton = document.createElement('li')
    levelButton.classList.add("level-button")
    levelButton.setAttribute("id", i)
    levelButton.textContent = 'Level ' + i
    levelUl.appendChild(levelButton)
    levelButton.addEventListener('click', callSongList)

    let songsContainer = document.createElement("div")
    songsContainer.classList.add('song-list')
    songsContainer.setAttribute("id", 'level-'+i)

    let levelHeader = document.createElement("h2")
    levelHeader.textContent = 'Level ' + i

    let levelOl = document.createElement("ol")

    navListWrapper.appendChild(songsContainer)
    songsContainer.appendChild(levelHeader)
    songsContainer.appendChild(levelOl)


    // Print the song buttons
    for(let j=0; j<window['level' + i].length; j++) {
      let song = document.createElement("li");
      song.classList.add("song-button")
      let songSrc = songs[i-1][j]
      song.setAttribute("data-pdf", songSrc.image)
      song.setAttribute("data-video", songSrc.youtube)
      song.setAttribute("data-fbref", songSrc.id)
      song.textContent = songSrc.title

      levelOl.appendChild(song)
      song.addEventListener('click', loadSong)

    }
  }
}



// CLICK EVENTS TO SHOW / HIDE LEVELS AND SONGS 


backButton.addEventListener("click", hideSongList);
homeButton.addEventListener("click", goHome);

function hideSongList() {
  for (let k = 0; k < songList.length; k++) {
    songList[k].classList.remove("active-song-list") 
  }
  levelList.classList.remove("inactive-level-list");
  backButton.classList.remove("back-button-active");
}
function callSongList(e) {
  levelList.classList.add("inactive-level-list");
  for (let j = 0; j < songList.length; j++) {
    if (songList[j].id == ("level-" + (this.id))) {
      songList[j].classList.add("active-song-list");
    }
  }
  backButton.classList.add("back-button-active")    
}
function loadSong(e) {
  splash.style.display = "none";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = this.dataset.pdf + "#zoom=118";
  videoLink.href = this.dataset.video;
  pdfLink.href = this.dataset.pdf +"#zoom=83";
}
function goHome() {
  console.log('homebutton')
  iframe.style.width = '0';
  iframe.style.height = '0';
  videoLink.href = ''
  pdfLink.href = ''
  splash.style.display = "block";
}




/* TO-DO:

      3. Need a Home button to get back to the splash page.
      4. User should have a button to submit a song for review.
      5. Song id's should be checked in each array and icons should be updated to indicate status


*/


// LOGGIN IN & LOGGIN OUT
const loginButton = document.getElementById("googleSignIn")
const logoutButton = document.getElementById("signoutButton")
const loadingGif = document.getElementById("loading-gif")


//
loginButton.addEventListener('click', () => {
  signInWithPopup(auth, provider)
  loginButton.style.display = 'none'
  loadingGif.style.display = 'block'
  })


logoutButton.addEventListener('click', () => {
  signOut(auth)
  .then(() => {
    console.log('logged out')
    loginButton.style.display = 'flex'
    logoutButton.style.display = 'none'
  })
})


onAuthStateChanged(auth, async (user) => {
  // Logic for when the user logs in. If succesful and profile exists, get userLevel & song arrays 
  if (user) {
    // Refer to the userProfile with the same ID as the user.
    loginButton.style.display = 'none'
    userID = user.uid
    const docRef = doc(db, "userProfiles", userID)
    try {
      const docSnap = await getDoc(docRef);
      if(docSnap.exists()) {
        getUserData(docSnap)
        await getSongs()
        printSongs()
        loadingGif.style.display = 'none'
        logoutButton.style.display = 'block'
    } else {
      await setDoc(doc(db, "userProfiles", userID), {
        level: 1,
        completedSongs: [],
        pendingSongs: [],
        failedSongs: []
      })

    }
    
    
  }
    catch(error) {
      console.log(error)
    }
    
  } else {
    console.log('user signed out (from onAuthStateChanged)')
    loginButton.style.display = 'flex'
    logoutButton.style.display = 'none'
    clearData()
    // User is signed out
    // ...
  }
});



















//  OLD PAGE LOGIC BELOW V V V V V

// Variables





