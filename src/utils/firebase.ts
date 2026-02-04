import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyAU_1x_T-LjIULYS4rT345kEBSIARMN1RI",
  authDomain: "whiskerwars.firebaseapp.com",
  projectId: "whiskerwars",
  storageBucket: "whiskerwars.firebasestorage.app",
  messagingSenderId: "509778623634",
  appId: "1:509778623634:web:ee4b9d132d98ecc90fba4b",
  measurementId: "G-L58R8GPG81",
  databaseURL: "https://whiskerwars-default-rtdb.europe-west1.firebasedatabase.app"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export { database, ref, set, get }
