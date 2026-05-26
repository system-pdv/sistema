import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const btnLogout = document.getElementById("btn-logout");

// 1. Lógica de Login
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        
        try {
            // Faz o login no Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Busca o cargo (regra) do usuário no Realtime Database usando o UID dele
            const userRef = ref(db, 'usuarios/' + user.uid);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const dadosUsuario = snapshot.val();
                
                // Se for admin vai para uma tela, se for morador vai para outra
                if (dadosUsuario.regra === "admin") {
                    window.location.href = "admin.html";
                } else {
                    window.location.href = "morador.html";
                }
            } else {
                showError("Usuário autenticado, mas não cadastrado no banco de dados.");
            }
            
        } catch (error) {
            console.error(error);
            showError("E-mail ou senha incorretos.");
        }
    });
}

// 2. Lógica de Logout (Botão Sair)
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}

// 3. Proteção das Telas (Impede entrar direto digitando a URL)
onAuthStateChanged(auth, (user) => {
    const paginaAtual = window.location.pathname;
    if (!user && (paginaAtual.includes("admin.html") || paginaAtual.includes("morador.html"))) {
        window.location.href = "index.html";
    }
});

// 4. Lógica de Recuperação de Senha (Esqueci a Senha)
const btnEsqueciSenha = document.getElementById("btn-esqueci-senha");
if (btnEsqueciSenha) {
    btnEsqueciSenha.addEventListener("click", async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById("email"); 
        
        // Em vez de dar alert(), usamos a sua própria caixa de erro estilizada!
        if (!emailInput || !emailInput.value.trim()) {
            showError("Por favor, digite seu e-mail no campo de login primeiro.");
            if (emailInput) emailInput.focus();
            return;
        }

        const email = emailInput.value.toLowerCase().trim();

        try {
            // Se houver alguma mensagem de erro antiga na tela, esconde ela antes de tentar enviar
            if (errorMessage) errorMessage.classList.add("hide");

            await sendPasswordResetEmail(auth, email);
            
            // Aqui mantive um aviso amigável, pois é uma mensagem de Sucesso!
            alert(`Sucesso! Link de redefinição enviado para:\n${email}`);
        } catch (error) {
            console.error("Erro ao redefinir:", error);
            if (error.code === "auth/user-not-found") {
                showError("Este e-mail não está cadastrado no sistema.");
            } else {
                showError("Erro ao enviar e-mail de recuperação. Verifique o endereço.");
            }
        }
    });
}

function showError(msg) {
    if (errorMessage) {
        errorMessage.innerText = msg;
        errorMessage.classList.remove("hide");
    }
}