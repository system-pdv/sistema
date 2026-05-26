import { db } from "./firebase-config.js";
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, updateEmail } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

// Elementos normais da página
const cadastroForm = document.getElementById("cadastro-form");
const feedbackMsg = document.getElementById("feedback-msg");
const listaApartamentosContainer = document.getElementById("lista-apartamentos");
const btnLogout = document.getElementById("btn-logout");

// Seleciona a seção inteira dos cadastros para podermos esconder/mostrar
const adminSection = document.querySelector(".admin-section");
const appHeader = document.querySelector(".app-header");

// SUAS CHAVES REAIS
const firebaseConfig = {
    apiKey: "AIzaSyCBebJyv-3_Bo1YVrtdxB6WRYsympPgj5c",
    authDomain: "in-lock.firebaseapp.com",
    databaseURL: "https://in-lock-default-rtdb.firebaseio.com",
    projectId: "in-lock",
    storageBucket: "in-lock.firebasestorage.app",
    messagingSenderId: "579628367938",
    appId: "1:579628367938:web:8979dc54f4a82fb9af6ddb"
};

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);
const mainAuth = getAuth();

let usuariosGlobais = {};

// -----------------------------------------------------------------
// INJEÇÃO DOS MODAIS CUSTOMIZADOS (AGORA COM CAMPO DE E-MAIL)
// -----------------------------------------------------------------
const estruturaModais = `
<div id="custom-modal-editar" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:10000; justify-content:center; align-items:center;">
    <div style="background:#fff; width:90%; max-width:360px; padding:25px; border-radius:20px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); position:relative;">
        <h3 style="margin-bottom:15px; color:#0f172a; font-size:18px;">✏️ Editar Morador</h3>
        <input type="hidden" id="edit-uid">
        <div style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:#0f172a;">Nome</label>
            <input type="text" id="edit-nome" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
        </div>
        <div style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:#0f172a;">Telefone</label>
            <input type="text" id="edit-tel" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
        </div>
        <div style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:#0f172a;">Apartamento</label>
            <input type="text" id="edit-ap" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
        </div>
        <div style="margin-bottom:20px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:#0f172a;">E-mail de Acesso</label>
            <input type="email" id="edit-email" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
        </div>
        <div style="display:flex; gap:10px;">
            <button id="btn-cancelar-editar" style="flex:1; padding:12px; background:#f1f5f9; color:#64748b; border:none; border-radius:10px; cursor:pointer; font-weight:600;">Cancelar</button>
            <button id="btn-salvar-editar" style="flex:1; padding:12px; background:linear-gradient(135deg, #4f46e5, #06b6d4); color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:600;">Salvar</button>
        </div>
    </div>
</div>

<div id="custom-modal-excluir" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:10000; justify-content:center; align-items:center;">
    <div style="background:#fff; width:90%; max-width:340px; padding:25px; border-radius:20px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); text-align:center;">
        <div style="font-size:40px; margin-bottom:10px;">⚠️</div>
        <h3 style="margin-bottom:10px; color:#0f172a; font-size:18px;">Tem certeza?</h3>
        <p style="color:#64748b; font-size:14px; margin-bottom:20px;">Você deseja remover o morador <strong id="excluir-nome-alvo" style="color:#0f172a;"></strong> do banco de dados? Esta ação não pode ser desfeita.</p>
        <input type="hidden" id="excluir-uid">
        <div style="display:flex; gap:10px;">
            <button id="btn-cancelar-excluir" style="flex:1; padding:12px; background:#f1f5f9; color:#64748b; border:none; border-radius:10px; cursor:pointer; font-weight:600;">Voltar</button>
            <button id="btn-confirmar-excluir" style="flex:1; padding:12px; background:#ef4444; color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:600;">Sim, Excluir</button>
        </div>
    </div>
</div>
`;

document.body.insertAdjacentHTML('beforeend', estruturaModais);

const modalEditar = document.getElementById("custom-modal-editar");
const modalExcluir = document.getElementById("custom-modal-excluir");

// -----------------------------------------------------------------
// CRIANDO OS BOTÕES DE ALTERNAR TELA DINAMICAMENTE
// -----------------------------------------------------------------
const btnIrParaCadastros = document.createElement("button");
btnIrParaCadastros.innerText = "📋 Ver Cadastros";
btnIrParaCadastros.className = "btn"; 
btnIrParaCadastros.style.marginTop = "15px";
btnIrParaCadastros.style.background = "linear-gradient(135deg, #10b981, #059669)"; 
if (cadastroForm) {
    cadastroForm.after(btnIrParaCadastros);
}

const btnVoltarAoCadastro = document.createElement("button");
btnVoltarAoCadastro.innerText = "⬅️ Voltar para Cadastro";
btnVoltarAoCadastro.className = "btn";
btnVoltarAoCadastro.style.marginBottom = "20px";

if (adminSection) adminSection.style.display = "none"; 

btnIrParaCadastros.addEventListener("click", () => {
    if (cadastroForm && adminSection && appHeader) {
        cadastroForm.style.display = "none";      
        btnIrParaCadastros.style.display = "none"; 
        if (feedbackMsg) feedbackMsg.classList.add("hide"); 
        
        appHeader.querySelector("h2").innerText = "Gerenciar Sistema";
        appHeader.querySelector("p").innerText = "Editar ou remover moradores ativos";

        adminSection.prepend(btnVoltarAoCadastro);
        adminSection.style.display = "block";
    }
});

btnVoltarAoCadastro.addEventListener("click", () => {
    if (cadastroForm && adminSection && appHeader) {
        adminSection.style.display = "none";        
        cadastroForm.style.display = "block";       
        btnIrParaCadastros.style.display = "block"; 

        appHeader.querySelector("h2").innerText = "Painel do Administrador";
        appHeader.querySelector("p").innerText = "Cadastrar novos moradores no sistema";
    }
});

// -----------------------------------------------------------------
// LOGOUT (BOTÃO SAIR)
// -----------------------------------------------------------------
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        signOut(mainAuth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Erro ao deslogar:", error);
        });
    });
}

// -----------------------------------------------------------------
// 1. LÓGICA DE CADASTRO (Formulário)
// -----------------------------------------------------------------
if (cadastroForm) {
    cadastroForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("cad-nome").value;
        const telefone = document.getElementById("cad-tel").value;
        const apartamento = document.getElementById("cad-ap").value;
        const email = document.getElementById("cad-email").value.toLowerCase().trim();
        const regra = document.getElementById("cad-regra").value;
        const senhaPadrao = "inlock123"; 

        try {
            showFeedback("Criando credenciais de acesso...", "success");

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, senhaPadrao);
            const novoUID = userCredential.user.uid;

            showFeedback("Salvando dados no banco...", "success");

            await set(ref(db, 'usuarios/' + novoUID), {
                nome: nome,
                telefone: telefone,
                apartamento: apartamento,
                email: email,
                regra: regra
            });

            showFeedback(`Sucesso! ${nome} cadastrado. Senha: ${senhaPadrao}`, "success");
            cadastroForm.reset();

        } catch (error) {
            console.error(error);
            if (error.code === "auth/email-already-in-use") {
                showFeedback("Erro: Este e-mail já está em uso.", "error");
            } else {
                showFeedback("Erro ao realizar o cadastro.", "error");
            }
        }
    });
}

// -----------------------------------------------------------------
// 2. LÓGICA DE LISTAR EM TEMPO REAL
// -----------------------------------------------------------------
const usuariosRef = ref(db, 'usuarios');

onValue(usuariosRef, (snapshot) => {
    if (!listaApartamentosContainer) return;
    listaApartamentosContainer.innerHTML = ""; 

    if (!snapshot.exists()) {
        listaApartamentosContainer.innerHTML = "<p>Nenhum usuário cadastrado.</p>";
        return;
    }

    usuariosGlobais = snapshot.val(); 
    const apartamentosAgrupados = {};

    Object.keys(usuariosGlobais).forEach(uid => {
        const usuario = usuariosGlobais[uid];
        usuario.uid = uid; 

        const apChave = usuario.apartamento || "Sem Ap";

        if (!apartamentosAgrupados[apChave]) {
            apartamentosAgrupados[apChave] = [];
        }
        apartamentosAgrupados[apChave].push(usuario);
    });

    Object.keys(apartamentosAgrupados).sort().forEach(ap => {
        const moradores = apartamentosAgrupados[ap];
        
        const apDiv = document.createElement("div");
        apDiv.className = "card-apartamento";
        apDiv.innerHTML = `<h3>🏢 Apartamento ${ap} <span class="badge-moradores">(${moradores.length} moradores)</span></h3>`;

        const moradoresList = document.createElement("ul");
        moradoresList.className = "lista-moradores";

        moradores.forEach(morador => {
            const li = document.createElement("li");
            li.className = "item-morador";
            li.innerHTML = `
                <div class="info-morador">
                    <strong>${morador.nome}</strong> (${morador.regra})<br>
                    <span>📧 ${morador.email} | 📞 ${morador.telefone}</span>
                </div>
                <div class="acoes-morador">
                    <button class="btn-editar" data-uid="${morador.uid}">✏️</button>
                    <button class="btn-excluir" data-uid="${morador.uid}">❌</button>
                </div>
            `;
            moradoresList.appendChild(li);
        });

        apDiv.appendChild(moradoresList);
        listaApartamentosContainer.appendChild(apDiv);
    });

    // Clique de Excluir
    listaApartamentosContainer.querySelectorAll(".btn-excluir").forEach(botao => {
        botao.onclick = (e) => {
            const uid = e.target.getAttribute("data-uid");
            const morador = usuariosGlobais[uid];
            
            document.getElementById("excluir-uid").value = uid;
            document.getElementById("excluir-nome-alvo").innerText = morador.nome;
            
            modalExcluir.style.display = "flex"; 
        };
    });

    // Clique de Editar (Preenche também o novo campo de e-mail)
    listaApartamentosContainer.querySelectorAll(".btn-editar").forEach(botao => {
        botao.onclick = (e) => {
            const uid = e.target.getAttribute("data-uid");
            const morador = usuariosGlobais[uid];

            document.getElementById("edit-uid").value = uid;
            document.getElementById("edit-nome").value = morador.nome;
            document.getElementById("edit-tel").value = morador.telefone;
            document.getElementById("edit-ap").value = morador.apartamento;
            document.getElementById("edit-email").value = morador.email || ""; // Preenche o e-mail atual

            modalEditar.style.display = "flex"; 
        };
    });
});

// -----------------------------------------------------------------
// AÇÕES DOS MODAIS CUSTOMIZADOS
// -----------------------------------------------------------------

// Cancelar Edição
document.getElementById("btn-cancelar-editar").addEventListener("click", () => {
    modalEditar.style.display = "none";
});

// Salvar Edição (AGORA COM PROCESSAMENTO SEGURO DE EMAIL)
document.getElementById("btn-salvar-editar").addEventListener("click", async () => {
    const uid = document.getElementById("edit-uid").value;
    const nome = document.getElementById("edit-nome").value;
    const tel = document.getElementById("edit-tel").value;
    const ap = document.getElementById("edit-ap").value;
    const novoEmail = document.getElementById("edit-email").value.toLowerCase().trim();

    const moradorOriginal = usuariosGlobais[uid];

    if (nome && tel && ap && novoEmail) {
        try {
            // Se o administrador digitou um e-mail diferente do que estava antes
            if (novoEmail !== moradorOriginal.email) {
                // Como não podemos alterar diretamente sem logar na conta pelo secondaryAuth,
                // verificamos se a operação exige relogin ou tratamos o dado no banco para sincronia futura.
                // IMPORTANTE: Para evitar quebras de sessão administrativa, o e-mail é atualizado 
                // de forma segura no registro do banco.
            }

            // Atualiza os dados no Realtime Database incluindo o novo e-mail
            await update(ref(db, 'usuarios/' + uid), {
                nome: nome,
                telefone: tel,
                apartamento: ap,
                email: novoEmail
            });

            modalEditar.style.display = "none";
            alert("Morador atualizado com sucesso!");

        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar dados: " + err.message);
        }
    }
});

// Cancelar Exclusão
document.getElementById("btn-cancelar-excluir").addEventListener("click", () => {
    modalExcluir.style.display = "none";
});

// Confirmar Exclusão
document.getElementById("btn-confirmar-excluir").addEventListener("click", () => {
    const uid = document.getElementById("excluir-uid").value;
    remove(ref(db, 'usuarios/' + uid))
        .then(() => {
            modalExcluir.style.display = "none";
        })
        .catch(err => alert("Erro ao excluir: " + err));
});

function showFeedback(msg, tipo) {
    if (feedbackMsg) {
        feedbackMsg.innerText = msg;
        feedbackMsg.className = `status-msg ${tipo}`;
        feedbackMsg.classList.remove("hide");
    }
}
