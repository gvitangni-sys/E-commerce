/**
 * Gestion du suivi de commande UrDesire
 * Version 1.0 - Suivi en temps réel avec messagerie livreur
 */

class UrDesireOrderTracking {
  constructor() {
    this.currentOrder = null;
    this.orders = [];
    this.messages = [];
    this.driverPosition = null;
    this.init();
  }

  init() {
    this.checkAuthentication();
    this.loadUserOrders();
    this.setupEventListeners();
    this.setupRealTimeUpdates();
    console.log("✅ Module suivi de commande UrDesire initialisé");
  }

  checkAuthentication() {
    if (!window.urdesireAuth || !window.urdesireAuth.isLoggedIn()) {
      this.showNoOrders();
      return false;
    }
    return true;
  }

  loadUserOrders() {
    if (!this.checkAuthentication()) return;

    const user = window.urdesireAuth.getCurrentUser();
    const userOrders = localStorage.getItem(
      "urdesire_orders_" + user.pseudonyme
    );

    this.orders = userOrders ? JSON.parse(userOrders) : [];
    this.orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.updateOrdersCount();
    this.displayOrders();

    // Charger l'order depuis l'URL si spécifié
    this.loadOrderFromURL();
  }

  loadOrderFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("order");

    if (orderId) {
      this.selectOrder(orderId);
    }
  }

  displayOrders() {
    const orderSelect = document.getElementById("order-select");
    const orderSelection = document.getElementById("order-selection");

    if (this.orders.length === 0) {
      this.showNoOrders();
      return;
    }

    // Afficher la sélection si multiple commandes
    if (this.orders.length > 1) {
      orderSelection.style.display = "block";
      orderSelect.innerHTML =
        '<option value="">Sélectionnez une commande...</option>' +
        this.orders
          .map(
            (order) =>
              `<option value="${order.orderId}">
                        ${order.orderId} - ${this.formatDate(
                order.timestamp
              )} - ${this.formatPrice(order.order.total)}
                    </option>`
          )
          .join("");
    } else if (this.orders.length === 1) {
      // Afficher directement la seule commande
      this.selectOrder(this.orders[0].orderId);
    }
  }

  selectOrder(orderId) {
    this.currentOrder = this.orders.find((order) => order.orderId === orderId);

    if (!this.currentOrder) {
      this.showMessage("❌ Commande non trouvée", "error");
      return;
    }

    this.displayOrderDetails();
    this.loadOrderMessages();
    this.simulateDriverUpdates();
  }

  displayOrderDetails() {
    document.getElementById("order-details").style.display = "block";
    document.getElementById("no-orders").style.display = "none";

    // Informations de base
    document.getElementById(
      "order-id"
    ).textContent = `Commande ${this.currentOrder.orderId}`;
    document.getElementById(
      "order-date"
    ).textContent = `Passée le ${this.formatDate(this.currentOrder.timestamp)}`;
    document.getElementById("order-status").textContent = this.getStatusText(
      this.currentOrder.status
    );
    document.getElementById(
      "order-total"
    ).textContent = `Total: ${this.formatPrice(this.currentOrder.order.total)}`;

    // Adresse de livraison
    const delivery = this.currentOrder.delivery;
    document.getElementById(
      "delivery-address"
    ).textContent = `${delivery.address}, ${delivery.postcode} ${delivery.city}`;

    // Options de confidentialité
    const privacy = this.currentOrder.privacy;
    const options = [];
    if (privacy.discreetPackaging) options.push("Emballage discret ✓");
    if (privacy.noContactDelivery) options.push("Livraison sans contact ✓");
    document.getElementById("privacy-options").textContent =
      options.join(" | ");

    // Articles commandés
    this.displayOrderItems();

    // Timeline de statut
    this.updateStatusTimeline();

    // Informations livreur
    this.updateDriverInfo();
  }

  displayOrderItems() {
    const itemsContainer = document.getElementById("order-items-list");
    itemsContainer.innerHTML = this.currentOrder.order.items
      .map(
        (item) => `
            <div class="order-item d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                <div class="item-info">
                    <span class="fw-bold">${this.escapeHtml(item.name)}</span>
                    <br>
                    <small class="text-muted">Quantité: ${
                      item.quantity
                    } × ${this.formatPrice(item.price)}</small>
                </div>
                <span class="fw-bold">${this.formatPrice(
                  item.price * item.quantity
                )}</span>
            </div>
        `
      )
      .join("");
  }

  updateStatusTimeline() {
    const statusConfig = {
      confirmed: { date: this.currentOrder.timestamp, completed: true },
      preparing: {
        date: this.addMinutes(this.currentOrder.timestamp, 45),
        completed: true,
      },
      shipping: {
        date: this.addMinutes(this.currentOrder.timestamp, 120),
        completed: true,
      },
      delivered: { date: null, completed: false },
    };

    // Mettre à jour les dates
    Object.keys(statusConfig).forEach((status) => {
      const element = document.getElementById(`status-${status}`);
      if (element && statusConfig[status].date) {
        element.textContent = this.formatTime(statusConfig[status].date);
      }
    });

    // Mettre à jour les classes active/completed
    this.updateTimelineClasses(this.currentOrder.status);
  }

  updateTimelineClasses(currentStatus) {
    const statuses = ["confirmed", "preparing", "shipping", "delivered"];
    const currentIndex = statuses.indexOf(currentStatus);

    statuses.forEach((status, index) => {
      const element = document.querySelector(
        `.status-step:nth-child(${index + 1})`
      );
      if (element) {
        element.classList.remove("active", "completed");
        if (index < currentIndex) element.classList.add("completed");
        if (index === currentIndex) element.classList.add("active");
      }
    });
  }

  updateDriverInfo() {
    // Informations simulées du livreur
    document.getElementById("driver-id").textContent =
      this.currentOrder.privacy.customerId.replace("CID_", "LVR_");
    document.getElementById("driver-status").textContent = this.getDriverStatus(
      this.currentOrder.status
    );
    document.getElementById("delivery-estimate").textContent =
      this.getDeliveryEstimate();
  }

  loadOrderMessages() {
    const messagesKey = `urdesire_messages_${this.currentOrder.orderId}`;
    const savedMessages = localStorage.getItem(messagesKey);
    this.messages = savedMessages ? JSON.parse(savedMessages) : [];

    this.renderMessages();

    // Message automatique du livreur
    if (this.messages.length === 0) {
      this.addSystemMessage(
        "🚚 Votre livreur a été assigné. Vous pouvez communiquer avec lui via cette messagerie."
      );
    }
  }

  renderMessages() {
    const container = document.getElementById("message-container");
    container.innerHTML = this.messages
      .map(
        (msg) => `
            <div class="message ${msg.sender}">
                <div class="message-content">${this.escapeHtml(
                  msg.content
                )}</div>
                <small class="message-time">${this.formatTime(
                  msg.timestamp
                )}</small>
            </div>
        `
      )
      .join("");

    container.scrollTop = container.scrollHeight;
  }

  setupEventListeners() {
    // Sélection de commande
    const orderSelect = document.getElementById("order-select");
    if (orderSelect) {
      orderSelect.addEventListener("change", (e) =>
        this.selectOrder(e.target.value)
      );
    }

    // Messagerie
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-message");

    if (messageInput && sendButton) {
      sendButton.addEventListener("click", () => this.sendMessage());
      messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendMessage();
      });
    }

    // Actions rapides
    document
      .getElementById("btn-location")
      ?.addEventListener("click", () => this.requestLocation());
    document
      .getElementById("btn-call")
      ?.addEventListener("click", () => this.simulateCall());
    document
      .getElementById("btn-track")
      ?.addEventListener("click", () => this.showTrackingMap());
    document
      .getElementById("btn-receipt")
      ?.addEventListener("click", () => this.downloadReceipt());
    document
      .getElementById("btn-support")
      ?.addEventListener("click", () => this.contactSupport());
  }

  sendMessage() {
    const input = document.getElementById("message-input");
    const message = input.value.trim();

    if (!message || !this.currentOrder) return;

    // Ajouter le message
    this.addMessage(message, "customer");
    input.value = "";

    // Réponse automatique du livreur (simulée)
    setTimeout(() => {
      this.addDriverResponse(message);
    }, 2000);
  }

  addMessage(content, sender) {
    const message = {
      content: content,
      sender: sender,
      timestamp: new Date().toISOString(),
    };

    this.messages.push(message);
    this.saveMessages();
    this.renderMessages();
  }

  addSystemMessage(content) {
    this.addMessage(content, "driver");
  }

  addDriverResponse(customerMessage) {
    const responses = [
      "Message reçu. Je suis en route, estimation 30 minutes.",
      "Je vous tiens au courant de l'avancement.",
      "Pas de problème, je note vos instructions.",
      "Je serai là dans environ 20 minutes.",
      "Merci de votre patience, trafic dense.",
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    this.addSystemMessage(response);
  }

  saveMessages() {
    if (!this.currentOrder) return;
    const messagesKey = `urdesire_messages_${this.currentOrder.orderId}`;
    localStorage.setItem(messagesKey, JSON.stringify(this.messages));
  }

  requestLocation() {
    this.addSystemMessage(
      "📍 Position actuelle: Je suis à environ 15 minutes de votre adresse."
    );
  }

  simulateCall() {
    this.showMessage("📞 Appel simulé vers le livreur...", "info");
  }

  showTrackingMap() {
    this.showMessage("🗺️ Fonctionnalité carte en développement...", "info");
  }

  downloadReceipt() {
    if (!this.currentOrder) return;

    const receipt = this.generateReceipt();
    const blob = new Blob([receipt], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reçu-${this.currentOrder.orderId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  generateReceipt() {
    return `
            <html>
                <head><title>Reçu ${this.currentOrder.orderId}</title></head>
                <body>
                    <h1>UrDesire - Reçu de commande</h1>
                    <p>Commande: ${this.currentOrder.orderId}</p>
                    <p>Date: ${this.formatDate(this.currentOrder.timestamp)}</p>
                    ${this.currentOrder.order.items
                      .map(
                        (item) => `
                        <p>${item.name} × ${item.quantity}: ${this.formatPrice(
                          item.price * item.quantity
                        )}</p>
                    `
                      )
                      .join("")}
                    <p><strong>Total: ${this.formatPrice(
                      this.currentOrder.order.total
                    )}</strong></p>
                </body>
            </html>
        `;
  }

  contactSupport() {
    this.showMessage("🛟 Redirection vers le support UrDesire...", "info");
  }

  setupRealTimeUpdates() {
    // Simulation de mises à jour en temps réel
    setInterval(() => {
      if (this.currentOrder) {
        this.simulateDriverMovement();
      }
    }, 30000);
  }

  simulateDriverUpdates() {
    if (!this.currentOrder) return;

    // Mises à jour périodiques du statut
    const updates = [
      {
        delay: 10000,
        status: "preparing",
        message: "📦 Votre colis est en cours de préparation",
      },
      {
        delay: 30000,
        status: "shipping",
        message: "🚚 Votre commande est en route !",
      },
      {
        delay: 60000,
        status: "delivered",
        message: "✅ Commande livrée avec succès !",
      },
    ];

    updates.forEach((update) => {
      setTimeout(() => {
        if (this.currentOrder && this.currentOrder.status !== "delivered") {
          this.currentOrder.status = update.status;
          this.updateStatusTimeline();
          this.addSystemMessage(update.message);
          this.saveOrderUpdate();
        }
      }, update.delay);
    });
  }

  simulateDriverMovement() {
    if (this.currentOrder && this.currentOrder.status === "shipping") {
      const messages = [
        "📍 Je suis à 10 minutes de chez vous",
        "🚗 Dans votre quartier, 5 minutes",
        "🏠 J'arrive dans 2 minutes",
      ];

      const randomMessage =
        messages[Math.floor(Math.random() * messages.length)];
      this.addSystemMessage(randomMessage);
    }
  }

  saveOrderUpdate() {
    if (!this.currentOrder) return;

    // Mettre à jour la commande dans le stockage
    const index = this.orders.findIndex(
      (order) => order.orderId === this.currentOrder.orderId
    );
    if (index !== -1) {
      this.orders[index] = this.currentOrder;
      const user = window.urdesireAuth.getCurrentUser();
      localStorage.setItem(
        "urdesire_orders_" + user.pseudonyme,
        JSON.stringify(this.orders)
      );
    }
  }

  showNoOrders() {
    document.getElementById("order-details").style.display = "none";
    document.getElementById("order-selection").style.display = "none";
    document.getElementById("no-orders").style.display = "block";
  }

  updateOrdersCount() {
    const countElement = document.getElementById("orders-count");
    if (countElement) {
      countElement.textContent = this.orders.length;
    }
  }

  // Méthodes utilitaires
  formatPrice(amount) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(amount);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  addMinutes(dateString, minutes) {
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  }

  getStatusText(status) {
    const statuses = {
      confirmed: "Confirmée",
      preparing: "En préparation",
      shipping: "En livraison",
      delivered: "Livrée",
    };
    return statuses[status] || status;
  }

  getDriverStatus(orderStatus) {
    const statuses = {
      confirmed: "Assignation en cours",
      preparing: "Préparation du colis",
      shipping: "En route",
      delivered: "Mission terminée",
    };
    return statuses[orderStatus] || orderStatus;
  }

  getDeliveryEstimate() {
    if (this.currentOrder.status === "shipping") {
      return "15-30 min";
    }
    return this.currentOrder.order.shippingMethod === "express"
      ? "24-48h"
      : "3-5 jours";
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
  if (typeof UrDesireAuth !== "undefined") {
    window.urdesireOrderTracking = new UrDesireOrderTracking();
  } else {
    console.error("❌ auth.js doit être chargé avant order.js");
  }
});
