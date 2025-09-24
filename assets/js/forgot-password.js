/**
 * Gestion de la récupération de mot de passe UrDesire
 * Version 1.0
 */

class ForgotPassword {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log("✅ Module de récupération de mot de passe initialisé");
  }

  setupEventListeners() {
    const btnVerify = document.getElementById("btn-verify-pseudonyme");
    const btnReset = document.getElementById("btn-reset-password");

    if (btnVerify) {
      btnVerify.addEventListener("click", () => this.verifyPseudonyme());
    }

    if (btnReset) {
      btnReset.addEventListener("click", () => this.resetPassword());
    }

    // Revenir à l'étape 1 avec ESC
    document.addEventListener("keydown", (e) => this.handleKeydown(e));
  }

  verifyPseudonyme() {
    const pseudonyme = document.getElementById("pseudonyme").value.trim();

    if (!pseudonyme) {
      this.showMessage("❌ Veuillez entrer votre pseudonyme", "error");
      return;
    }

    const userData = localStorage.getItem("urdesire_user_" + pseudonyme);

    if (!userData) {
      this.showMessage("❌ Pseudonyme non trouvé", "error");
      return;
    }

    this.currentUser = JSON.parse(userData);
    document.getElementById("user-question").textContent =
      this.currentUser.question;

    this.showStep(2);
    this.showMessage("✅ Pseudonyme vérifié", "success");
  }

  resetPassword() {
    if (!this.currentUser) {
      this.showMessage(
        "❌ Veuillez d'abord vérifier votre pseudonyme",
        "error"
      );
      return;
    }

    const reponse = document.getElementById("reponse-secrete").value.trim();
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById(
      "confirm-new-password"
    ).value;

    if (!reponse || !newPassword || !confirmPassword) {
      this.showMessage("❌ Veuillez remplir tous les champs", "error");
      return;
    }

    if (newPassword.length < 6) {
      this.showMessage(
        "❌ Le mot de passe doit contenir au moins 6 caractères",
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showMessage("❌ Les mots de passe ne correspondent pas", "error");
      return;
    }

    if (reponse.toLowerCase() !== this.currentUser.reponse.toLowerCase()) {
      this.showMessage("❌ Réponse secrète incorrecte", "error");
      return;
    }

    // Mettre à jour le mot de passe
    this.currentUser.password = newPassword;
    localStorage.setItem(
      "urdesire_user_" + this.currentUser.pseudonyme,
      JSON.stringify(this.currentUser)
    );

    this.showStep(3);
    this.showMessage("✅ Mot de passe réinitialisé avec succès !", "success");
  }

  showStep(stepNumber) {
    // Cacher toutes les étapes
    document.getElementById("step-1").style.display = "none";
    document.getElementById("step-2").style.display = "none";
    document.getElementById("step-3").style.display = "none";

    // Afficher l'étape demandée
    document.getElementById("step-" + stepNumber).style.display = "block";
  }

  handleKeydown(e) {
    if (
      e.key === "Escape" &&
      document.getElementById("step-2").style.display === "block"
    ) {
      this.showStep(1);
      document.getElementById("pseudonyme").value = "";
      this.currentUser = null;
    }
  }

  showMessage(message, type = "info") {
    if (window.urdesireAuth && window.urdesireAuth.showMessage) {
      window.urdesireAuth.showMessage(message, type);
    } else {
      // Fallback simple
      alert(message);
    }
  }
}

// Initialisation quand le DOM est prêt
document.addEventListener("DOMContentLoaded", function () {
  window.forgotPassword = new ForgotPassword();
});
