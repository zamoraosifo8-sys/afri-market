import { useEffect, useState } from "react";




import CustomerProfile from "./CustomerProfile";
import CustomerRegister from "./CustomerRegister";
import CustomerLogin from "./CustomerLogin";
import Admin from "./Admin";
import AdminLogin from "./AdminLogin";
import Notifications from "./Notifications";
import ProductCard from "./components/ProductCard";
import ProductDetails from "./ProductDetails";
import Cart from "./Cart";
import Checkout from "./Checkout";
import CustomerChat from "./CustomerChat";
import SellerRegister from "./SellerRegister";
import SellerLogin from "./SellerLogin";
import SellerProfile from "./SellerProfile";
import SellerAddProduct from "./SellerAddProduct";
import SellerEditProduct from "./SellerEditProduct";
import SellerDeleteProduct from "./SellerDeleteProduct";
import SellerDashboard from "./SellerDashboard";
import SellerProducts from "./SellerProducts";

const ORDER_HISTORY_KEY = "afriMarketOrderHistory";
const NOTIFICATIONS_KEY = "afriMarketNotifications";

function readSavedOrders() {
  try {
    const savedOrders = localStorage.getItem(ORDER_HISTORY_KEY);
    return savedOrders ? JSON.parse(savedOrders) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  try {
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orders));
  } catch {
    // The app can still display the current session if storage is unavailable.
  }
}

function SellerArea({ onRegister, onLogin }) {
  return (
    <section className="seller-area">
      <div className="container">
        <h2>Become a Seller</h2>
        <div className="seller-area-actions">
          <button type="button" onClick={onRegister}>Sign Up</button>
          <button type="button" onClick={onLogin}>Login</button>
        </div>
      </div>
    </section>
  );
}
function App() {
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showShopParent, setShowShopParent] = useState(false);
  const [showBrowseProducts, setShowBrowseProducts] = useState(false);
  const [showCustomerAccount, setShowCustomerAccount] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [showCustomerRegister, setShowCustomerRegister] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSellerRegister, setShowSellerRegister] = useState(false);
  const [showSellerArea, setShowSellerArea] = useState(false);
  const [showSellerLogin, setShowSellerLogin] = useState(false);
  const [showSellerProfile, setShowSellerProfile] = useState(false);
  const [showSellerDashboard, setShowSellerDashboard] = useState(false);
  const [showSellerAddProduct, setShowSellerAddProduct] = useState(false);
  const [showSellerEditProduct, setShowSellerEditProduct] = useState(false);
  const [showSellerDeleteProduct, setShowSellerDeleteProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailsSource, setProductDetailsSource] = useState(null);
    const [cartItems, setCartItems] = useState(() => {
    try {
      const reference = new URLSearchParams(window.location.search).get("reference");
      const pendingOrder = JSON.parse(
        localStorage.getItem("afriMarketPendingOrder") || "null"
      );

      if (
        pendingOrder?.reference === reference &&
        Array.isArray(pendingOrder.items)
      ) {
        return pendingOrder.items;
      }

      const savedCart = JSON.parse(
        localStorage.getItem("afriMarketCart") || "[]"
      );
      return Array.isArray(savedCart) ? savedCart : [];
    } catch {
      return [];
    }
  });

  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const savedWishlist = JSON.parse(
        localStorage.getItem("afriMarketWishlist") || "[]"
      );
      return Array.isArray(savedWishlist) ? savedWishlist : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("afriMarketCart", JSON.stringify(cartItems));
      localStorage.setItem("afriMarketWishlist", JSON.stringify(wishlistItems));
    } catch {
      // Ignore browser storage errors.
    }
  }, [cartItems, wishlistItems]);
  const [orderHistory, setOrderHistory] = useState(readSavedOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showHomeSearch, setShowHomeSearch] = useState(false);
  const [homeDashboardView, setHomeDashboardView] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);

useEffect(() => {
  fetch("/api/store/products")
    .then((response) => response.json())
    .then((data) => {
      if (data.status) {
        setSellerProducts(data.products);
      }
    })
    .catch((error) => {
      console.error("Could not load shop products:", error);
    });
}, []);

useEffect(() => {
  const token = localStorage.getItem("afriMarketCustomerToken");

  if (!token) {
    return;
  }

  fetch("/api/orders/mine", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(async (response) => {
      const data = await response.json();

      if (!response.ok || !data.status) {
        return;
      }

      setOrderHistory((currentOrders) => {
        const existingReferences = new Set(
          currentOrders.map((order) => order.reference)
        );

        const newOrders = data.orders.filter(
          (order) => !existingReferences.has(order.reference)
        );

        const combinedOrders = [...currentOrders, ...newOrders];
        saveOrders(combinedOrders);
        return combinedOrders;
      });
    })
    .catch((error) => {
      console.error("Could not load saved orders:", error);
    });
}, []);
  function showMainShop() {
    setShowCart(false);
    setShowWishlist(false);
    setShowOrderHistory(false);
    setShowCheckout(false);
  }

  function addToCart(product) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.name === product.name
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.name === product.name
            ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
            : item
        );
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });
  }

  function addToWishlist(product) {
    setWishlistItems((currentItems) => {
      const alreadySaved = currentItems.some(
        (item) => item.name === product.name
      );

      return alreadySaved ? currentItems : [...currentItems, product];
    });
  }

  function removeFromWishlist(productName) {
    setWishlistItems((currentItems) =>
      currentItems.filter((item) => item.name !== productName)
    );
  }

  function removeFromCart(index) {
    setCartItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function increaseQuantity(index) {
    setCartItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
          : item
      )
    );
  }

  function decreaseQuantity(index) {
    setCartItems((currentItems) =>
      currentItems
        .map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, quantity: (Number(item.quantity) || 0) - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function updateOrderHistory(update) {
    setOrderHistory((currentOrders) => {
      const updatedOrders =
        typeof update === "function" ? update(currentOrders) : update;

      saveOrders(updatedOrders);
      return updatedOrders;
    });
  }

  const products = [
    {
      name: "Premium Ankara Fabric",
      category: "Fashion",
      price: 35000,
      description:
        "Beautiful African Ankara fabric with vibrant patterns, perfect for clothing and accessories.",
      popular: true,
      image:
        "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Roasted Nigerian Peanuts",
      category: "Food & Snacks",
      price: 12000,
      description:
        "Delicious roasted Nigerian peanuts, perfect as an authentic African snack.",
      popular: true,
      image:
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Natural Shea Butter",
      category: "Beauty",
      price: 18000,
      description:
        "Natural African shea butter that helps moisturize and nourish the skin.",
      popular: true,
      image:
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Handmade Leather Bag",
      category: "Arts & Crafts",
      price: 6500,
      description:
        "Handcrafted African leather bag made with quality materials and timeless style.",
      popular: true,
      image:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const filteredProducts = [...products, ...sellerProducts].filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  async function handleContactSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = form
    .querySelector('input[placeholder="Your Name"]')
    .value.trim();
  const email = form
    .querySelector('input[placeholder="Your Email"]')
    .value.trim();
  const message = form
    .querySelector('textarea[placeholder="Your Message"]')
    .value.trim();

  try {
    const response = await fetch(
      "/api/support/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Could not send your message.");
    }

    alert("Your message has been sent successfully!");
    form.reset();
  } catch (error) {
    alert(error.message || "Could not connect to AfriMarket.");
  }
}

  async function handlePaymentSuccess(reference) {
  let pendingOrder = null;

  try {
    pendingOrder = JSON.parse(
      localStorage.getItem("afriMarketPendingOrder") || "null"
    );
  } catch {
    alert("I couldn't read the saved checkout details. Please don't pay again.");
    return false;
  }

  if (
    !pendingOrder ||
    pendingOrder.reference !== reference ||
    !Array.isArray(pendingOrder.items)
  ) {
   const alreadySaved = readSavedOrders().some(
  (order) => order.reference === reference
);

if (alreadySaved) {
  setShowCheckout(false);
  setShowOrderHistory(true);
  return true;
}
    alert("I couldn't find this checkout's saved details. Please don't pay again.");
    return false;
  }

  const items = pendingOrder.items;
  const deliveryInfo = pendingOrder.deliveryInfo || null;

  try {
    const response = await fetch("/api/orders/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference,
        items,
        deliveryInfo,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Could not save the order.");
    }
  } catch (error) {
    console.error("Order database save error:", error);
    alert(
      "Payment succeeded, but the order could not be saved yet. Please don't pay again. Tell me this message."
    );
    return false;
  }

  const total = items.reduce((sum, item) => {
    const price =
      typeof item.price === "number"
        ? item.price
        : parseFloat(String(item.price).replace(/[₦$,]/g, "").trim()) || 0;

    return sum + price * (Number(item.quantity) || 0);
  }, 0);

  const newOrder = {
    id: Date.now(),
    reference,
    items,
    deliveryInfo,
    total,
    status: "Paid",
    trackingStatus: "Paid",
    date: new Date().toLocaleString(),
  };

  updateOrderHistory((currentOrders) =>
    currentOrders.some((order) => order.reference === reference)
      ? currentOrders
      : [...currentOrders, newOrder]
  );

  try {
    const savedNotifications = JSON.parse(
      localStorage.getItem(NOTIFICATIONS_KEY) || "[]"
    );

    if (!savedNotifications.some((item) => item.reference === reference)) {
      savedNotifications.push({
        id: Date.now().toString(),
        reference,
        message: `Payment successful for order ${reference}.`,
        date: new Date().toLocaleString(),
      });

      localStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(savedNotifications)
      );
    }
  } catch {
    // The saved order does not depend on browser notifications.
  }

  localStorage.removeItem("afriMarketPendingOrder");
  setCartItems([]);
  setShowCheckout(false);
  setShowOrderHistory(true);
  return true;
}

  const trackingStages = [
    "Paid",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];

  return (
    <>
      <div>
        <header className="header">
          <div className="container header-inner">
            <div className="logo" aria-label="AfriMarket">AfriMarket</div>

            <div className="header-actions">
              <button
                type="button"
                aria-label="Search"
                title="Search"
                onClick={() => {
                  setShowHomeSearch(true);
                  setHomeDashboardView(null);
                  setShowCart(false);
                  setShowWishlist(false);
                  setShowCustomerAccount(false);
                  setShowCustomerLogin(false);
                  setShowCustomerRegister(false);
                  setShowCheckout(false);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
              </button>

              <button
                type="button"
                aria-label="Account"
                title="Account"
                onClick={() => {
                  setShowCustomerAccount(true);
                  setShowCustomerLogin(false);
                  setShowCustomerRegister(false);
                  setShowCart(false);
                  setShowWishlist(false);
                  setShowCheckout(false);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"></path></svg>
              </button>

              <button
                type="button"
                aria-label="Wishlist"
                title="Wishlist"
                onClick={() => {
                  setShowWishlist(true);
                  setShowCart(false);
                  setShowCustomerAccount(false);
                  setShowCustomerLogin(false);
                  setShowCustomerRegister(false);
                  setShowCheckout(false);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"></path></svg>
              </button>

              <button
                type="button"
                aria-label="Cart"
                title="Cart"
                onClick={() => {
                  setShowCart(true);
                  setShowWishlist(false);
                  setShowCustomerAccount(false);
                  setShowCustomerLogin(false);
                  setShowCustomerRegister(false);
                  setShowCheckout(false);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 12h10l3-9H6"></path><circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle></svg>
              </button>

              <button
                type="button"
                className="mobile-menu-button"
                aria-label="Open menu"
                title="Menu"
                onClick={() => setShowMobileMenu((open) => !open)}
              >
                &#9776;
              </button>
            </div>

            {showMobileMenu && (
              <div className="mobile-menu">
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowShopParent(false);
                    setShowCustomerAccount(false);
                    setShowSellerArea(false);
                    setShowBrowseProducts(false);
                    setShowHomeSearch(false);
                    setHomeDashboardView(null);
                    setSelectedProduct(null);
                  }}
                >
                  Home
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowShopParent(true);
                    setShowCustomerAccount(false);
                    setShowSellerArea(false);
                  }}
                >
                  Shop
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowSellerArea(true);
                    setShowShopParent(false);
                    setShowCustomerAccount(false);
                  }}
                >
                  Become a Seller
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setSelectedProduct(null);
                    setProductDetailsSource(null);
                    setHomeDashboardView("contact");
                  }}
                >
                  Contact Us
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setSelectedProduct(null);
                    setProductDetailsSource(null);
                    setHomeDashboardView("help");
                  }}
                >
                  FAQ &amp; Help
                </button>
              </div>
            )}
          </div>
        </header>

        <main>
          {showHomeSearch ? (
            <section className="home-search-page">
              <div className="container">
                <h1>Search AfriMarket</h1>
                <div className="home-search-form">
                  <div className="search-input-wrapper">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search for products..."
                    aria-label="Search products"
                    autoFocus
                  />

                  {searchTerm.trim() && (
                    <div className="search-suggestions">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 5).map((product) => (
                          <button
                            key={product.name}
                            type="button"
                            className="search-suggestion"
                            onClick={() => {
                              setProductDetailsSource("home-search");
                              setSelectedProduct(product);
                              setSearchTerm("");
                            }}
                          >
                            <span>{product.name}</span>
                            <span>
                              {"\u20A6"}{Number(product.price || 0).toLocaleString()}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="search-no-suggestions">
                          No products found.
                        </p>
                      )}
                    </div>
                  )}

                  </div>
                  <button
                    type="button"
                    onClick={() => setHomeDashboardView("search")}
                  >
                    Search
                  </button>
                </div>

                {homeDashboardView === "search" && (
                  <>
                    <h2>Search Results</h2>
                    {filteredProducts.length > 0 ? (
                      <div className="product-grid">
                        {filteredProducts.map((product) => (
                          <ProductCard
                            key={product.name}
                            name={product.name}
                            price={product.price}
                            image={product.image}
                            onViewDetails={() => {
                              setProductDetailsSource("home-search");
                              setSelectedProduct(product);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p>No products found. Try another search.</p>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowHomeSearch(false);
                    setHomeDashboardView(null);
                    setSearchTerm("");
                  }}
                >
                  &#128281; Back
                </button>
              </div>
            </section>
          ) : showBrowseProducts ? (
            <section className="browse-products-page">
              <div className="container">
                <h1>Browse Products</h1>
                <p>Choose from products available on AfriMarket.</p>
                <div className="product-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.name}
                      name={product.name}
                      price={product.price}
                      image={product.image}
                      onViewDetails={() => { setProductDetailsSource("browse"); setShowShopParent(false); setShowBrowseProducts(false); setSelectedProduct(product); }}
                    />
                  ))}
                </div>
                <button type="button" onClick={() => setShowBrowseProducts(false)}>
                  Back
                </button>
              </div>
            </section>
          ) : showShopParent ? (
            <section className="shop-parent-page">
              <div className="container">
                <h1>Shop</h1>
                <p>Explore products available on AfriMarket.</p>
                <button type="button" onClick={() => setShowBrowseProducts(true)}>
                  Browse Products
                </button>
                <button type="button" onClick={() => setShowShopParent(false)}>
                  Back
                </button>
              </div>
            </section>
          ) : showOrderHistory ? (
            <section className="order-history-page">
              <div className="container">
                <h1>Order History</h1>
                <button type="button" onClick={showMainShop}>
                  Continue Shopping
                </button>

                {orderHistory.length === 0 ? (
                  <p>No orders yet.</p>
                ) : (
                  orderHistory.map((order) => {
                    const currentStatus =
                      order.trackingStatus || order.status || "Paid";
                    const currentStage = trackingStages.indexOf(currentStatus);

                    return (
                      <article key={order.id}>
                        <p>
                          <strong>Order Reference:</strong> {order.reference}
                        </p>

                        <p><strong>Items:</strong></p>
                        <ul>
                          {(order.items || []).map((item, index) => (
                            <li key={`${item.name}-${index}`}>
                              {item.name} × {item.quantity}
                            </li>
                          ))}
                        </ul>
{order.deliveryInfo && (
  <div>
    <p><strong>Delivery name:</strong> {order.deliveryInfo.fullName}</p>
    <p><strong>Email:</strong> {order.deliveryInfo.email}</p>
    <p><strong>Address:</strong> {order.deliveryInfo.address}</p>
    <p><strong>City:</strong> {order.deliveryInfo.city}</p>
    <p><strong>Country:</strong> {order.deliveryInfo.country}</p>
  </div>
)}

                        <p>
                          <strong>Total:</strong>{" "}
                          ₦{Number(order.total || 0).toLocaleString()}
                        </p>
                        <p><strong>Status:</strong> {order.status}</p>
                        <p><strong>Tracking:</strong> {currentStatus}</p>

                        <div>
                          <strong>Tracking Progress:</strong>
                          {trackingStages.map((stage, index) => (
                            <p key={stage}>
                              {currentStage >= index ? "✅" : "⬜"} {stage}
                            </p>
                          ))}
                        </div>

                        {currentStatus !== "Cancelled" && (
  <>
    <label>
      Update Tracking Status:{" "}
      <select
        value={currentStatus}
       onChange={async (event) => {
  const newStatus = event.target.value;
  const token =
    localStorage.getItem("afriMarketCustomerToken") ||
    localStorage.getItem("afriMarketAdminToken");

  try {
    const response = await fetch(
      `/api/orders/${encodeURIComponent(order.reference)}/tracking`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trackingStatus: newStatus }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Could not save tracking status.");
    }

    updateOrderHistory((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.reference === order.reference
          ? {
              ...currentOrder,
              trackingStatus: newStatus,
              status: newStatus,
            }
          : currentOrder
      )
    );
  } catch (error) {
    alert(error.message || "Could not save tracking status.");
  }
}}
      >
        {trackingStages.map((stage) => (
          <option key={stage} value={stage}>
            {stage}
          </option>
        ))}
      </select>
    </label>

    <button
      type="button"
      onClick={async () => {
        const confirmed = window.confirm(
          "Cancel this order? This changes the order status but does not refund the payment."
        );

        if (!confirmed) return;

        try {
          const response = await fetch(
            `/api/orders/${encodeURIComponent(order.reference)}/cancel`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: order.deliveryInfo?.email || "",
              }),
            }
          );

          const data = await response.json();

          if (!response.ok || !data.status) {
            throw new Error(data.message || "Could not cancel this order.");
          }

          updateOrderHistory((currentOrders) =>
            currentOrders.map((currentOrder) =>
              currentOrder.reference === order.reference
                ? {
                    ...currentOrder,
                    trackingStatus: "Cancelled",
                    status: "Cancelled",
                  }
                : currentOrder
            )
          );

          alert(data.message);
        } catch (error) {
          alert(error.message || "Could not cancel this order.");
        }
      }}
    >
      Cancel Order
    </button>
  </>
)}

                        <p><strong>Date:</strong> {order.date}</p>
                        <hr />
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          ) : showCustomerAccount ? (
            <section className="customer-account-dashboard">
    <button type="button" onClick={() => setShowCustomerAccount(false)}>&#128281; Back</button>

    <h2>Customer Account</h2>
              <p>Choose an option:</p>
              <div className="customer-account-actions">
                <button type="button" onClick={() => { setShowCustomerAccount(false); setShowCustomerRegister(false); setShowCustomerLogin(true); }}>Login</button>
                <button type="button" onClick={() => { setShowCustomerAccount(false); setShowCustomerRegister(true); }}>Sign Up</button>
              </div>
            </section>
          ) : showCustomerLogin ? (
            <CustomerLogin onBack={() => { setShowCustomerLogin(false); setShowCustomerAccount(true); }} onLoggedIn={() => { setShowCustomerLogin(false); }} />
          ) : showCustomerRegister ? (
            <CustomerRegister onBack={() => { setShowCustomerRegister(false); setShowCustomerAccount(true); }} onRegistered={() => { setShowCustomerRegister(false); setShowCustomerLogin(true); }} />
          ) : showSellerArea ? (
            <SellerArea onRegister={() => { setShowSellerRegister(true); setShowSellerArea(false); }} onLogin={() => { setShowSellerLogin(true); setShowSellerArea(false); }} />
          ) : showSellerRegister ? (
            <SellerRegister onRegistered={() => { setShowSellerRegister(false); setShowSellerLogin(true); }} />
          ) : showSellerLogin ? (
            <SellerLogin onLoggedIn={() => { setShowSellerLogin(false); setShowSellerProfile(true); }} />
          ) : showSellerProfile ? ( <SellerProfile onDashboard={() => { setShowSellerProfile(false); setShowSellerDashboard(true); }} /> ) : showSellerDashboard ? ( <SellerDashboard onAddProduct={() => { setShowSellerDashboard(false); setShowSellerAddProduct(true); }} onEditProduct={() => { setShowSellerDashboard(false); setShowSellerEditProduct(true); }} onDeleteProduct={() => { setShowSellerDashboard(false); setShowSellerDeleteProduct(true); }} /> ) : showSellerAddProduct ? ( <SellerAddProduct /> ) : showSellerEditProduct ? ( <SellerEditProduct /> ) : showSellerDeleteProduct ? ( <SellerDeleteProduct /> ) : showCheckout ? (
            <Checkout
              items={cartItems}
              onBackToCart={() => {
                setShowCheckout(false);
                setShowCart(true);
              }}
              onPaymentSuccess={handlePaymentSuccess}
            />
          ) : showCart ? (
            <Cart
              items={cartItems}
              onContinueShopping={showMainShop}
              onRemove={removeFromCart}
              onIncrease={increaseQuantity}
              onDecrease={decreaseQuantity}
              onCheckout={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                setShowCart(false);
                setShowCheckout(true);
              }}
            />
          ) : showWishlist ? (
            <section className="wishlist-page">
              <div className="container">
                <h1>Wishlist</h1>
                <button type="button" onClick={showMainShop}>
                  Continue Shopping
                </button>

                {wishlistItems.length === 0 ? (
                  <p>Your wishlist is empty.</p>
                ) : (
                  <div className="product-grid">
                    {wishlistItems.map((product) => (
                      <div key={product.name}>
                        <ProductCard
                          name={product.name}
                          price={product.price}
                          image={product.image}
                          onAddToCart={() => addToCart(product)}
                          onAddToWishlist={() =>
                            removeFromWishlist(product.name)
                          }
                          onViewDetails={() => {
                            setSelectedProduct(product);
                          }}
                        />
                        <button type="button" onClick={() => removeFromWishlist(product.name)}>
  Remove from Wishlist
</button>
</div>
))}
</div>
)}
</div>
</section>
) : (
<>
              {selectedProduct ? (
                <ProductDetails
                  product={selectedProduct}
                  onClose={() => { const fromBrowse = productDetailsSource === "browse"; const fromShop = productDetailsSource === "shop"; setSelectedProduct(null); setProductDetailsSource(null); if (fromBrowse) { setShowBrowseProducts(true); } else if (fromShop) { setShowShopParent(true); } }}
                  onAddToCart={addToCart}
                  onAddToWishlist={addToWishlist}
                  onRemoveFromWishlist={removeFromWishlist}
                  isInWishlist={wishlistItems.some((item) => item.name === selectedProduct?.name)}
                  orderHistory={orderHistory}
                />
              ) : (
                <section className="homepage-ads">
  <div className="homepage-ad-stack">
    {[...products, ...sellerProducts].filter((product) => product?.image).map((product, index) => (
      <button key={product.name + "-" + index} type="button" className="homepage-ad-image" onClick={() => { setSelectedProduct(product); setProductDetailsSource("home"); }}>
        <img src={product.image} alt={product.name} />`n                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>`n              </button>
    ))}
  </div>
</section>
              )}
              {homeDashboardView && (
                <section className="home-dashboard">
                  <div className="container">
                    {homeDashboardView === "search" && (
                      <>
                        <h2>Search Results</h2>
                        {filteredProducts.length > 0 ? (
                          <div className="product-grid">
                            {filteredProducts.map((product) => (
                              <ProductCard
                                key={product.name}
                                name={product.name}
                                price={product.price}
                                image={product.image}
                                onViewDetails={() => {
                                  setProductDetailsSource("home-search");
                                  setSelectedProduct(product);
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <p>No products found. Try another search.</p>
                        )}
                      </>
                    )}

                    {homeDashboardView === "contact" && (
                      <>
                        <h2>Contact AfriMarket</h2>
                        <p>
                          Have a question or need help? Send us a message and
                          our support team will get back to you.
                        </p>

                        <form onSubmit={handleContactSubmit}>
                          <input type="text" placeholder="Your Name" required />
                          <input
                            type="email"
                            placeholder="Your Email"
                            required
                          />
                          <textarea
                            placeholder="Your Message"
                            rows="5"
                            required
                          />
                          <button type="submit">Send Message</button>
                        </form>
                      </>
                    )}

                    {homeDashboardView === "help" && (
                      <>
                        <h2>FAQ &amp; Help</h2>

                        <div className="faq-item">
                          <h3>How do I place an order?</h3>
                          <p>
                            Browse our products, choose the item you want, add
                            it to your cart, and continue to checkout to
                            complete your order.
                          </p>
                        </div>

                        <div className="faq-item">
                          <h3>How can I contact AfriMarket support?</h3>
                          <p>
                            You can use our Contact Us form or the floating
                            customer chat to reach our support team.
                          </p>
                        </div>

                        <div className="faq-item">
                          <h3>How can I become a seller?</h3>
                          <p>
                            Select Become a Seller from the navigation menu and
                            follow the registration process.
                          </p>
                        </div>

                        <div className="faq-item">
                          <h3>What happens after I place an order?</h3>
                          <p>
                            Your order will be processed after payment
                            confirmation, and you will be able to follow its
                            progress through the order system.
                          </p>
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setHomeDashboardView(null)}
                    >
                      Back
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </main>



        {!showCart && !showCheckout && cartItems.length > 0 && (
          <button
            type="button"
            className="floating-cart"
            onClick={() => setShowCart(true)}
          >            {"\uD83D\uDED2"} {cartItems.reduce((total, item) => total + (Number(item.quantity) || 0), 0)} {String.fromCharCode(0x2022)} {String.fromCharCode(0x20A6)}{cartItems.reduce((total, item) => { const price = typeof item.price === "number" ? item.price : parseFloat(String(item.price).replace(/[^\d.]/g, "")) || 0; return total + price * (Number(item.quantity) || 0); }, 0).toLocaleString()}
          </button>
        )}
        <footer className="footer">
          <div className="container">
            <h2>AfriMarket</h2>
            <p>Connecting Africa with the world.</p>
            <p>&#169; 2026 AfriMarket. All rights reserved.</p>
          </div>
        </footer>
      </div>

      <CustomerChat />
    </>
  );
}

export default App;


















































































































