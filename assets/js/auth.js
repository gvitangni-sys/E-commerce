/**
 * Système d'authentification UrDesire
 * Gestion sécurisée et anonyme des utilisateurs
 * Version 1.0 - UrDesire
 */

class UrDesireAuth {
  constructor() {
    this.currentUser = null;
    this.storagePrefix = "urdesire_";
    this.init();
  }

  init() {
    console.log("🔐 Initialisation du système UrDesire Auth");
    this.setupLogin();
    this.setupRegister();
    this.setupLogout();
    this.checkCurrentUser();
    this.setupPasswordToggle();
  }

  // === GESTION DE LA CONNEXION ===
  setupLogin() {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
      console.log("✅ Formulaire login initialisé");
    }
  }

  handleLogin(e) {
    e.preventDefault();

    const pseudonyme = document.getElementById("pseudonyme").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("remeber")
      ? document.getElementById("remeber").checked
      : false;

    // Validation
    if (!pseudonyme || !password) {
      this.showMessage("❌ Veuillez remplir tous les champs", "error");
      return;
    }

    if (pseudonyme.length < 3) {
      this.showMessage(
        "❌ Le pseudonyme doit contenir au moins 3 caractères",
        "error"
      );
      return;
    }

    // Simulation chargement
    this.setLoadingState("login-btn", true, "Connexion...");

    // Vérifier l'utilisateur
    setTimeout(() => {
      const user = this.getUserByPseudonyme(pseudonyme);

      if (!user) {
        this.setLoadingState("login-btn", false, "Se connecter");
        this.showMessage("❌ Pseudonyme non trouvé", "error");
        return;
      }

      if (user.password !== password) {
        this.setLoadingState("login-btn", false, "Se connecter");
        this.showMessage("❌ Mot de passe incorrect", "error");
        return;
      }

      // Connexion réussie
      this.loginUser(user, rememberMe);
      this.showMessage("✅ Connexion réussie ! Redirection...", "success");

      setTimeout(() => {
        window.location.href = "profile.html";
      }, 1000);
    }, 500);
  }

  // === GESTION DE L'INSCRIPTION ===
  setupRegister() {
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => this.handleRegister(e));
      console.log("✅ Formulaire register initialisé");
    }
  }

  handleRegister(e) {
    e.preventDefault();

    const pseudonyme = document.getElementById("pseudonyme").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const question = document.getElementById("question-secrete").value;
    const reponse = document.getElementById("reponse-secrete").value.trim();
    const conditions = document.getElementById("conditions")
      ? document.getElementById("conditions").checked
      : false;

    // Validation
    if (!pseudonyme || !password || !confirmPassword || !question || !reponse) {
      this.showMessage(
        "❌ Veuillez remplir tous les champs obligatoires",
        "error"
      );
      return;
    }

    if (!conditions) {
      this.showMessage(
        "❌ Veuillez accepter les conditions d'utilisation",
        "error"
      );
      return;
    }

    if (password.length < 6) {
      this.showMessage(
        "❌ Le mot de passe doit contenir au moins 6 caractères",
        "error"
      );
      return;
    }

    if (password !== confirmPassword) {
      this.showMessage("❌ Les mots de passe ne correspondent pas", "error");
      return;
    }

    if (pseudonyme.length < 3) {
      this.showMessage(
        "❌ Le pseudonyme doit contenir au moins 3 caractères",
        "error"
      );
      return;
    }

    if (this.getUserByPseudonyme(pseudonyme)) {
      this.showMessage("❌ Ce pseudonyme est déjà utilisé", "error");
      return;
    }

    // Simulation chargement
    this.setLoadingState("register-btn", true, "Création du compte...");

    setTimeout(() => {
      // Création de l'utilisateur
      const userData = {
        pseudonyme: pseudonyme,
        password: password,
        question: question,
        reponse: reponse,
        dateInscription: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // Sauvegarde
      this.saveUser(userData);
      this.loginUser(userData, true);

      this.setLoadingState("register-btn", false, "Créer mon compte discret");
      this.showMessage(
        "✅ Compte créé avec succès ! Redirection...",
        "success"
      );

      setTimeout(() => {
        window.location.href = "profile.html";
      }, 1500);
    }, 800);
  }

  // === GESTION DÉCONNEXION ===
  setupLogout() {
    const logoutLinks = document.querySelectorAll(
      'a[href="login.html"][onclick]'
    );
    logoutLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.logoutUser();
      });
    });
  }

  logoutUser() {
    localStorage.removeItem(this.storagePrefix + "current_user");
    sessionStorage.removeItem(this.storagePrefix + "current_user");
    this.currentUser = null;
    this.showMessage("👋 Déconnexion réussie", "success");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  }

  // === GESTION UTILISATEURS ===
  saveUser(userData) {
    const key = this.storagePrefix + "user_" + userData.pseudonyme;
    localStorage.setItem(key, JSON.stringify(userData));
    console.log("💾 Utilisateur sauvegardé:", userData.pseudonyme);
  }

  getUserByPseudonyme(pseudonyme) {
    const key = this.storagePrefix + "user_" + pseudonyme;
    const userData = localStorage.getItem(key);
    return userData ? JSON.parse(userData) : null;
  }

  loginUser(user, remember = false) {
    this.currentUser = user;

    if (remember) {
      localStorage.setItem(
        this.storagePrefix + "current_user",
        user.pseudonyme
      );
    } else {
      sessionStorage.setItem(
        this.storagePrefix + "current_user",
        user.pseudonyme
      );
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date().toISOString();
    this.saveUser(user);

    console.log("🔓 Utilisateur connecté:", user.pseudonyme);
  }

  checkCurrentUser() {
    const pseudonyme =
      localStorage.getItem(this.storagePrefix + "current_user") ||
      sessionStorage.getItem(this.storagePrefix + "current_user");

    if (pseudonyme) {
      this.currentUser = this.getUserByPseudonyme(pseudonyme);
      if (this.currentUser) {
        console.log(
          "👤 Utilisateur déjà connecté:",
          this.currentUser.pseudonyme
        );

        // Rediriger si sur login/register mais déjà connecté
        if (
          window.location.pathname.includes("login.html") ||
          window.location.pathname.includes("register.html")
        ) {
          setTimeout(() => {
            window.location.href = "profile.html";
          }, 500);
        }
      }
    }
  }

  // === FONCTIONNALITÉS UI ===
  setupPasswordToggle() {
    const toggle = document.getElementById("password-show-toggle");
    if (toggle) {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        this.togglePasswordVisibility();
      });
    }
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const openEye = document.getElementById("open-eye");
    const closeEye = document.getElementById("close-eye");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      if (openEye) openEye.style.display = "none";
      if (closeEye) closeEye.style.display = "block";
    } else {
      passwordInput.type = "password";
      if (openEye) openEye.style.display = "block";
      if (closeEye) closeEye.style.display = "none";
    }
  }

  setLoadingState(buttonId, loading, text = "") {
    const button = document.getElementById(buttonId);
    if (button) {
      if (loading) {
        button.disabled = true;
        button.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> ' + text;
      } else {
        button.disabled = false;
        button.textContent = text;
      }
    }
  }

  showMessage(message, type = "info") {
    // Créer une notification
    const messageDiv = document.createElement("div");
    messageDiv.className = `urdesire-message urdesire-message-${type}`;
    messageDiv.innerHTML = `
            <div class="urdesire-message-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

    // Styles pour la notification
    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: ${
              type === "error"
                ? "#f8d7da"
                : type === "success"
                ? "#d4edda"
                : "#d1ecf1"
            };
            color: ${
              type === "error"
                ? "#721c24"
                : type === "success"
                ? "#155724"
                : "#0c5460"
            };
            padding: 15px 20px;
            border-radius: 5px;
            border: 1px solid ${
              type === "error"
                ? "#f5c6cb"
                : type === "success"
                ? "#c3e6cb"
                : "#bee5eb"
            };
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;

    document.body.appendChild(messageDiv);

    // Auto-suppression après 5 secondes
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.remove();
      }
    }, 5000);
  }

  // === METHODES PUBLIQUES ===
  isLoggedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener("DOMContentLoaded", function () {
  window.urdesireAuth = new UrDesireAuth();
});

// Export pour utilisation globale
if (typeof module !== "undefined" && module.exports) {
  module.exports = UrDesireAuth;
}
