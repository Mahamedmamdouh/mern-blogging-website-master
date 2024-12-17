// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {GoogleAuthProvider,getAuth,signInWithPopup} from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy_TMNWDF5bSArRelGzkyZPS9TEFV3YQE",
  authDomain: "mern-stack-website-blogging.firebaseapp.com",
  projectId: "mern-stack-website-blogging",
  storageBucket: "mern-stack-website-blogging.appspot.com",
  messagingSenderId: "835181555946",
  appId: "1:835181555946:web:69aca21bbc6e90090a2793"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//google auth
const provider =new GoogleAuthProvider()

const auth = getAuth();

export const authWithGoogle=async ()=>{
      let user =null;

      await signInWithPopup(auth,provider)
            .then((result)=>{
                  user=result.user

            } ) .catch((err)=>{
                  console.log(err)
            })
            return user
}