import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBebJyv-3_Bo1YVrtdxB6WRYsympPgj5c",
    authDomain: "in-lock.firebaseapp.com",
    databaseURL: "https://in-lock-default-rtdb.firebaseio.com",
    projectId: "in-lock",
    storageBucket: "in-lock.firebasestorage.app",
    messagingSenderId: "579628367938",
    appId: "1:579628367938:web:8979dc54f4a82fb9af6ddb",
    measurementId: "G-PNG50LCH6Z"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que vamos usar nas outras telas
export const auth = getAuth(app);
export const db = getDatabase(app);