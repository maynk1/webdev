/* ============================================================
   A25 Organics — JavaScript feature (Task 4)
   Feature: Order basket estimator with form validation,
            live DOM updates, and Local Storage persistence.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Storage keys ---------- */
  const BASKET_KEY = "a25_basket_v1";
  const CUSTOMER_KEY = "a25_customer_v1";

  /* ---------- State ---------- */
  let basket = loadBasket();

  /* ---------- DOM references ---------- */
  const $list = document.getElementById("basket-list");
  const $empty = document.getElementById("basket-empty");
  const $totalWrap = document.getElementById("basket-total");
  const $totalAmt = document.getElementById("basket-total-amount");
  const $clearBtn = document.getElementById("clear-basket");
  const $form = document.getElementById("order-form");
  const $status = document.getElementById("form-status");
  const $budget = document.getElementById("budget");
  const $budgetVal = document.getElementById("budget-val");
  const $navToggle = document.querySelector(".nav-toggle");
  const $nav = document.getElementById("primary-nav");

  /* ============================================================
     1.  Add-to-basket buttons (delegated)
     ============================================================ */
  const table = document.getElementById("price-table");
  if (table) {
    table.addEventListener("click", function (e) {
      const btn = e.target.closest(".add-btn");
      if (!btn) return;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const unit = btn.dataset.unit;
      addItem({ name, price, unit, qty: 1 });
      renderBasket();
      saveBasket();
      // brief visual feedback on the button
      const original = btn.textContent;
      btn.textContent = "Added";
      btn.disabled = true;
      setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 700);
    });
  }

  /* ============================================================
     2.  Basket helpers (state)
     ============================================================ */
  function addItem(item) {
    const existing = basket.find(function (b) { return b.name === item.name; });
    if (existing) {
      existing.qty += 1;
    } else {
      basket.push(item);
    }
  }

  function removeItem(name) {
    basket = basket.filter(function (b) { return b.name !== name; });
  }

  function changeQty(name, delta) {
    const item = basket.find(function (b) { return b.name === name; });
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) removeItem(name);
  }

  function basketTotal() {
    return basket.reduce(function (sum, b) { return sum + b.price * b.qty; }, 0);
  }

  /* ============================================================
     3.  DOM updates (Task 4 requirement)
     ============================================================ */
  function renderBasket() {
    if (!$list) return;
    $list.innerHTML = "";

    if (basket.length === 0) {
      $empty.hidden = false;
      $totalWrap.hidden = true;
      return;
    }
    $empty.hidden = true;
    $totalWrap.hidden = false;

    basket.forEach(function (b) {
      const li = document.createElement("li");

      const left = document.createElement("span");
      left.innerHTML =
        '<span class="qty-control">' +
          '<button type="button" data-act="dec" data-name="' + escapeAttr(b.name) + '" aria-label="Decrease ' + escapeAttr(b.name) + '">&minus;</button>' +
          '<span>' + b.qty + ' &times; ' + escapeHtml(b.name) + '</span>' +
          '<button type="button" data-act="inc" data-name="' + escapeAttr(b.name) + '" aria-label="Increase ' + escapeAttr(b.name) + '">+</button>' +
        '</span>' +
        '<small>@ &#8377;' + b.price + '/' + escapeHtml(b.unit) + '</small>';

      const right = document.createElement("span");
      right.className = "item-total";
      right.textContent = "\u20B9" + (b.price * b.qty);

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "remove-btn";
      rm.dataset.name = b.name;
      rm.setAttribute("aria-label", "Remove " + b.name);
      rm.textContent = "\u2715";

      li.appendChild(left);
      li.appendChild(right);
      li.appendChild(rm);
      $list.appendChild(li);
    });

    $totalAmt.textContent = "\u20B9" + basketTotal();
  }

  /* delegated clicks inside the basket list (qty +/- and remove) */
  if ($list) {
    $list.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;
      const name = btn.dataset.name;
      if (!name) return;
      if (btn.dataset.act === "inc") changeQty(name, +1);
      else if (btn.dataset.act === "dec") changeQty(name, -1);
      else if (btn.classList.contains("remove-btn")) removeItem(name);
      renderBasket();
      saveBasket();
    });
  }

  /* clear basket */
  if ($clearBtn) {
    $clearBtn.addEventListener("click", function () {
      if (basket.length && !confirm("Clear all items from your basket?")) return;
      basket = [];
      renderBasket();
      saveBasket();
    });
  }

  /* ============================================================
     4.  Local Storage (Task 4 requirement)
     ============================================================ */
  function saveBasket() {
    try { localStorage.setItem(BASKET_KEY, JSON.stringify(basket)); } catch (e) { /* ignore quota */ }
  }
  function loadBasket() {
    try {
      const raw = localStorage.getItem(BASKET_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  /* save customer details as they type (so a reload does not lose them) */
  function saveCustomer() {
    if (!$form) return;
    const data = {};
    new FormData($form).forEach(function (v, k) { data[k] = v; });
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }
  function restoreCustomer() {
    if (!$form) return;
    let data;
    try { data = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "{}"); } catch (e) { return; }
    Object.keys(data).forEach(function (name) {
      const fields = $form.elements[name];
      if (!fields) return;
      if (fields instanceof RadioNodeList) {
        // radio group
        for (let i = 0; i < fields.length; i++) {
          if (fields[i].value === data[name]) { fields[i].checked = true; break; }
        }
      } else if (fields.type === "checkbox") {
        fields.checked = data[name] === "on" || data[name] === true;
      } else {
        fields.value = data[name];
      }
    });
    if ($budget && $budgetVal) $budgetVal.textContent = $budget.value;
  }

  /* ============================================================
     5.  Form validation (Task 4 requirement)
     ============================================================ */
  const validators = {
    "cust-name": function (v) {
      if (!v || v.trim().length < 2) return "Please enter your full name (min 2 characters).";
      return "";
    },
    "cust-email": function (v) {
      if (!v) return "Email is required.";
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!re.test(v)) return "Enter a valid email like name@farm.in.";
      return "";
    },
    "cust-phone": function (v) {
      if (!v) return "Phone number is required.";
      const digits = v.replace(/[\s\-+]/g, "");
      if (!/^\d{10,15}$/.test(digits)) return "Enter a 10–15 digit phone number.";
      return "";
    },
    "delivery-slot": function (v) {
      if (!v) return "Please pick a delivery slot.";
      return "";
    },
    "delivery-pincode": function (v) {
      if (!v) return "Pincode is required.";
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 100000 || n > 999999) return "Enter a valid 6-digit Indian pincode.";
      return "";
    },
    "first-delivery": function (v) {
      if (!v) return "Pick a delivery date.";
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const chosen = new Date(v);
      if (chosen < today) return "Date cannot be in the past.";
      return "";
    },
    "agree-privacy": function (checked) {
      if (!checked) return "You must agree to the privacy notice to order.";
      return "";
    }
  };

  function validateField(field) {
    const name = field.name;
    if (!validators[name]) return "";
    const value = field.type === "checkbox" ? field.checked : field.value;
    const msg = validators[name](value);
    const errEl = document.getElementById("err-" + name.replace("cust-", "").replace("delivery-", "").replace("first-", "").replace("agree-", "agree"));
    // map name -> error id (the IDs in HTML were short forms)
    const idMap = {
      "cust-name": "err-name",
      "cust-email": "err-email",
      "cust-phone": "err-phone",
      "delivery-slot": "err-slot",
      "delivery-pincode": "err-pincode",
      "first-delivery": "err-date",
      "agree-privacy": "err-agree"
    };
    const target = document.getElementById(idMap[name]);
    if (target) target.textContent = msg;
    field.classList.toggle("invalid", !!msg);
    field.setAttribute("aria-invalid", msg ? "true" : "false");
    return msg;
  }

  if ($form) {
    // validate on blur + input (clear error as user fixes)
    $form.addEventListener("blur", function (e) {
      if (e.target && validators[e.target.name]) {
        validateField(e.target);
        saveCustomer();
      }
    }, true);
    $form.addEventListener("input", function (e) {
      if (e.target && validators[e.target.name]) {
        // re-validate on input only if already showing an error
        if (e.target.classList.contains("invalid")) validateField(e.target);
      }
      saveCustomer();
    });

    // live budget label
    if ($budget) {
      $budget.addEventListener("input", function () {
        if ($budgetVal) $budgetVal.textContent = $budget.value;
        saveCustomer();
      });
    }

    // submit
    $form.addEventListener("submit", function (e) {
      e.preventDefault();
      let firstInvalid = null;
      let hasError = false;

      ["cust-name", "cust-email", "cust-phone", "delivery-slot",
       "delivery-pincode", "first-delivery", "agree-privacy"].forEach(function (name) {
        const field = $form.elements[name];
        if (!field) return;
        const msg = validateField(field);
        if (msg && !firstInvalid) firstInvalid = field;
        if (msg) hasError = true;
      });

      if (hasError) {
        showStatus("Please fix the highlighted fields before placing your order.", "err");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      if (basket.length === 0) {
        showStatus("Your basket is empty. Add at least one product from the table above.", "err");
        return;
      }

      const total = basketTotal();
      const budget = parseInt($budget ? $budget.value : "5000", 10);
      if (total > budget) {
        showStatus("Estimated total \u20B9" + total + " is above your budget cap of \u20B9" + budget + ". Raise the cap or remove items.", "err");
        return;
      }

      // success
      const name = $form.elements["cust-name"].value.trim();
      const slot = $form.elements["delivery-slot"].value;
      const slotLabels = {
        "sat-am": "Saturday 7\u201310 AM",
        "sat-pm": "Saturday 4\u20137 PM",
        "tue-am": "Tuesday 7\u201310 AM",
        "pickup": "Farm pick-up (Saturday)"
      };
      showStatus(
        "Thank you, " + name + ". Order of \u20B9" + total + " confirmed for " +
        (slotLabels[slot] || slot) + ". A receipt has been emailed to you.",
        "ok"
      );

      // clear basket + customer after successful order
      basket = [];
      renderBasket();
      saveBasket();
      $form.reset();
      try { localStorage.removeItem(CUSTOMER_KEY); } catch (e) { /* ignore */ }
      if ($budgetVal && $budget) $budgetVal.textContent = $budget.value || "1500";
    });

    // reset
    $form.addEventListener("reset", function () {
      // clear errors after a tick so the reset values apply first
      setTimeout(function () {
        document.querySelectorAll(".error").forEach(function (el) { el.textContent = ""; });
        document.querySelectorAll(".invalid").forEach(function (el) { el.classList.remove("invalid"); });
        if ($budgetVal && $budget) $budgetVal.textContent = $budget.value;
        showStatus("", "");
      }, 0);
    });
  }

  function showStatus(msg, kind) {
    if (!$status) return;
    $status.textContent = msg;
    $status.className = "form-status" + (kind ? " " + kind : "");
  }

  /* ============================================================
     6.  Mobile nav toggle
     ============================================================ */
  if ($navToggle && $nav) {
    $navToggle.addEventListener("click", function () {
      const open = $nav.classList.toggle("open");
      $navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close nav when a link is tapped
    $nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && window.innerWidth <= 600) {
        $nav.classList.remove("open");
        $navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- tiny escape helpers ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  /* ---------- init on DOMContentLoaded ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderBasket();
    restoreCustomer();
  });
})();
