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


let userLevel = 3

// Build the song array



let songs = []



for (let i=1; i <= userLevel; i++) {

  window['level' + i] = []

  let q = query(songsRef, where("level", "==", i), orderBy("sequence"))

  onSnapshot(q, (snapshot) => {
    snapshot.docs.forEach((doc) => {
      window['level' + i].push({ ...doc.data()})
    })
    songs.push(window['level' + i])
  })
}

console.log('from after the for loop: ', songs)







onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('this is from the state change: ', user.uid)
    userID = user.uid
    const docRef = doc(db, "userProfiles", userID)
    
    // Try and grab the userProfile doc from the userProfiles collection.
    try {
      const docSnap = await getDoc(docRef);

    // If the user's profile exists, print the song lists according to their level.
    if(docSnap.exists()) {
        console.log(docSnap.data());
        userLevel = docSnap.get("Level")
        console.log('userLevel: ', userLevel)
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
//