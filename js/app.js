import { products, dashboardData } from "./catalog.js";
import { APP_CONFIG, IMGS } from "./config.js";
import {
    getProfile,
    getSession,
    saveLead,
    saveOrder,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    supabase,
    supabaseEnabled,
} from "./supabase.js";

const state = {
    category: "Todos",
    query: "",
    cart: [],
    session: null,
    commercialProfile: "publico",
    profileName: "Publico",
    salesChart: null,
};

const els = {
    currentProfileLabel: document.querySelector("#current-profile-label"),
    sessionStatus: document.querySelector("#session-status"),
    categoryFilters: document.querySelector("#category-filters"),
    catalogSummary: document.querySelector("#catalog-summary"),
    catalogContainer: document.querySelector("#catalog-container"),
    searchInput: document.querySelector("#search-input"),
    cartList: document.querySelector("#cart-list"),
    cartTotal: document.querySelector("#cart-total"),
    clearCart: document.querySelector("#clear-cart"),
    orderForm: document.querySelector("#order-form"),
    contactForm: document.querySelector("#contact-form"),
    metricsGrid: document.querySelector("#metrics-grid"),
    pendingOrders: document.querySelector("#pending-orders"),
    authDialog: document.querySelector("#auth-dialog"),
    authFeedback: document.querySelector("#auth-feedback"),
    openAuth: document.querySelector("#open-auth"),
    loginEmail: document.querySelector("#login-email"),
    loginPassword: document.querySelector("#login-password"),
    loginButton: document.querySelector("#login-button"),
    googleButton: document.querySelector("#google-button"),
    signupName: document.querySelector("#signup-name"),
    signupEmail: document.querySelector("#signup-email"),
    signupPassword: document.querySelector("#signup-password"),
    signupProfile: document.querySelector("#signup-profile"),
    signupButton: document.querySelector("#signup-button"),
    mainNav: document.querySelector("#main-nav"),
    mainActions: document.querySelector("#main-actions"),
    mobileSlot3: document.querySelector("#mobile-slot3"),
    mobileAuthAction: document.querySelector("#mobile-auth-action"),
    mobileSearchInput: document.querySelector("#mobile-search-input")
};

function syncMobileNavActive() {
    const nav = document.getElementById("mobile-bottom-nav");
    if (!nav) return;
    const hash = window.location.hash || "#inicio";
    nav.querySelectorAll("[data-nav]").forEach((el) => {
        const target = el.getAttribute("data-nav");
        if (!target) return;
        if (hash === target || hash.startsWith(target)) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
    }).format(value);
}

function setBrandContent() {
    // Safe setters — elements may not exist in every page state
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    const setHref = (sel, val) => { const el = document.querySelector(sel); if (el) el.href = val; };

    set("#brand-phone", APP_CONFIG.contact.phone);
    set("#brand-email", APP_CONFIG.contact.email);
    set("#brand-contact-name", APP_CONFIG.contact.brandName);
    set("#brand-contact-phone span", APP_CONFIG.contact.phone);
    set("#brand-contact-email span", APP_CONFIG.contact.email);
    set("#brand-contact-address span", APP_CONFIG.contact.address);
    setHref("#whatsapp-link", APP_CONFIG.contact.whatsappUrl);

    // Render schedule if container exists
    const hoursEl = document.getElementById("contact-hours");
    if (hoursEl && APP_CONFIG.contact.hours) {
        hoursEl.innerHTML = APP_CONFIG.contact.hours.map(h => `
            <div class="flex justify-between items-center py-2 border-b border-black/10 last:border-0">
                <span class="font-bold text-sm">${h.days}</span>
                <span class="text-brand-berry font-black text-sm">${h.time}</span>
            </div>
        `).join("");
    }
}

function getVisiblePrice(product) {
    if (state.commercialProfile === "mayorista") return product.priceMayorista;
    if (state.commercialProfile === "minorista") return product.priceMinorista;
    return null;
}

function getFilteredProducts() {
    return products.filter((product) => {
        const matchesCategory = state.category === "Todos" || product.category === state.category;
        const text = `${product.name} ${product.description} ${product.category}`.toLowerCase();
        const matchesQuery = text.includes(state.query.toLowerCase());
        return matchesCategory && matchesQuery;
    });
}

function renderCategoryFilters() {
    const categories = ["Todos", ...new Set(products.map((item) => item.category))];
    els.categoryFilters.innerHTML = "";

    categories.forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
            category === state.category
            ? 'bg-brand-berry text-white shadow-[0_4px_14px_rgba(177,48,107,0.35)] scale-105'
            : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-berry/40 hover:text-brand-berry shadow-sm hover:shadow-md'
        }`;
        button.textContent = category;
        button.addEventListener("click", () => {
            state.category = category;
            renderCategoryFilters();
            renderCatalog();
        });
        els.categoryFilters.appendChild(button);
    });
}

function addToCart(productId) {
    const existing = state.cart.find((item) => item.productId === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ productId, quantity: 1 });
    }
    renderCart();
}

function updateCartQuantity(productId, delta) {
    const item = state.cart.find((entry) => entry.productId === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        state.cart = state.cart.filter((entry) => entry.productId !== productId);
    }
    renderCart();
}

function renderCatalog() {
    const categoriesToRender = state.category === "Todos" 
        ? [...new Set(products.map(p => p.category))] 
        : [state.category];

    if (!els.catalogContainer) return;
    els.catalogContainer.innerHTML = "";

    categoriesToRender.forEach(category => {
        const catProducts = products.filter(p => p.category === category && `${p.name} ${p.description}`.toLowerCase().includes(state.query.toLowerCase()));
        if (catProducts.length === 0) return;

        const rowSection = document.createElement("div");
        rowSection.className = "flex flex-col gap-4";
        
        rowSection.innerHTML = `
            <div class="flex items-center gap-4 px-4 md:px-0">
                <h3 class="font-display text-2xl font-black text-black">${category}</h3>
                <div class="h-1 flex-1 bg-brand-wood/10 rounded-full"></div>
            </div>
            <div class="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 px-4 md:px-0 scrollbar-hide" style="scrollbar-width: none;">
                <!-- Cards container -->
            </div>
        `;

        const track = rowSection.querySelector("div:nth-of-type(2)");

        const categoryColors = {
            "Favoritos":        { bg: "#fce4ef", shadow: "rgba(177,48,107,0.15)",  accent: "#b1306b" },
            "Sabores de Agua":  { bg: "#d6edf5", shadow: "rgba(45,102,128,0.15)",  accent: "#2d6680" },
            "Helados de Crema": { bg: "#fde8cc", shadow: "rgba(192,122,62,0.15)",  accent: "#c07a3e" },
            "Licor":            { bg: "#ecdff5", shadow: "rgba(124,79,160,0.15)",  accent: "#7c4fa0" },
        };

        catProducts.forEach(product => {
            const visiblePrice = getVisiblePrice(product);
            const col = categoryColors[product.category] || categoryColors["Favoritos"];
            const article = document.createElement("article");

            // Fotos públicas Unsplash — solo maqueta
            const MOCK_IMGS = {
                1:  "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=300&h=300&fit=crop&auto=format", // paletas mora/vino
                2:  "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop&auto=format", // cono creme
                3:  "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop&auto=format", // scoops rosas — zarzamora
                4:  "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=300&fit=crop&auto=format", // crema dulce — beso de ángel
                5:  "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=300&h=300&fit=crop&auto=format", // cono mango naranja
                6:  "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=300&h=300&fit=crop&auto=format", // scoops coloridos — maracuyá
                7:  "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=300&h=300&fit=crop&auto=format", // limón cítrico
                8:  IMGS.paletaLeche, // guanábana (sin foto propia)
                9:  IMGS.heladoLeche,
                10: IMGS.heladoMazapan,
                11: "https://images.unsplash.com/photo-1608228088998-57828365d486?w=300&h=300&fit=crop&auto=format", // cajeta caramelo
                12: IMGS.heladoMamey,
                13: IMGS.heladoCoco,
                14: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=300&h=300&fit=crop&auto=format", // chocolate oscuro
                15: "https://images.unsplash.com/photo-1600718374662-0483d2b9da44?w=300&h=300&fit=crop&auto=format", // pistache verde
                16: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=300&h=300&fit=crop&auto=format", // tropical piña
                17: "https://images.unsplash.com/photo-1506459225024-1428097a7e18?w=300&h=300&fit=crop&auto=format", // frutos rojos vino
            };
            const imgSrc = MOCK_IMGS[product.id] || IMGS.paletaFresa;

            const priceHtml = visiblePrice === null
                ? `<p class="text-gray-400 text-xs italic font-medium">Inicia sesión para ver precio</p>`
                : `<p class="font-display text-2xl font-black" style="color:${col.accent}">${formatCurrency(visiblePrice)}</p>`;

            article.className = "snap-center shrink-0 w-56 flex flex-col items-center cursor-pointer group";
            article.innerHTML = `
                <!-- Imagen en círculo flotante -->
                <div class="relative z-10 w-36 h-36 rounded-full bg-white flex items-center justify-center
                            overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.12)] border-4 border-white
                            group-hover:-translate-y-2 transition-transform duration-300">
                    <img src="${imgSrc}" alt="${product.name}"
                         class="w-full h-full object-cover pointer-events-none">
                </div>
                <!-- Card body pastel -->
                <div class="w-full rounded-3xl -mt-14 pt-16 pb-7 px-5 text-center flex flex-col items-center gap-3
                            transition-all duration-300 group-hover:-translate-y-1"
                     style="background:${col.bg}; box-shadow: 0 8px 24px ${col.shadow}">
                    <h4 class="font-display text-lg font-black uppercase tracking-wide leading-tight"
                        style="color:${col.accent}">${product.name}</h4>
                    <div class="flex gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full opacity-40" style="background:${col.accent}"></span>
                        <span class="w-1.5 h-1.5 rounded-full opacity-70" style="background:${col.accent}"></span>
                        <span class="w-1.5 h-1.5 rounded-full opacity-40" style="background:${col.accent}"></span>
                    </div>
                    <p class="text-gray-500 text-xs font-medium leading-relaxed line-clamp-3">${product.description}</p>
                    ${priceHtml}
                    <button type="button"
                            class="mt-1 w-10 h-10 bg-white rounded-full flex items-center justify-center
                                   shadow-md hover:scale-110 active:scale-95 transition-transform"
                            style="color:${col.accent}" aria-label="Agregar al carrito">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="2.5"
                             stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            `;

            article.querySelector("button").addEventListener("click", (e) => {
                e.stopPropagation();
                addToCart(product.id);
            });
            article.addEventListener("click", () => openProductModal(product));
            track.appendChild(article);
        });

        els.catalogContainer.appendChild(rowSection);
    });
}

function openProductModal(product) {
    const modal = document.getElementById("product-modal");
    if (!modal) return;

    const MOCK_IMGS_MODAL = {
        1:  "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=400&fit=crop&auto=format",
        2:  "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=400&fit=crop&auto=format",
        3:  "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop&auto=format",
        4:  "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop&auto=format",
        5:  "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=400&fit=crop&auto=format",
        6:  "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=400&fit=crop&auto=format",
        7:  "https://images.unsplash.com/photo-1629385701021-fec4e4f73f87?w=400&h=400&fit=crop&auto=format",
        8:  "https://images.unsplash.com/photo-1519735777090-ec97162dc266?w=400&h=400&fit=crop&auto=format",
        9:  IMGS.heladoLeche,
        10: IMGS.heladoMazapan,
        11: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop&auto=format",
        12: IMGS.heladoMamey,
        13: IMGS.heladoCoco,
        14: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=400&h=400&fit=crop&auto=format",
        15: "https://images.unsplash.com/photo-1600718374662-0483d2b9da44?w=400&h=400&fit=crop&auto=format",
        16: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=400&fit=crop&auto=format",
        17: "https://images.unsplash.com/photo-1506459225024-1428097a7e18?w=400&h=400&fit=crop&auto=format",
    };
    const imgSrc = MOCK_IMGS_MODAL[product.id] || IMGS.paletaFresa;

    document.getElementById("modal-product-img").src = imgSrc;
    document.getElementById("modal-product-img").alt = product.name;

    // Watermark superpuesto sobre la foto del modal
    const modalImgWrapper = document.getElementById("modal-img-wrapper");
    const existingWM = modalImgWrapper.querySelector(".modal-watermark");
    if (existingWM) existingWM.remove();
    const wm = document.createElement("img");
    wm.src = IMGS.logo;
    wm.className = "modal-watermark absolute bottom-3 right-3 w-14 h-14 rounded-full opacity-70 border-2 border-white shadow-lg pointer-events-none select-none";
    wm.setAttribute("aria-hidden", "true");
    modalImgWrapper.appendChild(wm);
    document.getElementById("modal-product-category").textContent = product.category;
    document.getElementById("modal-product-name").textContent = product.name;
    document.getElementById("modal-product-desc").textContent = product.description;
    document.getElementById("modal-product-unit").textContent = product.unit;

    const visiblePrice = getVisiblePrice(product);
    const priceEl = document.getElementById("modal-product-price");
    const priceLabelEl = document.getElementById("modal-price-label");
    if (visiblePrice === null) {
        priceEl.textContent = "Inicia sesión";
        priceLabelEl.textContent = "Precio";
        priceEl.className = "font-display text-2xl font-black text-gray-400 italic";
    } else {
        priceEl.textContent = formatCurrency(visiblePrice);
        priceLabelEl.textContent = `Precio ${state.commercialProfile}`;
        priceEl.className = "font-display text-4xl font-black text-brand-berry";
    }

    // Wire the add to cart button with the current product
    const addBtn = document.getElementById("modal-add-cart");
    const newBtn = addBtn.cloneNode(true); // remove old listeners
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    newBtn.addEventListener("click", () => {
        addToCart(product.id);
        modal.close();
    });

    modal.showModal();
}

    // Galeria removed

function renderCart() {
    els.cartList.innerHTML = "";
    if (state.cart.length === 0) {
        els.cartList.innerHTML = `<p class="text-brand-wood-soft text-sm italic py-4">Todavía no agregas productos. Usa el catálogo para armar tu carrito.</p>`;
        els.cartTotal.textContent = formatCurrency(0);
        return;
    }

    let total = 0;
    state.cart.forEach((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const unitPrice = getVisiblePrice(product) ?? product.priceMinorista;
        total += unitPrice * item.quantity;

        const row = document.createElement("div");
        row.className = "flex justify-between items-center py-3 border-b border-brand-wood/10 last:border-0";
        row.innerHTML = `
            <div>
                <strong class="font-bold text-brand-wood text-sm">${product.name}</strong>
                <p class="text-brand-wood-soft text-sm mt-0.5">${formatCurrency(unitPrice)} x ${item.quantity}</p>
            </div>
            <div class="flex items-center gap-2.5 bg-brand-wood/5 rounded-full px-2 py-1">
                <button type="button" aria-label="Quitar uno" class="w-7 h-7 flex items-center justify-center bg-white rounded-full font-bold shadow-sm hover:scale-110 hover:text-brand-berry transition-transform text-brand-wood">−</button>
                <span class="font-bold text-sm leading-none w-5 text-center text-brand-wood">${item.quantity}</span>
                <button type="button" aria-label="Agregar uno" class="w-7 h-7 flex items-center justify-center bg-white rounded-full font-bold shadow-sm hover:scale-110 hover:text-brand-berry transition-transform text-brand-wood">+</button>
            </div>
        `;

        const buttons = row.querySelectorAll("button");
        buttons[0].addEventListener("click", () => updateCartQuantity(item.productId, -1));
        buttons[1].addEventListener("click", () => updateCartQuantity(item.productId, 1));
        els.cartList.appendChild(row);
    });

    els.cartTotal.textContent = formatCurrency(total);
    renderNavigation(); // Update the cart bubble count on mobile
}

function renderNavigation() {
    const isGuest = state.commercialProfile === "publico";
    const isWholesale = state.commercialProfile === "mayorista" || state.commercialProfile === "minorista";
    const isAdmin = state.commercialProfile === "admin";
    const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    // Desktop Nav
    if (isGuest) {
        els.mainActions.innerHTML = `<button id="open-auth" class="btn-primary !py-2 !px-5 text-sm">Entrar</button>`;
        document.getElementById("open-auth")?.addEventListener("click", () => els.authDialog.showModal());
    } else {
        els.mainActions.innerHTML = `
            ${isWholesale ? `<a href="#pedidos" class="btn-secondary !py-2 !px-5 text-sm flex items-center gap-2"><i data-lucide="shopping-cart" class="w-4 h-4"></i> Carrito</a>` : ""}
            ${isAdmin ? `<a href="#admin" class="btn-secondary !py-2 !px-5 text-sm flex items-center gap-2"><i data-lucide="bar-chart-2" class="w-4 h-4"></i> Panel Admin</a>` : ""}
            <button id="logout-btn" class="bg-gray-100 border-2 border-black px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-black hover:text-white transition-colors">
                <i data-lucide="user" class="w-4 h-4"></i> ${state.profileName.split(" ")[0]}
            </button>
        `;
        document.getElementById("logout-btn")?.addEventListener("click", () => {
             if (supabaseEnabled && supabase) supabase.auth.signOut();
             else setSession("publico");
        });
    }

    if (els.mobileSlot3) {
        if (isAdmin) {
            els.mobileSlot3.href = "#admin";
            els.mobileSlot3.setAttribute("data-nav", "#admin");
            els.mobileSlot3.setAttribute("aria-label", "Admin");
            els.mobileSlot3.innerHTML = `
                <span class="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
                    <i data-lucide="bar-chart-2" class="w-5 h-5 text-brand-berry"></i>
                </span>
                <span class="text-[10px] font-black tracking-wide text-brand-wood/80">Admin</span>
                <span class="mobile-nav-dot bg-brand-berry"></span>
            `;
        } else if (isWholesale) {
            els.mobileSlot3.href = "#pedidos";
            els.mobileSlot3.setAttribute("data-nav", "#pedidos");
            els.mobileSlot3.setAttribute("aria-label", "Carrito");
            els.mobileSlot3.innerHTML = `
                <span class="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
                    <i data-lucide="shopping-cart" class="w-5 h-5 text-brand-berry"></i>
                    ${cartCount > 0 ? `<span class="absolute -top-1 -right-1 bg-brand-berry text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black shadow-sm">${cartCount}</span>` : ""}
                </span>
                <span class="text-[10px] font-black tracking-wide text-brand-wood/80">Carrito</span>
                <span class="mobile-nav-dot bg-brand-berry"></span>
            `;
        } else {
            els.mobileSlot3.href = "#novedades";
            els.mobileSlot3.setAttribute("data-nav", "#novedades");
            els.mobileSlot3.setAttribute("aria-label", "Novedades");
            els.mobileSlot3.innerHTML = `
                <span class="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
                    <i data-lucide="sparkles" class="w-5 h-5 text-brand-berry-soft"></i>
                </span>
                <span class="text-[10px] font-black tracking-wide text-brand-wood/80">Novedades</span>
                <span class="mobile-nav-dot bg-brand-berry-soft"></span>
            `;
        }
    }

    if (els.mobileAuthAction) {
        const btn = els.mobileAuthAction;
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        els.mobileAuthAction = newBtn;

        if (isGuest) {
            els.mobileAuthAction.setAttribute("aria-label", "Entrar");
            els.mobileAuthAction.innerHTML = `
                <span class="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
                    <i data-lucide="user-circle" class="w-5 h-5 text-gray-500"></i>
                </span>
                <span class="text-[10px] font-black tracking-wide text-brand-wood/80">Entrar</span>
                <span class="mobile-nav-dot bg-gray-400"></span>
            `;
            els.mobileAuthAction.addEventListener("click", () => els.authDialog.showModal());
        } else {
            els.mobileAuthAction.setAttribute("aria-label", "Salir");
            els.mobileAuthAction.innerHTML = `
                <span class="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-sm border border-black/5">
                    <i data-lucide="log-out" class="w-5 h-5 text-brand-wood"></i>
                </span>
                <span class="text-[10px] font-black tracking-wide text-brand-wood/80">Salir</span>
                <span class="mobile-nav-dot bg-brand-wood-soft"></span>
            `;
            els.mobileAuthAction.addEventListener("click", () => {
                if (supabaseEnabled && supabase) supabase.auth.signOut();
                else setSession("publico");
            });
        }
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }

    syncMobileNavActive();
}

function renderMetrics() {
    els.metricsGrid.innerHTML = "";
    dashboardData.metrics.forEach((metric) => {
        const card = document.createElement("article");
        card.className = "bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0px_var(--color-brand-berry)] transition-all";
        card.innerHTML = `
            <div class="text-black text-xs font-black tracking-widest uppercase">${metric.label}</div>
            <div class="font-display text-4xl font-black text-black my-2 leading-none">${metric.value}</div>
            <div class="text-gray-600 text-xs font-bold">${metric.note}</div>
        `;
        els.metricsGrid.appendChild(card);
    });
}

function renderPendingOrders() {
    els.pendingOrders.innerHTML = "";
    dashboardData.pendingOrders.forEach((order) => {
        const item = document.createElement("div");
        item.className = "flex justify-between items-center p-3 hover:bg-brand-wood/5 rounded-xl transition-colors";
        item.innerHTML = `
            <div>
                <strong class="font-bold text-brand-wood text-sm">${order.customer}</strong>
                <p class="text-brand-wood-soft text-xs mt-1 flex items-center"><i data-lucide="clock" class="w-3 h-3 inline mr-1"></i>${order.time} · <span class="bg-brand-coral/10 text-brand-coral px-2 ml-1 rounded-full text-[10px] uppercase font-bold tracking-wide">${order.status}</span></p>
            </div>
            <strong class="font-display text-lg text-brand-wood">${order.total}</strong>
        `;
        els.pendingOrders.appendChild(item);
    });
}

function renderChart() {
    const chartCanvas = document.querySelector("#sales-chart");
    if (state.salesChart) {
        state.salesChart.destroy();
    }

    state.salesChart = new window.Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: dashboardData.chartLabels,
            datasets: [{
                label: "Ventas semanales",
                data: dashboardData.chartValues,
                borderRadius: 12,
                backgroundColor: ["#b1306b", "#d65a87", "#2d6680", "#926540"],
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.parsed.y),
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: "#5b3822",
                        font: {
                            weight: "700",
                        },
                    },
                    grid: {
                        display: false,
                    },
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#7f5a40",
                        callback: (value) => `$${value / 1000}k`,
                    },
                    grid: {
                        color: "rgba(91, 56, 34, 0.09)",
                    },
                },
            },
        },
    });
}

function renderMap() {
    const mapEl = document.getElementById("contact-map");
    if (!mapEl || !window.L) return;

    // Huasca de Ocampo, Hidalgo
    const lat = 20.2003;
    const lng = -98.5695;

    const map = window.L.map("contact-map").setView([lat, lng], 15);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href='https://openstreetmap.org'>OpenStreetMap</a>",
    }).addTo(map);

    const icon = window.L.divIcon({
        className: "",
        html: `<div style="background:#b1306b;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #b1306b;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });

    window.L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong style="font-family:sans-serif">La Artesanal</strong><br>Huasca de Ocampo, Hidalgo`)
        .openPopup();
}

function setFeedback(message, isError = false) {
    els.authFeedback.textContent = message;
    els.authFeedback.style.color = isError ? "#8d1f1f" : "rgba(53, 33, 22, 0.84)";
}

function setSession(profile, userName = "Cliente") {
    state.commercialProfile = profile;
    state.profileName = userName;
    els.currentProfileLabel.textContent = profile === "publico" ? "Publico" : `${userName} · ${profile}`;
    renderCatalog();
    renderCart();
    renderNavigation();
}

async function bootstrapSession() {
    if (!supabaseEnabled) {
        els.sessionStatus.textContent = "Modo demo con datos semilla";
        setSession("publico");
        return;
    }

    const { data } = await getSession();
    state.session = data.session;
    if (!data.session) {
        els.sessionStatus.textContent = "Sin sesion activa";
        setSession("publico");
        return;
    }

    const { data: profile } = await getProfile(data.session.user.id);
    const commercialProfile = profile?.commercial_profile ?? "minorista";
    const displayName = profile?.full_name || data.session.user.email;
    els.sessionStatus.textContent = "Sesion activa con Supabase";
    setSession(commercialProfile, displayName);
}

async function handleLogin() {
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value.trim();
    if (!email || !password) {
        setFeedback("Completa correo y contrasena.", true);
        return;
    }

    const { error } = await signInWithPassword(email, password);
    if (error) {
        setFeedback(error.message, true);
        return;
    }

    setFeedback("Sesion iniciada correctamente.");
    els.authDialog.close();
    await bootstrapSession();
}

async function handleSignup() {
    const email = els.signupEmail.value.trim();
    const password = els.signupPassword.value.trim();
    const name = els.signupName.value.trim();
    const commercialProfile = els.signupProfile.value;

    if (!email || !password || !name) {
        setFeedback("Completa nombre, correo y contrasena.", true);
        return;
    }

    const { error } = await signUpWithPassword(email, password, {
        full_name: name,
        commercial_profile: commercialProfile,
        role: "cliente",
    });

    if (error) {
        setFeedback(error.message, true);
        return;
    }

    setFeedback("Cuenta creada. Revisa tu correo si Supabase pide confirmacion.");
}

async function handleGoogleLogin() {
    const { error } = await signInWithGoogle();
    if (error) setFeedback(error.message, true);
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    const formData = new FormData(els.orderForm);
    const commercialProfile = formData.get("commercial_profile");
    const items = state.cart.map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const unitPrice = commercialProfile === "mayorista" ? product.priceMayorista : product.priceMinorista;
        return {
            product_id: product.id,
            product_name: product.name,
            quantity: item.quantity,
            unit_price: unitPrice,
        };
    });

    const payload = {
        customer_name: formData.get("customer_name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        commercial_profile: commercialProfile,
        notes: formData.get("notes"),
        items,
        status: "nuevo",
    };

    const { error } = await saveOrder(payload);
    if (error) {
        alert(`No se pudo guardar el pedido: ${error.message}`);
        return;
    }

    alert("Solicitud enviada. Puedes conectar este flujo a la tabla wholesale_orders en Supabase.");
    els.orderForm.reset();
    state.cart = [];
    renderCart();
}

async function handleContactSubmit(event) {
    event.preventDefault();
    const formData = new FormData(els.contactForm);
    const payload = {
        name: formData.get("name"),
        business_name: formData.get("business_name"),
        email: formData.get("email"),
        message: formData.get("message"),
        source: "web-contact",
    };

    const { error } = await saveLead(payload);
    if (error) {
        alert(`No se pudo guardar el mensaje: ${error.message}`);
        return;
    }

    alert("Mensaje recibido. Puedes conectar este flujo al correo comercial desde Supabase o Cloudflare Worker.");
    els.contactForm.reset();
}

function attachEvents() {
    const handleSearch = (event) => {
        state.query = event.target.value;
        renderCatalog();
    };
    els.searchInput?.addEventListener("input", handleSearch);
    els.mobileSearchInput?.addEventListener("input", handleSearch);

    // Product modal close
    document.getElementById("close-product-modal")?.addEventListener("click", () => {
        document.getElementById("product-modal")?.close();
    });
    document.getElementById("product-modal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) e.currentTarget.close(); // close on backdrop click
    });

    els.clearCart.addEventListener("click", () => {
        state.cart = [];
        renderCart();
    });

    els.orderForm.addEventListener("submit", handleOrderSubmit);
    els.contactForm.addEventListener("submit", handleContactSubmit);
    
    // Auth modals & basic handlers
    if(els.openAuth) els.openAuth.addEventListener("click", () => els.authDialog.showModal());
    
    els.loginButton.addEventListener("click", handleLogin);
    els.signupButton.addEventListener("click", handleSignup);
    els.googleButton.addEventListener("click", handleGoogleLogin);

    // Mobile nav toggle
    const mobileToggle = document.getElementById("mobile-toggle");
    const mainNav = document.getElementById("main-nav");
    if (mobileToggle && mainNav) {
        mobileToggle.addEventListener("click", () => {
            mainNav.classList.toggle("collapsed");
        });
        
        mainNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mainNav.classList.add("collapsed");
            });
        });
    }

    window.addEventListener("hashchange", syncMobileNavActive);
}

function renderAll() {
    setBrandContent();
    renderCategoryFilters();
    renderCatalog();
    renderCart();
    renderMap();
    attachEvents();
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

renderAll();
bootstrapSession();

if (supabase) {
    supabase.auth.onAuthStateChange(() => {
        bootstrapSession();
    });
}
