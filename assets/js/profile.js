/**
 * UrDesire - Gestion du profil utilisateur anonyme
 * Système de profil discret pour boutique adulte
 */

class UrDesireProfile {
  constructor() {
    this.currentUser = null;
    this.currentEditingAddress = null;
    this.init();
  }

  init() {
    this.checkAuthentication();
    this.loadUserData();
    this.setupEventListeners();
    this.setupDelegatedEvents();
  }

  // Vérifier l'authentification
  checkAuthentication() {
    // Vérifier si le système d'auth existe
    if (typeof UrDesireAuth === "undefined") {
      console.error("Système d'authentification non chargé");
      window.location.href = "login.html";
      return;
    }

    const authSystem = new UrDesireAuth();
    this.currentUser = authSystem.getCurrentUser();

    if (!this.currentUser) {
      window.location.href = "login.html";
      return;
    }
  }

  // Charger les données utilisateur
  loadUserData() {
    this.displayUserInfo();
    this.loadUserStats();
    this.loadOrders();
    this.loadAddresses();
  }

  // Afficher les informations utilisateur
  displayUserInfo() {
    if (this.currentUser) {
      document.getElementById(
        "profile-welcome"
      ).textContent = `Bienvenue ${this.currentUser.pseudonyme} !`;
      document.getElementById("profile-username").textContent =
        this.currentUser.pseudonyme;
      document.getElementById("profile-join-date").textContent =
        this.formatDate(this.currentUser.joinDate);

      // Formulaire informations
      document.getElementById("profile-pseudo").value =
        this.currentUser.pseudonyme;
      document.getElementById("profile-secret-question").value =
        this.currentUser.secretQuestion || "Non définie";
      document.getElementById("profile-bio").value = this.currentUser.bio || "";

      // Avatar
      if (this.currentUser.avatar) {
        document.getElementById("profile-avatar").src = this.currentUser.avatar;
      }
    }
  }

  // Charger les statistiques utilisateur
  loadUserStats() {
    const stats = JSON.parse(localStorage.getItem("urdesire_user_stats")) || {};
    const userStats = stats[this.currentUser.pseudonyme] || {
      orders: 0,
      wishlist: 0,
      activity: 0,
    };

    document.getElementById("orders-count").textContent = userStats.orders;
    document.getElementById("wishlist-count").textContent = userStats.wishlist;
    document.getElementById("activity-count").textContent = userStats.activity;
  }

  // Charger les commandes
  loadOrders() {
    const orders = JSON.parse(localStorage.getItem("urdesire_orders")) || [];
    const userOrders = orders.filter(
      (order) => order.username === this.currentUser.pseudonyme
    );
    const tbody = document.getElementById("orders-tbody");
    const noOrdersMessage = document.getElementById("no-orders-message");

    if (userOrders.length === 0) {
      tbody.innerHTML = "";
      noOrdersMessage.style.display = "block";
      return;
    }

    noOrdersMessage.style.display = "none";
    tbody.innerHTML = userOrders
      .map(
        (order) => `
            <tr>
                <td>#${order.id}</td>
                <td>${this.formatDate(order.date)}</td>
                <td>${order.total} XOF</td>
                <td><span class="status-${order.status}">${this.getStatusText(
          order.status
        )}</span></td>
                <td>
                    <button class="tp-btn-sm view-order" data-order="${
                      order.id
                    }">Voir</button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  // Charger les adresses
  loadAddresses() {
    const addresses =
      JSON.parse(localStorage.getItem("urdesire_addresses")) || {};
    const userAddresses = addresses[this.currentUser.pseudonyme] || [];
    const container = document.getElementById("addresses-container");

    if (userAddresses.length === 0) {
      container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <p>Aucune adresse enregistrée</p>
                        <button class="tp-btn" id="add-first-address-btn">Ajouter ma première adresse</button>
                    </div>
                </div>
            `;
      return;
    }

    container.innerHTML = userAddresses
      .map(
        (address, index) => `
            <div class="col-md-6 mb-4">
                <div class="profile__address-item ${
                  address.isDefault ? "default-address" : ""
                }">
                    <div class="profile__address-content">
                        <h4>${address.name} ${
          address.isDefault ? '<span class="badge">Défaut</span>' : ""
        }</h4>
                        <p>${address.full}</p>
                        <p>${address.city}, ${address.zip}</p>
                        <p>Tél: ${address.phone}</p>
                        ${
                          address.instructions
                            ? `<p><small>Instructions: ${address.instructions}</small></p>`
                            : ""
                        }
                        <div class="address-actions mt-2">
                            <button class="tp-btn-sm edit-address" data-index="${index}">Modifier</button>
                            ${
                              !address.isDefault
                                ? `<button class="tp-btn-sm delete-address" data-index="${index}">Supprimer</button>`
                                : ""
                            }
                            ${
                              !address.isDefault
                                ? `<button class="tp-btn-sm set-default-address" data-index="${index}">Définir par défaut</button>`
                                : ""
                            }
                        </div>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  // Configurer les écouteurs d'événements directs
  setupEventListeners() {
    // Déconnexion
    document
      .getElementById("logout-btn")
      .addEventListener("click", () => this.logout());

    // Formulaire informations
    document
      .getElementById("profile-info-form")
      .addEventListener("submit", (e) => this.saveProfileInfo(e));

    // Formulaire mot de passe
    document
      .getElementById("change-password-form")
      .addEventListener("submit", (e) => this.changePassword(e));

    // Gestion des adresses
    document
      .getElementById("add-address-btn")
      .addEventListener("click", () => this.showAddressForm());
    document
      .getElementById("cancel-address-btn")
      .addEventListener("click", () => this.hideAddressForm());
    document
      .getElementById("address-form")
      .addEventListener("submit", (e) => this.saveAddress(e));

    // Avatar
    document
      .getElementById("profile-thumb-input")
      .addEventListener("change", (e) => this.updateAvatar(e));
  }

  // Configurer les événements délégués
  setupDelegatedEvents() {
    // Gestion des adresses (événements délégués)
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("edit-address")) {
        const index = parseInt(e.target.dataset.index);
        this.showAddressForm(index);
      }

      if (e.target.classList.contains("delete-address")) {
        const index = parseInt(e.target.dataset.index);
        if (confirm("Supprimer cette adresse ?")) {
          this.deleteAddress(index);
        }
      }

      if (e.target.classList.contains("set-default-address")) {
        const index = parseInt(e.target.dataset.index);
        this.setDefaultAddress(index);
      }

      if (e.target.id === "add-first-address-btn") {
        this.showAddressForm();
      }
    });
  }

  // Déconnexion
  logout() {
    if (typeof UrDesireAuth !== "undefined") {
      const authSystem = new UrDesireAuth();
      authSystem.logout();
    }
    window.location.href = "login.html";
  }

  // Sauvegarder les informations du profil
  saveProfileInfo(e) {
    e.preventDefault();

    const bio = document.getElementById("profile-bio").value;

    // Mettre à jour les données utilisateur
    const users = JSON.parse(localStorage.getItem("urdesire_users")) || {};
    if (users[this.currentUser.pseudonyme]) {
      users[this.currentUser.pseudonyme].bio = bio;
      localStorage.setItem("urdesire_users", JSON.stringify(users));
      this.currentUser.bio = bio;
    }

    this.showMessage("Profil mis à jour avec succès", "success");
  }

  // Changer le mot de passe
  changePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (typeof UrDesireAuth === "undefined") {
      this.showMessage("Erreur système", "error");
      return;
    }

    const authSystem = new UrDesireAuth();
    const result = authSystem.changePassword(
      this.currentUser.pseudonyme,
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (result.success) {
      this.showMessage("Mot de passe changé avec succès", "success");
      document.getElementById("change-password-form").reset();
    } else {
      this.showMessage(result.message, "error");
    }
  }

  // Gestion des adresses
  showAddressForm(addressIndex = null) {
    const formContainer = document.getElementById("address-form-container");
    const formTitle = document.getElementById("address-form-title");
    const form = document.getElementById("address-form");

    if (addressIndex !== null) {
      // Mode édition
      formTitle.textContent = "Modifier l'adresse";
      this.currentEditingAddress = addressIndex;
      this.fillAddressForm(addressIndex);
    } else {
      // Mode ajout
      formTitle.textContent = "Nouvelle adresse";
      form.reset();
      this.currentEditingAddress = null;
    }

    formContainer.classList.remove("d-none");
    formContainer.scrollIntoView({ behavior: "smooth" });
  }

  hideAddressForm() {
    document.getElementById("address-form-container").classList.add("d-none");
    this.currentEditingAddress = null;
  }

  fillAddressForm(index) {
    const addresses =
      JSON.parse(localStorage.getItem("urdesire_addresses")) || {};
    const userAddresses = addresses[this.currentUser.pseudonyme] || [];
    const address = userAddresses[index];

    if (address) {
      document.getElementById("address-name").value = address.name || "";
      document.getElementById("address-phone").value = address.phone || "";
      document.getElementById("address-full").value = address.full || "";
      document.getElementById("address-city").value = address.city || "";
      document.getElementById("address-zip").value = address.zip || "";
      document.getElementById("address-instructions").value =
        address.instructions || "";
      document.getElementById("address-default").checked =
        address.isDefault || false;
    }
  }

  saveAddress(e) {
    e.preventDefault();

    const addressData = {
      name: document.getElementById("address-name").value,
      phone: document.getElementById("address-phone").value,
      full: document.getElementById("address-full").value,
      city: document.getElementById("address-city").value,
      zip: document.getElementById("address-zip").value,
      instructions: document.getElementById("address-instructions").value,
      isDefault: document.getElementById("address-default").checked,
    };

    // Validation basique
    if (
      !addressData.name ||
      !addressData.phone ||
      !addressData.full ||
      !addressData.city ||
      !addressData.zip
    ) {
      this.showMessage(
        "Veuillez remplir tous les champs obligatoires",
        "error"
      );
      return;
    }

    let addresses =
      JSON.parse(localStorage.getItem("urdesire_addresses")) || {};
    let userAddresses = addresses[this.currentUser.pseudonyme] || [];

    if (this.currentEditingAddress !== null) {
      // Modification
      userAddresses[this.currentEditingAddress] = addressData;
    } else {
      // Ajout
      userAddresses.push(addressData);
    }

    // Gérer l'adresse par défaut
    if (addressData.isDefault) {
      userAddresses.forEach((addr) => {
        if (addr !== addressData) addr.isDefault = false;
      });
    }

    addresses[this.currentUser.pseudonyme] = userAddresses;
    localStorage.setItem("urdesire_addresses", JSON.stringify(addresses));

    this.hideAddressForm();
    this.loadAddresses();
    this.showMessage("Adresse enregistrée avec succès", "success");
  }

  deleteAddress(index) {
    let addresses =
      JSON.parse(localStorage.getItem("urdesire_addresses")) || {};
    let userAddresses = addresses[this.currentUser.pseudonyme] || [];

    userAddresses.splice(index, 1);
    addresses[this.currentUser.pseudonyme] = userAddresses;
    localStorage.setItem("urdesire_addresses", JSON.stringify(addresses));

    this.loadAddresses();
    this.showMessage("Adresse supprimée", "success");
  }

  setDefaultAddress(index) {
    let addresses =
      JSON.parse(localStorage.getItem("urdesire_addresses")) || {};
    let userAddresses = addresses[this.currentUser.pseudonyme] || [];

    userAddresses.forEach((addr, i) => {
      addr.isDefault = i === index;
    });

    addresses[this.currentUser.pseudonyme] = userAddresses;
    localStorage.setItem("urdesire_addresses", JSON.stringify(addresses));

    this.loadAddresses();
    this.showMessage("Adresse par défaut mise à jour", "success");
  }

  // Mettre à jour l'avatar
  updateAvatar(e) {
    const file = e.target.files[0];
    if (file) {
      // Vérifier la taille du fichier (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.showMessage("L'image ne doit pas dépasser 2MB", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById("profile-avatar").src = event.target.result;

        // Sauvegarder en base64
        const users = JSON.parse(localStorage.getItem("urdesire_users")) || {};
        if (users[this.currentUser.pseudonyme]) {
          users[this.currentUser.pseudonyme].avatar = event.target.result;
          localStorage.setItem("urdesire_users", JSON.stringify(users));
          this.currentUser.avatar = event.target.result;
        }

        this.showMessage("Photo de profil mise à jour", "success");
      };
      reader.readAsDataURL(file);
    }
  }

  // Utilitaires
  formatDate(dateString) {
    if (!dateString) return "Non spécifié";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR");
    } catch (e) {
      return dateString;
    }
  }

  getStatusText(status) {
    const statusMap = {
      pending: "En attente",
      processing: "En traitement",
      shipped: "Expédiée",
      delivered: "Livrée",
      cancelled: "Annulée",
    };
    return statusMap[status] || status;
  }

  showMessage(message, type) {
    // Créer une notification simple
    const notification = document.createElement("div");
    notification.className = `alert alert-${
      type === "success" ? "success" : "danger"
    } fixed-top m-3`;
    notification.style.cssText = "z-index: 9999; margin-top: 80px;";
    notification.textContent = message;

    document.body.appendChild(notification);

    // Supprimer après 3 secondes
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialisation quand le DOM est chargé
document.addEventListener("DOMContentLoaded", function () {
  // Vérifier que Bootstrap est chargé
  if (typeof bootstrap === "undefined") {
    console.error("Bootstrap non chargé");
    return;
  }

  // Initialiser le profil
  window.urDesireProfile = new UrDesireProfile();
});

// Gestion des erreurs
window.addEventListener("error", function (e) {
  console.error("Erreur dans profile.js:", e.error);
});
