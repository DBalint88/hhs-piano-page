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
const subsRef = collection(db, 'submissions')


// * / * / * / * / Don't touch anything above this line!! / * / * / * / * //


/* TO-DO:

      1. Re-factor Weekly Quota to query the submissions collection to determine it's value(s)
      2. Set auth rules, restrict domain to hamden.org
      3. Upload a lot more songs
      4. Switch from PDF to SVG
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
const startDate = new Date('July 30, 2023')
const todaysDate = new Date()
const currentWeek = Math.ceil((todaysDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24 * 7))
document.getElementById("weekid").innerText = currentWeek



// FETCH USER DATA FROM SERVER -> LOCAL

let username
let userID = ''
let userLastName = ''
let pendingSongs = []
let completedSongs = []
let failedSongs = []
let userLevel;
let handicap = 1
let currentWeekAttempted;
let currentWeekEarned;
let currentSongAttempts;
let songs = []

function getUserData(docSnap) {
  userLevel = docSnap.get("level")
  pendingSongs = docSnap.get("pendingSongs")
  completedSongs = docSnap.get("completedSongs")
  failedSongs = docSnap.get("failedSongs")
  currentWeekAttempted = docSnap.get("currentWeekAttempted")
  currentWeekEarned = docSnap.get("currentWeekEarned")
  handicap = docSnap.get("handicap")
}

/*
What I want is ...

Fetch the songs for the user's level. So if uLevel is 2, fetch sLevels 1 and 2.
Check - has the uLevel 2 user submitted all the songs from Level 2?
        If so, clear the data and re-run the fetch function at level 3 (without actually uLevel++).  
        Then printSongs().
        If not, just printSongs.
        It seems like maybe the if condition from updateSongListLive() needs to be brought up to the main
        getSongs function.

*/

// FETCH SONGS APPROPRIATE TO THE USER'S LEVEL
async function getSongs(x = userLevel) {
  console.log("getSongs says: x = ", x)
  for (let i=1; i <= x; i++) {
    window.window['level' + i] = []
    let q = query(songsRef, where("level", "==", i), orderBy("sequence"))
    await getDocs(q)
    .then((snapshot) => {
      snapshot.docs.forEach((doc) => {
        window['level' + i].push({ ...doc.data(), id: doc.id })
      })
      songs.push(window['level' + i])
      console.log("getSongs says: ", window['level' + i])
    })
  }
  updateUserLevel()
  if (x == userLevel) {
    updateSongListLive()
    printSongs
  }
  printSongs()
}



// GENERATE THE SONG CONTENT TO THE PAGE
function printSongs () {
  console.log("printSongs has fired")
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

    let levelValueHeader = document.createElement('h4')
    levelValueHeader.textContent = '(' + determineSongValue(i) + ' points each)'

    let levelOl = document.createElement("ol")

    navListWrapper.appendChild(songsContainer)
    songsContainer.appendChild(levelHeader)
    songsContainer.appendChild(levelValueHeader)
    songsContainer.appendChild(levelOl)


    // Print the song buttons
    for(let j=0; j<window['level' + i].length; j++) {
      let song = document.createElement("li");
      song.classList.add("song-button")
      let songSrc = songs[i-1][j]
      song.setAttribute("data-level", i)
      song.setAttribute("data-seq", (j+1))
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
let currentSongLevel = 0
let currentSongValue = 0
let currentSongSeq = 0

function hideSongList() {
  for (let k = 0; k < songList.length; k++) {
    songList[k].classList.remove("active-song-list") 
  }
  levelList.classList.remove("inactive-level-list");
  backButton.classList.remove("back-button-active");
  // let height = getComputedStyle(levelList).getPropertyValue("height")
  //     console.log('height: ', height)
  // navListWrapper.style.height = height
  navListWrapper.style.overflow = 'hidden'
}

function callSongList(e) {
  levelList.classList.add("inactive-level-list");
  for (let j = 0; j < songList.length; j++) {
    if (songList[j].id == ("level-" + (this.id))) {
      songList[j].classList.add("active-song-list");
    }
  }
  backButton.classList.add("back-button-active")  
  navListWrapper.style.overflowY = 'auto'  
}


async function loadSong(e) {
  splash.style.display = "none";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = this.dataset.pdf + "#zoom=118";
  videoLink.href = this.dataset.video;
  pdfLink.href = this.dataset.pdf +"#zoom=83";
  currentSongFbref = this.dataset.fbref
  currentSongTitle = this.textContent
  currentSongLevel = parseInt(this.dataset.level)
  currentSongSeq = parseInt(this.dataset.seq)
  currentSongValue = determineSongValue(currentSongLevel)
  currentSongAttempts = await countCurrentSongAttempts()
  console.log('loadSong says: currentSongAttempts = ', currentSongAttempts)
  updateButtons(); 
}

// Submissions need to be named userId + songID + attempts

async function countCurrentSongAttempts(count = 0) {
  console.log('count = ', count )
  let subsRef = doc(db, "submissions", (`${userID + currentSongFbref}(${count + 1})`))
  let subsSnap = await getDoc(subsRef);
  
  if (subsSnap.exists()) {
    console.log('countCurrentSongAttempts says: if condition met')
    return await countCurrentSongAttempts((count+1))
  } else {
    console.log('returning count: ', count)
    return count
  }
}



//  DETERMINE POINT VALUE OF CURRENT SONG TOWARDS WEEKLY QUOTA
function determineSongValue(x) {
  switch (x) {
    case 1:
      return 15 * handicap
    case 2:
      return 20 * handicap
    case 3:
      return 30 * handicap
    default:
      return 60
  }
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
  currentSongLevel = 0
  currentSongValue = 0
  currentSongAttempts = 0
  updateButtons();
}




// CONTROL APPEARANCE OF YT, PDF, HOME, & SUBMIT BUTTONS
function updateButtons() {
  if (currentSongFbref == '') {
    videoIcon.style.opacity = ".2"
    videoLink.style.pointerEvents="none"
    pdfIcon.style.opacity = ".2"
    pdfLink.style.pointerEvents="none"
    submitButton.style.opacity = ".2"
    submitButton.style.pointerEvents="none"
  } else {
    videoIcon.style.opacity = "1"
    videoLink.style.cursor = "pointer"
    videoLink.style.pointerEvents = "auto"
    pdfIcon.style.opacity = "1"
    pdfLink.style.cursor = "pointer"
    pdfLink.style.pointerEvents = "auto"
    submitButton.style.pointerEvents="auto"
    if (completedSongs.includes(currentSongFbref)) {
      submitButton.src = "images/upload-icon.png"
      submitButton.style.opacity = ".2"
      submitButton.style.cursor = "default"
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



// UPDATE THE QUOTA DISPLAY
async function updateQuotaDisplay() {

  document.getElementById("points-attempted").innerText = currentWeekAttempted;
  document.getElementById("points-earned").innerText = currentWeekEarned;
}



// HANDLE SONG SUBMISSION
function submitSong(e) {
  if (pendingSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to unsubmit " + currentSongTitle + "?")) {
      currentWeekAttempted -= currentSongValue;
      const docRef = doc(db, 'userProfiles', userID)
      pendingSongs.splice(pendingSongs.indexOf(currentSongFbref), 1)
      updateDoc(docRef, {
      pendingSongs: pendingSongs,
      currentWeekAttempted: currentWeekAttempted
      })
      retractSubmission()
    }

  } else if (failedSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to resubmit " + currentSongTitle + "?")) {
      currentWeekAttempted += currentSongValue;
      const docRef = doc(db, 'userProfiles', userID)
      pendingSongs.push(currentSongFbref)
      updateDoc(docRef, {
      pendingSongs: pendingSongs,
      currentWeekAttempted: currentWeekAttempted
      })
      createSubmission()
      if (currentSongLevel == userLevel) {
        updateSongListLive()
      }
    }

  } else if (!completedSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to submit " + currentSongTitle + "?")) {
      console.log("submitSong has fired")
      console.log("submitSong says: userID is ", userID)
      currentWeekAttempted += currentSongValue;
      pendingSongs.push(currentSongFbref)
      const docRef = doc(db, 'userProfiles', userID)
      updateDoc(docRef, {
      pendingSongs: pendingSongs,
      currentWeekAttempted: currentWeekAttempted
      })
      createSubmission()
      if (currentSongLevel == userLevel) {
        updateSongListLive()
      }
    }
  }
}

async function createSubmission() {
  await setDoc(doc(db, "submissions", userID+currentSongFbref+'('+(currentSongAttempts+1)+')'), {
      resolved: false,
      result: '',
      timeStamp: serverTimestamp(),
      week: currentWeek,
      userID: userID,
      lastName: userLastName,
      firstName: username,
      songfbRef: currentSongFbref,
      songLevel: currentSongLevel,
      songSeq: currentSongSeq,
      songTitle: currentSongTitle,
      pointValue: currentSongValue
    })
    currentSongAttempts = await countCurrentSongAttempts()
    console.log('createSubmission says: currentSongAttempts = ', currentSongAttempts)
    console.log('submission sent successfully.')
}

async function retractSubmission() {
  await deleteDoc(doc(db, "submissions", userID+currentSongFbref+'(' + currentSongAttempts + ')'))
  currentSongAttempts = await countCurrentSongAttempts()
  console.log('retractSubmission says: currentSongAttempts = ', currentSongAttempts)
  console.log('submission deleted successfully.')
}

// UPDATE USER'S LEVEL
// If a user's completedSongs array includes ALL of the songs with level == the user's level
//      then their level should increment.
// Related, but possibly a separate funtion:
// If a user's completedSongs array U pendingSongs array includes ALL of the songs with level == user's level
// They should be given access to the next level of songs.

async function updateUserLevel() {

  let allCurrentLevelSongs = []
  songs[userLevel-1].forEach((element) => allCurrentLevelSongs.push(element.id))

  let checker = (arr, target) => target.every(v => arr.includes(v));

  if (checker(completedSongs, allCurrentLevelSongs)) {
    userLevel++
    const docRef = doc(db, 'userProfiles', userID)
    let docSnap = await getDoc(docRef);
    updateDoc(docRef, {
      level: userLevel
    })
    clearData()
    getUserData(docSnap)
    getSongs()
  }
}

async function updateSongListLive() {
  console.log("updateSongListLive has fired")
  let allCurrentLevelSongs = []
  songs[userLevel-1].forEach((element) => allCurrentLevelSongs.push(element.id))
  console.log("updateSongListLive says: allCurrentLevelSongs: ", allCurrentLevelSongs)
  let allCurrentLevelSubmissions = completedSongs.concat(pendingSongs)

  let checker = (arr, target) => target.every(v => arr.includes(v));

  if (checker(allCurrentLevelSubmissions, allCurrentLevelSongs)) {
    let temp = userLevel + 1
    const docRef = doc(db, 'userProfiles', userID)
    let docSnap = await getDoc(docRef);
    clearData()
    getUserData(docSnap)
    getSongs(temp)
  } 
}


// CLEAR DATA ON LOG OUT, OR TO RESET PAGE ON LEVEL CHANGES
function clearData() {
  backButton.classList.remove("back-button-active")
  while (navListWrapper.firstChild) {
    navListWrapper.removeChild(navListWrapper.firstChild)
  }
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
          failedSongs: [],
          handicap: 1,
          currentWeekAttempted: 0,
          currentWeekEarned: 0
        })
        docSnap = await getDoc(docRef);
      }

      onSnapshot(docRef, (doc) => {
        getUserData(doc)
        updateStatusLights()
        updateButtons()
        updateQuotaDisplay()
      })
      
      username = (user.displayName).split(" ")[0];  
      let nick = await docSnap.get("nick")
      if (!nick == "") {
        username = nick
      }
      userLastName = (user.displayName).split(" ")[1]

        
      const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const d = new Date();
       let day = weekday[d.getDay()];
      splashGreeting.innerText = (`Happy ${day}, ${username}! Please click a Level on the left to get started.`)
      

      loadingGif.style.display = 'none'
      logoutButton.style.display = 'block'

      getUserData(docSnap)
      await getSongs()

    }
    catch(error) {
      console.log(error)
    }
    
  } else {
    console.log('no user logged in')
    loginButton.style.display = 'flex'
    logoutButton.style.display = 'none'
    clearData()
    userID = ''
  }
});