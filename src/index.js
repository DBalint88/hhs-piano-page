// Imports 
import { initializeApp } from 'firebase/app'
import {
    getFirestore, collection, getDocs
} from 'firebase/firestore'

// Firebase Config.  Don't Touch.
const firebaseConfig = {
    apiKey: "AIzaSyC61HybpprKggSz0hCpkVWXDdCv7SyXHHo",
    authDomain: "hhs-piano-page.firebaseapp.com",
    projectId: "hhs-piano-page",
    storageBucket: "hhs-piano-page.appspot.com",
    messagingSenderId: "324874631780",
    appId: "1:324874631780:web:afd0e3f3dd50ddd76a7d71"
};
initializeApp(firebaseConfig)

const userLevel = 1

// init services
const db = getFirestore()

// collection references
const userRef = collection(db, 'userProfiles')
const songRef = collection(db, 'songs')

//get collection data
getDocs(songRef)
    .then((snapshot) => {
        let songs = []
    })