/**
 * Gestion du processus de commande UrDesire
 * Version 1.0 - Checkout sécurisé et discret
 */

class UrDesireCheckout {
  constructor() {
    this.cart = [];
    this.shippingCost = 0;
    this.orderDetails = {};
    this.init();
  }

  init() {
    this.loadCart();
    this.setupEventListeners();
    this.updateOrderSummary();
    this.checkAuthentication();
    console.log("✅ Module checkout UrDesire initialisé");
  }

  checkAuthentication() {
    if (!window.urdesireAuth || !window.urdesireAuth.isLoggedIn()) {
      this.showMessage(
        "🔐 Veuillez vous connecter pour finaliser votre commande",
        "error"
      );
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return false;
    }
    return true;
  }

  loadCart() {
    const savedCart = localStorage.getItem("urdesire_cart");
    this.cart = savedCart ? JSON.parse(savedCart) : [];
    this.updateCartCount();
  }

  updateCartCount() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      cartCount.textContent = this.cart.reduce(
        (total, item) => total + item.quantity,
        0
      );
    }
  }

  setupEventListeners() {
    // Gestion du formulaire
    const checkoutForm = document.getElementById("checkout-form");
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", (e) =>
        this.handleOrderSubmission(e)
      );
    }

    // Gestion des méthodes de livraison
    const shippingMethods = document.querySelectorAll('input[name="shipping"]');
    shippingMethods.forEach((method) => {
      method.addEventListener("change", () => this.updateShippingCost());
    });

    // Validation en temps réel
    this.setupRealTimeValidation();
  }

  setupRealTimeValidation() {
    const requiredFields = document.querySelectorAll(
      "#checkout-form input[required]"
    );
    requiredFields.forEach((field) => {
      field.addEventListener("blur", () => this.validateField(field));
    });
  }

  validateField(field) {
    if (!field.value.trim()) {
      field.style.borderColor = "#dc3545";
      return false;
    } else {
      field.style.borderColor = "#28a745";
      return true;
    }
  }

  updateShippingCost() {
    const expressShipping = document.getElementById("express-shipping");
    this.shippingCost = expressShipping.checked ? 5000 : 0;
    this.updateOrderSummary();
  }

  calculateSubtotal() {
    return this.cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  updateOrderSummary() {
    const subtotal = this.calculateSubtotal();
    const total = subtotal + this.shippingCost;

    // Mettre à jour les totaux
    document.getElementById("subtotal").textContent =
      this.formatPrice(subtotal);
    document.getElementById("shipping-cost").textContent =
      this.shippingCost === 0
        ? "Gratuite"
        : this.formatPrice(this.shippingCost);
    document.getElementById("total").textContent = this.formatPrice(total);

    // Mettre à jour la liste des produits
    this.renderOrderProducts();
  }

  renderOrderProducts() {
    const orderSummary = document.getElementById("order-summary");
    if (!orderSummary) return;

    if (this.cart.length === 0) {
      orderSummary.innerHTML =
        '<p class="empty-cart">Votre panier est vide</p>';
      return;
    }

    orderSummary.innerHTML = this.cart
      .map(
        (item) => `
            <div class="order-product-item">
                <div class="product-info">
                    <span class="product-name">${this.escapeHtml(
                      item.name
                    )}</span>
                    <span class="product-quantity">× ${item.quantity}</span>
                </div>
                <span class="product-total">${this.formatPrice(
                  item.price * item.quantity
                )}</span>
            </div>
        `
      )
      .join("");
  }

  async handleOrderSubmission(e) {
    e.preventDefault();

    if (!this.checkAuthentication()) return;

    if (this.cart.length === 0) {
      this.showMessage("❌ Votre panier est vide", "error");
      return;
    }

    // Validation des champs requis
    if (!this.validateForm()) {
      this.showMessage(
        "❌ Veuillez remplir tous les champs obligatoires",
        "error"
      );
      return;
    }

    // Récupération des données du formulaire
    const orderData = this.collectOrderData();

    try {
      this.setLoadingState(true);

      // Simulation de traitement
      await this.processOrder(orderData);

      this.showMessage("✅ Commande passée avec succès !", "success");

      // Redirection vers la page de confirmation
      setTimeout(() => {
        window.location.href = "order.html?order=" + orderData.orderId;
      }, 1500);
    } catch (error) {
      this.showMessage("❌ Erreur lors du traitement de la commande", "error");
      console.error("Erreur checkout:", error);
    } finally {
      this.setLoadingState(false);
    }
  }

  validateForm() {
    const requiredFields = document.querySelectorAll(
      "#checkout-form input[required]"
    );
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  collectOrderData() {
    const user = window.urdesireAuth.getCurrentUser();
    const discreetPackaging =
      document.getElementById("discreet-packaging").checked;
    const noContactDelivery = document.getElementById(
      "no-contact-delivery"
    ).checked;
    const expressShipping = document.getElementById("express-shipping").checked;

    return {
      orderId: "URD" + Date.now(),
      pseudonyme: user.pseudonyme,
      timestamp: new Date().toISOString(),

      // Informations de livraison
      delivery: {
        firstName: document.getElementById("first-name").value,
        lastName: document.getElementById("last-name").value,
        address: document.getElementById("address").value,
        city: document.getElementById("city").value,
        postcode: document.getElementById("postcode").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        instructions: document.getElementById("delivery-instructions").value,
      },

      // Options de confidentialité
      privacy: {
        discreetPackaging: discreetPackaging,
        noContactDelivery: noContactDelivery,
        customerId: this.generateCustomerId(user.pseudonyme),
      },

      // Détails de la commande
      order: {
        items: this.cart,
        subtotal: this.calculateSubtotal(),
        shipping: this.shippingCost,
        total: this.calculateSubtotal() + this.shippingCost,
        shippingMethod: expressShipping ? "express" : "standard",
      },

      // Statut
      status: "confirmed",
    };
  }

  generateCustomerId(pseudonyme) {
    // Génère un ID unique pour la communication avec le livreur
    return (
      "CID_" +
      pseudonyme.substring(0, 3).toUpperCase() +
      "_" +
      Date.now().toString().slice(-6)
    );
  }

  async processOrder(orderData) {
    // Simulation d'un délai de traitement
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Sauvegarde de la commande
    this.saveOrder(orderData);

    // Vidage du panier
    this.clearCart();
  }

  saveOrder(orderData) {
    const userOrders = JSON.parse(
      localStorage.getItem("urdesire_orders_" + orderData.pseudonyme) || "[]"
    );
    userOrders.push(orderData);
    localStorage.setItem(
      "urdesire_orders_" + orderData.pseudonyme,
      JSON.stringify(userOrders)
    );

    // Sauvegarde globale pour l'admin
    const allOrders = JSON.parse(
      localStorage.getItem("urdesire_all_orders") || "[]"
    );
    allOrders.push(orderData);
    localStorage.setItem("urdesire_all_orders", JSON.stringify(allOrders));
  }

  clearCart() {
    localStorage.removeItem("urdesire_cart");
    this.cart = [];
    this.updateCartCount();
  }

  setLoadingState(loading) {
    const submitBtn = document.getElementById("place-order-btn");
    if (submitBtn) {
      if (loading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Traitement en cours...';
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "Passer la commande sécurisée";
      }
    }
  }

  formatPrice(amount) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(amount);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showMessage(message, type = "info") {
    if (window.urdesireAuth && window.urdesireAuth.showMessage) {
      window.urdesireAuth.showMessage(message, type);
    } else {
      alert(message);
    }
  }
}

// Initialisation
document.addEventListener("DOMContentLoaded", function () {
  // Vérifier que auth.js est chargé
  if (typeof UrDesireAuth !== "undefined") {
    window.urdesireCheckout = new UrDesireCheckout();
  } else {
    console.error("❌ auth.js doit être chargé avant checkout.js");
  }
});
