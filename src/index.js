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

      1. Add login function for Songbuilder & Grader App.  Deploy those.
      2. Upload a lot more songs
      3. Add new songs so each Level goes to 12.  Ditch Frere Jacques.
      4. Optimize code to reduce server calls
      5. Switch from PDF to SVG
      6. Mobile friendly
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
const startDate = new Date('August 27, 2023')
const todaysDate = new Date()
const currentWeek = Math.ceil((todaysDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24 * 7))
document.getElementById("weekid").innerText = currentWeek - 52



// FETCH USER DATA FROM SERVER -> LOCAL

let username
let userID = ''
let userLastName = ''
let pendingSongs = []
let completedSongs = []
let failedSongs = []
let userLevel;
let handicap = 1
let currentSongAttempts;
let songs = []
let userLvl9 // Beware! This ends up entered as a STRING!  NOT a Boolean.
let instructor = ""

function getUserData(docSnap) {
  userLevel = docSnap.get("level")
  pendingSongs = docSnap.get("pendingSongs")
  completedSongs = docSnap.get("completedSongs")
  failedSongs = docSnap.get("failedSongs")
  handicap = docSnap.get("handicap")
  userLvl9 = docSnap.get("userLvl9")
  instructor = docSnap.get("instructor")
  console.log("instructor: " + instructor)
  if (instructor != "balint" && instructor != "rossomando") {
    console.log("ah jeez idk who the instructor is.")
    confirmInstructor()
  }
  
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
let currentActiveLevel = ""




function hideSongList() {
  let currentActiveSongList = songList[currentActiveLevel-1]
  // song-list-loading needs to be added FIRST THING.  That allows the list to display.
  // Immediately, active-song-list must be removed.  That creates the transition.
  // 250ms later, song-list-loading needs to be removed to reduce the navlistwrapper size.
  currentActiveSongList.classList.add('song-list-loading')
  currentActiveSongList.classList.remove("active-song-list")
  currentActiveSongList.classList.remove("active-song-list-short-screen")
  levelList.classList.remove("inactive-level-list");
  backButton.classList.remove("back-button-active") 
  setTimeout(function(){
    currentActiveSongList.classList.remove('song-list-loading')
    
  }, 250) 



  currentActiveLevel = ""
  
}

function callSongList(e) {
  currentActiveLevel = this.id
  let currentActiveSongList = songList[currentActiveLevel-1]
  levelList.classList.add("inactive-level-list");
  currentActiveSongList.classList.add('song-list-loading')
  setTimeout(function(){
    currentActiveSongList.classList.add("active-song-list")
    currentActiveSongList.classList.remove('song-list-loading')
    backButton.classList.add("back-button-active") 
    adjustListPosition()
  }, 1) 
  

   
  
  
}


async function loadSong(e) {
  splash.style.display = "none";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = this.dataset.pdf + "#zoom=118&navpanes=0&pagemode=none";
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

function adjustListPosition() {
  let wrapperHeight = navListWrapper.clientHeight;
  
  setTimeout(function(){
    try {
      let songList = document.getElementsByClassName('active-song-list')[0]
      if (typeof songList == "undefined") {
        songList = document.getElementsByClassName('active-song-list-short-screen')[0]
      }
      console.log(songList)
      let songListHeight = songList.clientHeight;

      if (wrapperHeight >= songListHeight) {
        console.log('wrapperHeight (' + wrapperHeight + ') >= songListHeight (' + songListHeight + ')')
        songList.classList.remove('active-song-list-short-screen')
        songList.classList.add('active-song-list')
      } else {
        console.log('wrapperHeight (' + wrapperHeight + ') !>= songListHeight (' + songListHeight + ')')
        songList.classList.remove('active-song-list')
        songList.classList.add('active-song-list-short-screen')
      }
    } catch {
      console.log("can't get the height of a div that don't exist.")
    }
  }, 1)
    
  

  
}

window.addEventListener('resize', adjustListPosition)

// Submissions need to be named userId + songID + attempts

async function countCurrentSongAttempts() {
  // Query the database for all user Submissions
  let userSubmissions = []
  const countQuery = query(subsRef, where("userID", "==", userID))
  await getDocs(countQuery)
    .then((snapshot) => {
      snapshot.docs.forEach((sub) => {
        userSubmissions.push(sub.id)
      })
    })
  console.log('countCurrentSongAttempts 336 userSubmissions: ', userSubmissions)
  let i = 1
  while (true) {
    console.log('countCurrentSongAttempts while loop.  Eval: ' + userID + currentSongFbref + '(' + i + ')')
    if (userSubmissions.includes(userID + currentSongFbref + '(' + i + ')')) {
      i++
    } else {
      console.log('countCurrentSongAttempts line343 returns: ', (i-1))
      return (i-1);
    }
  }
}



//  DETERMINE POINT VALUE OF CURRENT SONG TOWARDS WEEKLY QUOTA
function determineSongValue(x) {
  if (userLvl9 == 'true') {
    switch (x) {
      case 1:
        return 10;
      case 2:
        return 12;
      case 3:
        return 15;
      case 4:
        return 20;
      case 5: 
        return 30;
      case 6:
        return 30;
      default:
        return 60;
    }
  }

  if (handicap == 2) {
    switch (x) {
      case 1:
        return 30
      default:
        return 60
    }
  }

  switch (x) {
    case 1:
      return 15
    case 2:
      return 20
    case 3:
      return 30
    default:
      return 60
  }
}
  

function goHome() {
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
  let currentWeekAttempted = 0
  let currentWeekEarned = 0
  let userCurrentWeekSubs = []
  const quotaQuery = query(subsRef, where("userID", "==", userID), where("week", "==", currentWeek))
  await getDocs(quotaQuery)
    .then((snapshot) => {
      snapshot.docs.forEach((sub) => {
        userCurrentWeekSubs.push({ ...sub.data(), id: sub.id })
      })
    })
  for (let i = 0; i < userCurrentWeekSubs.length; i++) {
    const sub = userCurrentWeekSubs[i];
    if (sub.resolved == false) {
      currentWeekAttempted += sub.pointValue
    } else if (sub.result == "pass") {
      currentWeekEarned += sub.pointValue
    }
  }
  
  
  document.getElementById("points-attempted").innerText = currentWeekAttempted;
  document.getElementById("points-earned").innerText = currentWeekEarned;
}

// All Modal stuff:
let instructorModal = document.createElement("div")
let modalContent = document.createElement("div")
let balintButton = document.createElement("button")
let rossButton = document.createElement("button")
let modalParagraph = document.createElement("p")
let pageBody = document.getElementById("body")

function confirmInstructor() {


  modalParagraph.textContent = "One-time check: Who is your instructor for this class?"

  instructorModal.classList.add("modal")
  modalContent.classList.add("modal-content")

  balintButton.textContent = "Mr. Balint"
  rossButton.textContent = "Ms. Rossomando-Heise"

  modalContent.appendChild(modalParagraph)
  modalContent.appendChild(balintButton)
  modalContent.appendChild(rossButton)
  instructorModal.appendChild(modalContent)
  pageBody.appendChild(instructorModal)
}


balintButton.addEventListener("click", () => {
  instructor = "balint"
  instructorModal.remove()
  const docRef = doc(db, 'userProfiles', userID)
  updateDoc(docRef, {
    instructor: instructor,
  })
})

rossButton.addEventListener("click", () => {
  instructor = "rossomando"
  instructorModal.remove()
  const docRef = doc(db, 'userProfiles', userID)
  updateDoc(docRef, {
    instructor: instructor,
  })
})




// HANDLE SONG SUBMISSION
async function submitSong(e) {
  if ((instructor != "balint") && (instructor != "rossomando")) {
    await confirmInstructor()
  }
  if (pendingSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to unsubmit " + currentSongTitle + "?")) {
      const docRef = doc(db, 'userProfiles', userID)
      pendingSongs.splice(pendingSongs.indexOf(currentSongFbref), 1)
      updateDoc(docRef, {
      pendingSongs: pendingSongs,
      })
      retractSubmission()
    }

  } else if (failedSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to resubmit " + currentSongTitle + "?")) {
      const docRef = doc(db, 'userProfiles', userID)
      pendingSongs.push(currentSongFbref)
      updateDoc(docRef, {
      pendingSongs: pendingSongs,
      })
      createSubmission()
      if (currentSongLevel == userLevel) {
        updateSongListLive()
      }
    }

  } else if (!completedSongs.includes(currentSongFbref)) {
    if (confirm("Are you sure you want to submit " + currentSongTitle + "?")) {
      pendingSongs.push(currentSongFbref)
      const docRef = doc(db, 'userProfiles', userID)
      updateDoc(docRef, {
      pendingSongs: pendingSongs,
      })
      createSubmission()
      if (currentSongLevel == userLevel) {
        updateSongListLive()
      }
    }
  }
}

async function createSubmission() {
  console.log('createSubmission 484: Trying to create sub doc: ', userID+currentSongFbref+'('+(currentSongAttempts+1)+')')
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
      pointValue: currentSongValue,
      instructor: instructor
    })
    currentSongAttempts = await countCurrentSongAttempts()
    console.log('createSubmission says: currentSongAttempts = ', currentSongAttempts)
    console.log('submission sent successfully: ', userID+currentSongFbref+'('+(currentSongAttempts)+')')
}

async function retractSubmission() {
  console.log('trying to delete: ', userID+currentSongFbref+'(' + currentSongAttempts + ')')
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
  let allCurrentLevelSongs = []
  songs[userLevel-1].forEach((element) => allCurrentLevelSongs.push(element.id))
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
          firstName: (user.displayName).split(" ")[0],
          lastName: (user.displayName).split(" ")[1],
          level: 1,
          role: "student",
          nick: "",
          completedSongs: [],
          pendingSongs: [],
          failedSongs: [],
          handicap: 1,
          userLvl9: "false",
          instructor: ""
        })
        docSnap = await getDoc(docRef);
      }
      
      await updateDoc(docRef, {
        firstName: (user.displayName).split(" ")[0],
        lastName: (user.displayName).split(" ")[1]
      })
      

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
      const quotaMax = document.getElementsByClassName("quota-max");
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