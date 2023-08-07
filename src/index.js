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

// DEFINE COLLECTION REFERENCE
const songsRef = collection(db, 'songs')


// * / * / * / * / Don't touch anything above this line!! / * / * / * / * //


/* TO-DO:
      2. Implement logic so if a user has completed a level, their userLevel++
      3. Set up weekly quota counter (/60)
      4. Set up back end teacher view to review submissions
      5. Set auth rules, restrict domain to hamden.org
*/

// NAV ELEMENT ANCHORS

let songList = document.getElementsByClassName("song-list");
let iframe = document.getElementById("iframe");
let splash = document.getElementById("splash");
let videoLink = document.getElementById("video-link");
let videoIcon = document.getElementById("yt-icon")
let pdfLink = document.getElementById("pdf-link");
let pdfIcon = document.getElementById("pdf-icon")
let homeButton = document.getElementById("home-button");
let backButton = document.getElementById("back-button");
let submitButton = document.getElementById("submit-button")
const navListWrapper = document.getElementById("nav-list-wrapper")
let levelList
let levelUl

// Temporary forms to test song completion

const completionForm = document.getElementById("completion-form")
const pendingForm = document.getElementById("pending-form")
const failureForm = document.getElementById("failure-form")

failureForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const docRef = doc(db, 'userProfiles', userID)
  failedSongs.push(failureForm.failed.value)
  await updateDoc(docRef, {
    failedSongs: failedSongs
  })
  failureForm.reset()

})
pendingForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const docRef = doc(db, 'userProfiles', userID)
  pendingSongs.push(pendingForm.pending.value)
  await updateDoc(docRef, {
    pendingSongs: pendingSongs
  })
  pendingForm.reset()
})
completionForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const docRef = doc(db, 'userProfiles', userID)
  completedSongs.push(completionForm.completed.value)
  await updateDoc(docRef, {
    completedSongs: completedSongs
  })
  completionFrom.reset()
})


// FETCH USER DATA FROM SERVER -> LOCAL

let username
let userID = ''
let pendingSongs = []
let completedSongs = []
let failedSongs = []
let userLevel;
let songs = []

function getUserData(docSnap) {
  userLevel = docSnap.get("level")
  pendingSongs = docSnap.get("pendingSongs")
  completedSongs = docSnap.get("completedSongs")
  failedSongs = docSnap.get("failedSongs")
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

      // Print the status icons
      
      let statusIcon = document.createElement('img')
      statusIcon.setAttribute('src', 'images/default-status-icon.png')
      statusIcon.setAttribute('id', songSrc.id)
      statusIcon.classList.add('status-icon')

      levelOl.appendChild(song)
      song.appendChild(statusIcon)
      updateStatusLights()
      song.addEventListener('click', loadSong)

    }
  }
}



// UPDATE THE STATUS LIGHTS
function updateStatusLights() {
  let statusIcons = Array.from(document.getElementsByClassName('status-icon'))
  statusIcons.forEach((el) => {
    el.style.setProperty('background-color', 'black')
    if (completedSongs.includes(el.id)) {
      el.style.setProperty('background-color', 'lime')
    }
    if (failedSongs.includes(el.id)) {
      el.style.setProperty('background-color', 'red')
    }
    if (pendingSongs.includes(el.id)) {
      el.style.setProperty('background-color', 'yellow')
    }
  })
}



// CLICK EVENTS TO SHOW / HIDE LEVELS AND SONGS, AND SUBMIT A SONG FOR REVIEW
backButton.addEventListener("click", hideSongList);
homeButton.addEventListener("click", goHome);
submitButton.addEventListener("click", submitSong);
let currentSongFbref = ''
let currentSongTitle = ''

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
  currentSongFbref = this.dataset.fbref
  currentSongTitle = this.textContent
  updateButtons();
  
}
function goHome() {
  console.log('homebutton')
  iframe.style.width = '0';
  iframe.style.height = '0';
  videoLink.href = ''
  pdfLink.href = ''
  splash.style.display = "block";
  currentSongFbref = ''
  currentSongTitle = ''
  updateButtons();
}



// CONTROL APPEARANCE OF YT, PDF, HOME, & SUBMIT BUTTONS
function updateButtons() {
  if (currentSongFbref == '') {
    videoIcon.style.opacity = ".2"
    videoLink.style.cursor = "not-allowed"
    pdfIcon.style.opacity = ".2"
    pdfLink.style.cursor = "not-allowed"
    submitButton.style.opacity = ".2"
    submitButton.style.cursor = "not-allowed"
  } else {
    videoIcon.style.opacity = "1"
    videoLink.style.cursor = "pointer"
    pdfIcon.style.opacity = "1"
    pdfLink.style.cursor = "pointer"
    if (completedSongs.includes(currentSongFbref)) {
      submitButton.src = "images/upload-icon.png"
      submitButton.style.opacity = ".2"
      submitButton.style.cursor = "not-allowed"
    } else if (pendingSongs.includes(currentSongFbref)) {
      submitButton.src = "images/undo-icon.png"
      submitButton.style.opacity = "1"
      submitButton.style.cursor = "pointer"
    } else {
      submitButton.src = "images/upload-icon.png"
      submitButton.style.opacity = "1"
      submitButton.style.cursor = "pointer"
    }
  }

  
}



// HANDLE SONG SUBMISSION
function submitSong(e) {
  if (pendingSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to unsubmit " + currentSongTitle + "?")) {
      const docRef = doc(db, 'userProfiles', userID)
      pendingSongs.splice(pendingSongs.indexOf(currentSongFbref), 1)
      updateDoc(docRef, {
      pendingSongs: pendingSongs
      })
    }

  } else if (failedSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to resubmit " + currentSongTitle + "?")) {
      const docRef = doc(db, 'userProfiles', userID)
      pendingSongs.push(currentSongFbref)
      updateDoc(docRef, {
      pendingSongs: pendingSongs
      })
    }

  } else if (!completedSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to submit " + currentSongTitle + "?")) {
      const docRef = doc(db, 'userProfiles', userID)
      pendingSongs.push(currentSongFbref)
      updateDoc(docRef, {
      pendingSongs: pendingSongs
      })
    }
  }
  
}




// CLEAR DATA ON LOG OUT
function clearData() {
  backButton.classList.remove("back-button-active")
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



// LOGGIN IN & LOGGIN OUT
const loginButton = document.getElementById("googleSignIn")
const logoutButton = document.getElementById("signoutButton")
const loadingGif = document.getElementById("loading-gif")
let splashGreeting = document.getElementById("splash-greeting")

loginButton.addEventListener('click', () => {
  signInWithPopup(auth, provider)
  loginButton.style.display = 'none'
  loadingGif.style.display = 'block'
  })
logoutButton.addEventListener('click', () => {
  splashGreeting.innerText = "Please log in with your Hamden.org account."
  signOut(auth)
})
onAuthStateChanged(auth, async (user) => {
  // Logic for when the user logs in. If succesful and profile exists, get userLevel & song arrays 
  if (user) {
    loginButton.style.display = 'none'

    // Refer to the userProfile with the same ID as the user.
    userID = user.uid
    

    try {
      // Subscribe to snapshots of userProfile doc
      const docRef = doc(db, "userProfiles", userID)
      let docSnap = await getDoc(docRef);
      if(!docSnap.exists()) {
        await setDoc(doc(db, "userProfiles", userID), {
          level: 1,
          role: "student",
          nick: "",
          completedSongs: [],
          pendingSongs: [],
          failedSongs: []
        })
        docSnap = await getDoc(docRef);
      }

      onSnapshot(docRef, (doc) => {
        getUserData(doc)
        updateStatusLights()
        updateButtons()
      })
      
      username = (user.displayName).split(" ")[0];  
      let nick = await docSnap.get("nick")
      if (!nick == "") {
        username = nick
      }

        
      const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const d = new Date();
       let day = weekday[d.getDay()];
      splashGreeting.innerText = (`Happy ${day}, ${username}! Please click a Level on the left to get started.`)
      

      loadingGif.style.display = 'none'
      logoutButton.style.display = 'block'

      getUserData(docSnap)
      await getSongs()
      printSongs()

    }
    catch(error) {
      console.log(error)
    }
    
  } else {
    console.log('no user logged in')
    loginButton.style.display = 'flex'
    logoutButton.style.display = 'none'
    clearData()
  }
});