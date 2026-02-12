// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBL-eefBi23wFPcwMzfLjTuOtljHJmhjhU",
    authDomain: "stockearly-app.firebaseapp.com",
    projectId: "stockearly-app",
    storageBucket: "stockearly-app.firebasestorage.app",
    messagingSenderId: "586677957810",
    appId: "1:586677957810:web:c331befe10c240c43a05ab",
    measurementId: "G-EZF7BM0GX3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);