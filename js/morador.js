import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

const btnUnlock = document.getElementById("btn-unlock");
const lockStatus = document.getElementById("lock-status");
const feedbackMsg = document.getElementById("feedback-msg");
const txtBoasVindas = document.getElementById("txt-boas-vindas");
const txtInfoAp = document.getElementById("txt-info-ap");
const btnLogoutMorador = document.getElementById("btn-logout"); // Mapeia o botão Sair

let dadosDoMoradorLogado = null;

// -----------------------------------------------------------------
// INJEÇÃO AUTOMÁTICA DO MODAL DE ALTERAR SENHA
// -----------------------------------------------------------------
const estruturaModalSenha = `
<button id="btn-abrir-modal-senha" style="background: transparent; border: 1px solid #e2e8f0; color: #64748b; padding: 6px 12px; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 600; position: absolute; top: 70px; right: 16px; z-index: 999;">🔑 Mudar Senha</button>

<div id="custom-modal-senha" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:10000; justify-content:center; align-items:center;">
    <div style="background:#fff; width:90%; max-width:340px; padding:25px; border-radius:20px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); text-align: left;">
        <h3 style="margin-bottom:10px; color:#0f172a; font-size:18px;">🔒 Criar Nova Senha</h3>
        <p style="color:#64748b; font-size:13px; margin-bottom:15px;">Substitua a senha padrão por uma senha pessoal de sua preferência.</p>
        
        <div style="margin-bottom:20px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:6px; color:#0f172a;">Nova Senha (mínimo 6 dígitos)</label>
            <input type="password" id="nova-senha-input" placeholder="Digite a nova senha" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:12px; font-size:15px; box-sizing: border-box;">
        </div>
        
        <div style="display:flex; gap:10px;">
            <button id="btn-cancelar-senha" style="flex:1; padding:12px; background:#f1f5f9; color:#64748b; border:none; border-radius:10px; cursor:pointer; font-weight:600;">Cancelar</button>
            <button id="btn-salvar-senha" style="flex:1; padding:12px; background:linear-gradient(135deg, #4f46e5, #06b6d4); color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:600;">Atualizar</button>
        </div>
    </div>
</div>
`;

// Insere o botão e a janela oculta direto no corpo do seu HTML automaticamente
document.body.insertAdjacentHTML('beforeend', estruturaModalSenha);

const modalSenha = document.getElementById("custom-modal-senha");

// Evento para abrir o modal
document.getElementById("btn-abrir-modal-senha").addEventListener("click", () => {
    document.getElementById("nova-senha-input").value = "";
    modalSenha.style.display = "flex";
});

// Evento para fechar/cancelar o modal
document.getElementById("btn-cancelar-senha").addEventListener("click", () => {
    modalSenha.style.display = "none";
});

// Evento para salvar a nova senha no Firebase Auth
document.getElementById("btn-salvar-senha").addEventListener("click", async () => {
    const novaSenha = document.getElementById("nova-senha-input").value.trim();
    const usuarioAtual = auth.currentUser;

    if (!novaSenha || novaSenha.length < 6) {
        alert("A nova senha precisa ter no mínimo 6 caracteres.");
        return;
    }

    if (usuarioAtual) {
        try {
            await updatePassword(usuarioAtual, novaSenha);
            alert("Senha alterada com sucesso! Use sua nova senha nos próximos acessos.");
            modalSenha.style.display = "none";
        } catch (error) {
            console.error("Erro ao mudar senha:", error);
            if (error.code === "auth/requires-recent-login") {
                alert("Por segurança, saia do aplicativo, faça login novamente e tente mudar a senha em seguida.");
            } else {
                alert("Erro ao atualizar a senha. Tente novamente.");
            }
        }
    }
});

// 1. Carrega os dados do morador assim que ele entra na tela
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = ref(db, 'usuarios/' + user.uid);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                dadosDoMoradorLogado = snapshot.val();
                
                // Atualiza os textos da tela com o nome e apartamento reais do banco
                if (txtBoasVindas) txtBoasVindas.innerText = `Olá, ${dadosDoMoradorLogado.nome}`;
                if (txtInfoAp) txtInfoAp.innerText = `Apartamento ${dadosDoMoradorLogado.apartamento}`;
            }
        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
        }
    }
});

// 2. Clique no botão de destravar
if (btnUnlock) {
    btnUnlock.addEventListener("click", async () => {
        if (!dadosDoMoradorLogado) return;

        try {
            // Desabilita o botão temporariamente para evitar cliques duplos
            btnUnlock.disabled = true;
            lockStatus.innerText = "Enviando comando de abertura...";
            lockStatus.classList.add("active");

            // Envia o comando para a raiz do banco de dados no nó 'comando_trava'
            // O seu ESP32 vai ler exatamente essas informações para acionar o relé!
            await set(ref(db, 'comando_trava'), {
                status: "solicitar_abertura",
                apartamento: dadosDoMoradorLogado.apartamento,
                timestamp: Date.now() // Guarda o horário exato do clique
            });

            showFeedback("🔓 Sinal enviado! Caixa destravada por 10 segundos.", "success");
            btnUnlock.innerText = "✅";

            // Espera 10 segundos (tempo do entregador abrir a caixa) e volta ao normal
            setTimeout(async () => {
                btnUnlock.disabled = false;
                btnUnlock.innerText = "🔓";
                lockStatus.innerText = "Toque para destravar a caixa";
                lockStatus.classList.remove("active");
                hideFeedback();
            }, 10000); // Alterado de 5000 para 10000ms (10 segundos)

        } catch (error) {
            console.error("Erro ao enviar comando:", error);
            showFeedback("Erro ao conectar com a trava. Tente novamente.", "error");
            btnUnlock.disabled = false;
            btnUnlock.innerText = "🔓";
        }
    });
}

// -----------------------------------------------------------------
// 3. LOGOUT DA TELA DO MORADOR (BOTÃO SAIR)
// -----------------------------------------------------------------
if (btnLogoutMorador) {
    btnLogoutMorador.addEventListener("click", () => {
        signOut(auth)
            .then(() => {
                // Remove a sessão local e redireciona de volta para a tela de login
                window.location.href = "index.html";
            })
            .catch((error) => {
                console.error("Erro ao deslogar o morador:", error);
                alert("Erro ao tentar sair. Tente novamente.");
            });
    });
}

function showFeedback(msg, tipo) {
    if (feedbackMsg) {
        feedbackMsg.innerText = msg;
        feedbackMsg.className = `status-msg ${tipo}`;
        feedbackMsg.classList.remove("hide");
    }
}

function hideFeedback() {
    if (feedbackMsg) feedbackMsg.classList.add("hide");
}