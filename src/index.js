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
let userID = ''


// set collections references
const usersRef = collection(db, 'userProfiles')
const songsRef = collection(db, 'songs')


// Log in.
const loginButton = document.getElementById("googleSignIn")
const logoutButton = document.getElementById("signoutButton")

loginButton.addEventListener('click', () => {
  signInWithPopup(auth, provider)
  loginButton.classList.remove('show')
  logoutButton.classList.add('show')
  console.log('logged in:', auth)
  })


logoutButton.addEventListener('click', () => {
  signOut(auth)
  .then(() => {
    console.log('logged out')
    loginButton.classList.add('show')
    logoutButton.classList.remove('show')
  })
})

const testButton = document.getElementById("testButton")
testButton.addEventListener('click', () => {
  console.log(userID)
})

let userLevel;

// Build the song array
const songs = []

const navListWrapper = document.getElementById("nav-list-wrapper")
const levelUl = document.getElementById("level-ul")

// async / await version so array has values to be iterated

async function getSongs() {

  for (let i=1; i <= userLevel; i++) {
    window['level' + i] = []
    let q = query(songsRef, where("level", "==", i), orderBy("sequence"))
    await getDocs(q)
    .then((snapshot) => {
      snapshot.docs.forEach((doc) => {
        window['level' + i].push({ ...doc.data() })
      })
      songs.push(window['level' + i])
    })
  }

  console.log(songs)
  printSongs();
}


// print the level / song list to the DOM

function printSongs () {
  for (let i=1; i <= songs.length; i++) {

    // Print the level list
    let levelButton = document.createElement('li')
    levelButton.classList.add("level-button")
    levelButton.setAttribute("id", i)
    levelButton.textContent = 'Level ' + i
    levelUl.appendChild(levelButton)

    let songsContainer = document.createElement("div")
    songsContainer.classList.add('song-list')
    songsContainer.setAttribute("id", 'level-'+i)

    let levelHeader = document.createElement("h2")
    levelHeader.textContent = 'Level ' + i

    let levelOl = document.createElement("ol")

    navListWrapper.appendChild(songsContainer)
    songsContainer.appendChild(levelHeader)
    songsContainer.appendChild(levelOl)


    // Print the songs themselves
    for(let j=0; j<window['level' + i].length; j++) {
      let song = document.createElement("li");
      song.classList.add("song-button")
      let songSrc = songs[i-1][j]
      song.setAttribute("data-pdf", songSrc.image)
      song.setAttribute("data-video", songSrc.youtube)
      song.textContent = songSrc.title

      levelOl.appendChild(song)

    }
  }
}


// Logic on Sign in & Sign out
onAuthStateChanged(auth, async (user) => {
  // Logic for when the user logs in. If succesful and profile exists, get userLevel & song arrays 
  if (user) {
    // Refer to the userProfile with the same ID as the user.
    userID = user.uid
    const docRef = doc(db, "userProfiles", userID)
    try {
      const docSnap = await getDoc(docRef);
      if(docSnap.exists()) {
        console.log(docSnap.data());
        userLevel = docSnap.get("Level")
        getSongs();
        printSongs();
        // TO-DO:  Logic for generating page based on user's level
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
    // User is signed out
    // ...
  }
});


//  OLD PAGE LOGIC BELOW V V V V V

// Variables

let levelList = document.getElementById("level-list");
let levelButton = document.getElementsByClassName("level-button");
let songList = document.getElementsByClassName("song-list");
let songButton = document.getElementsByClassName("song-button")
let backButton = document.getElementById("back-button");
let iframe = document.getElementById("iframe");
let splash = document.getElementById("splash");
let videoLink = document.getElementById("video-link");
let pdfLink = document.getElementById("pdf-link");



// Click Events

backButton.addEventListener("click", hideSongList);

for (let i = 0; i < levelButton.length; i++) {
  levelButton[i].addEventListener("click", callSongList);
}

for (let l = 0; l < songButton.length; l++) {
  songButton[l].addEventListener("click", loadSong);
}



// Functions

function callSongList(e) {
  levelList.classList.add("inactive-level-list");
  for (let j = 0; j < songList.length; j++) {
    if (songList[j].id == ("level-" + (this.id))) {
      songList[j].classList.add("active-song-list");
    }
  }
  backButton.classList.add("back-button-active")    
}


function hideSongList() {
  for (let k = 0; k < songList.length; k++) {
    songList[k].classList.remove("active-song-list") 
  }
  levelList.classList.remove("inactive-level-list");
  backButton.classList.remove("back-button-active");
}


function loadSong(e) {
  splash.style.display = "none";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = this.dataset.pdf + "#zoom=118";
  videoLink.href = this.dataset.video;
  pdfLink.href = this.dataset.pdf +"#zoom=83";
}