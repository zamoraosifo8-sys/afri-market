const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const db = require("./Database.cjs");
const supabaseDb = require("./SupabaseDatabase.cjs");
require("dotenv").config({ path: __dirname + "/.env" });

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function authenticateToken(req, res, next) {
 const authHeader = req.headers.authorization;
const match = authHeader && authHeader.trim().match(/^Bearer\s+(\S+)$/i);
const token = match ? match[1] : null;

  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Access token required.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      status: false,
      message: "Invalid or expired token.",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      status: false,
      message: "Admin access required.",
    });
  }

  next();
}
function requireSellerOrAdmin(req, res, next) {
  if (!req.user || !["seller", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      status: false,
      message: "Seller or admin access required.",
    });
  }

  next();
}
const app = express();

// Limit sign-ins, registrations, and messages without blocking chat checks.
const rateLimitedPaths = new Set([
  "/api/customers/register",
  "/api/customers/login",
  "/api/sellers/register",
  "/api/sellers/login",
  "/api/admin/login",
  "/api/support/messages",
  "/api/support/reply",
]);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => !rateLimitedPaths.has(req.path),
});

app.use(authLimiter);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
  })
);

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

const supportMessages = db.prepare(
  "SELECT id, conversation_id AS conversationId, text, sender, created_at AS createdAt FROM support_messages"
).all();

const sellers = db.prepare(
  "SELECT email, business_name AS businessName, name, phone, password FROM sellers"
).all();

const customers = db.prepare(
  "SELECT id, name, email, password FROM customers"
).all();

async function loadProductsFromSupabase() {
  const result = await supabaseDb.query(`SELECT id, seller_email AS "sellerEmail", name, description, price, quantity, category, image FROM products ORDER BY created_at ASC`);
  return result.rows;
}

const products = db.prepare(
  "SELECT id, seller_email AS sellerEmail, name, description, price, quantity, category, image FROM products"
).all();
function saveDatabaseState() {
  const save = db.transaction(() => {
    db.prepare("DELETE FROM support_messages").run();
    db.prepare("DELETE FROM sellers").run();
    db.prepare("DELETE FROM customers").run();
    db.prepare("DELETE FROM products").run();

    const saveMessage = db.prepare(`
  INSERT INTO support_messages (
    id,
    conversation_id,
    text,
    sender,
    created_at
  )
  VALUES (
    @id,
    @conversationId,
    @text,
    @sender,
    @createdAt
  )
`);
    for (const message of supportMessages) {
      saveMessage.run(message);
    }

    const saveSeller = db.prepare(`
      INSERT INTO sellers (email, business_name, name, phone, password)
      VALUES (@email, @businessName, @name, @phone, @password)
    `);
    for (const seller of sellers) {
      saveSeller.run(seller);
    }

    const saveCustomer = db.prepare(`
      INSERT INTO customers (id, name, email, password)
      VALUES (@id, @name, @email, @password)
    `);
    for (const customer of customers) {
      saveCustomer.run(customer);
    }

    const saveProduct = db.prepare(`
      INSERT INTO products (
        id, seller_email, name, description, price, quantity, category, image
      )
      VALUES (
        @id, @sellerEmail, @name, @description, @price, @quantity, @category, @image
      )
    `);
    for (const product of products) {
      saveProduct.run(product);
    }
  });

  save();
}
const marketplacePrices = {
  "Premium Ankara Fabric": 35000,
  "Roasted Nigerian Peanuts": 12000,
  "Natural Shea Butter": 18000,
  "Handmade Leather Bag": 6500,
};

app.get("/", (req, res) => {
  res.send("AfriMarket server is running!");
});
app.get("/api/store/products", (req, res) => {
  res.json({
    status: true,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      quantity: Number(product.quantity),
      category: product.category,
      image: product.image || "",
    })),
  });
});
app.get(
  "/api/support/messages",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    return res.json({
      status: true,
      messages: supportMessages,
    });
  }
);

app.get("/api/support/messages/:conversationId", (req, res) => {
  const conversationId = String(req.params.conversationId || "").trim();

  const messages = supportMessages.filter(
    (message) => message.conversationId === conversationId
  );

  return res.json({
    status: true,
    messages,
  });
});

app.post("/api/support/messages", (req, res) => {
  const conversationId = String(req.body.conversationId || "legacy").trim();
  const text = String(req.body.text || "").trim();

  if (!text) {
    return res.status(400).json({
      status: false,
      message: "Message is required.",
    });
  }

  const newMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    text,
    sender: "customer",
    createdAt: new Date().toISOString(),
  };

  supportMessages.push(newMessage);
  saveDatabaseState();

  return res.json({
    status: true,
    message: newMessage,
  });
});

app.post(
  "/api/support/reply",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const conversationId = String(req.body.conversationId || "").trim();
    const text = String(req.body.text || "").trim();

    if (!conversationId || !text) {
      return res.status(400).json({
        status: false,
        message: "Conversation and reply are required.",
      });
    }

    const conversationExists = supportMessages.some(
      (message) => message.conversationId === conversationId
    );

    if (!conversationExists) {
      return res.status(404).json({
        status: false,
        message: "Conversation not found.",
      });
    }

    const reply = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      text,
      sender: "support",
      createdAt: new Date().toISOString(),
    };

    supportMessages.push(reply);
    saveDatabaseState();

    return res.json({
      status: true,
      message: reply,
    });
  }
);

app.post("/api/products", authenticateToken, requireSellerOrAdmin, (req, res) => {
  const { name, description, price, quantity, category, image } = req.body;

  if (!name || !description || !price || !quantity || !category) {
    return res.status(400).json({
      status: false,
      message: "All product fields are required.",
    });
  }

  const product = {
    sellerEmail: req.user.role === "seller" ? req.user.email : null,
    id: Date.now().toString(),
    name,
    description,
    price,
        quantity,
    category,
    image: image || "",
  };

  products.push(product);
  saveDatabaseState();
  res.json({
    status: true,
    message: "Product added successfully.",
    product,
  });
});

app.get("/api/products", authenticateToken, requireSellerOrAdmin, (req, res) => {
  const visibleProducts =
    req.user.role === "admin"
      ? products
      : products.filter((product) => product.sellerEmail === req.user.email);

  res.json({
    status: true,
    products: visibleProducts,
  });
});

app.put("/api/products/:id", authenticateToken, requireSellerOrAdmin, (req, res) => {
  const { id } = req.params;

  console.log("DELETE ID:", id, "PRODUCTS:", products);
  console.log("NUMBER OF PRODUCTS:", products.length);

  const { name, description, price, quantity, category } = req.body;

  const product = products.find((product) => product.id === id);

  if (!product) {
    return res.status(404).json({
      status: false,
      message: "Product not found.",
    });
  }
if (
  req.user.role === "seller" &&
  product.sellerEmail !== req.user.email
) {
  return res.status(403).json({
    status: false,
    message: "You can only edit your own products.",
  });
}
  product.name = name;
  product.description = description;
  product.price = price;
  product.quantity = quantity;
  product.category = category;
  saveDatabaseState();
  res.json({
    status: true,
    message: "Product updated successfully.",
    product,
  });
});

app.delete(
  "/api/products/:id",
  authenticateToken,
  requireSellerOrAdmin,
  (req, res) => {
    const { id } = req.params;

    console.log("DELETE ID:", id);

    const productIndex = products.findIndex(
      (product) => String(product.id) === String(id)
    );

    console.log("PRODUCT INDEX:", productIndex);

    if (productIndex === -1) {
      return res.status(404).json({
        status: false,
        message: "Product not found.",
      });
    }
const product = products[productIndex];

if (
  req.user.role === "seller" &&
  product.sellerEmail !== req.user.email
) {
  return res.status(403).json({
    status: false,
    message: "You can only delete your own products.",
  });
}
    products.splice(productIndex, 1);
    saveDatabaseState();
    res.json({
      status: true,
      message: "Product deleted successfully.",
    });
  }
);

app.post("/api/paystack/initialize", async (req, res) => {
  try {
    const { email, amount, currency, items } = req.body;

    let serverTotal = 0;

if (!Array.isArray(items) || items.length === 0) {
  return res.status(400).json({
    message: "Invalid cart.",
  });
}

for (const item of items) {
  const quantity = Number(item.quantity);

  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
    return res.status(400).json({
      message: "Invalid product quantity.",
    });
  }

  let price = marketplacePrices[item.name];

  if (!price && item.id) {
    const savedProduct = db
      .prepare("SELECT price, quantity FROM products WHERE id = ?")
      .get(String(item.id));

    if (!savedProduct) {
      return res.status(400).json({
        message: "This product could not be found.",
      });
    }

    if (quantity > Number(savedProduct.quantity)) {
      return res.status(400).json({
        message: "There is not enough stock for this product.",
      });
    }

    price = Number(savedProduct.price);
  }

  if (!price) {
    return res.status(400).json({
      message: "This product cannot be checked out.",
    });
  }

  serverTotal += Number(price) * quantity;
}

if (Number(amount) !== serverTotal * 100) {
  return res.status(400).json({
    message: "Payment amount does not match the cart total.",
  });
}
    if (!Number.isInteger(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount.",
      });
    }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!email || !emailPattern.test(String(email).trim())) {
  return res.status(400).json({
    message: "Please enter a valid email address.",
  });
}
if (!currency || String(currency).toUpperCase() !== "NGN") {
  return res.status(400).json({
    message: "Only NGN payments are supported.",
  });
}
    if (!email || !amount) {
      return res.status(400).json({
        message: "Email and amount are required.",
      });
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: String(amount),
          ...(currency ? { currency } : {}),
          callback_url: "http://localhost:5173/",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return res.status(400).json({
        message:
          data.message || "Paystack could not initialize the payment.",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Paystack error:", error);

    res.status(500).json({
      message: "Something went wrong while starting the payment.",
    });
  }
});

app.get("/api/paystack/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference || !/^[A-Za-z0-9_-]+$/.test(reference)) {
      return res.status(400).json({
        message: "Invalid payment reference.",
      });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return res.status(400).json({
        message: data.message || "Could not verify Paystack payment.",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Paystack verification error:", error);

    res.status(500).json({
      message: "Something went wrong while verifying the payment.",
    });
  }
});
app.post("/api/orders/save", async (req, res) => {
  try {
    const { reference, items, deliveryInfo } = req.body;

    if (!reference || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Order information is incomplete.",
      });
    }

    const existingOrder = db
      .prepare("SELECT reference FROM orders WHERE reference = ?")
      .get(reference);

    if (existingOrder) {
      return res.json({
        status: true,
        message: "Order is already saved.",
      });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status || data.data?.status !== "success") {
      return res.status(400).json({
        status: false,
        message: "Paystack could not confirm this payment.",
      });
    }

    const order = {
      id: Date.now().toString(),
      reference,
      customerEmail:
        deliveryInfo?.email || data.data.customer?.email || "",
      itemsJson: JSON.stringify(items),
      deliveryInfoJson: JSON.stringify(deliveryInfo || {}),
      total: Number(data.data.amount) / 100,
      status: "Paid",
      trackingStatus: "Paid",
      date: new Date().toLocaleString(),
    };

    const savedOrder = db.prepare(`
  INSERT OR IGNORE INTO orders (
    id, reference, customer_email, items_json, delivery_info_json,
    total, status, tracking_status, date
  )
  VALUES (
    @id, @reference, @customerEmail, @itemsJson, @deliveryInfoJson,
    @total, @status, @trackingStatus, @date
  )
`).run(order);

if (savedOrder.changes === 1) {
    db.prepare(`
    INSERT OR IGNORE INTO notifications (
      id, user_email, reference, message, date, is_read
    )
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(
    `payment-${reference}`,
    order.customerEmail,
    reference,
    "Payment successful for order " + reference + ".",
    order.date
  );

  const reduceStock = db.prepare(`
    UPDATE products
    SET quantity = quantity - ?
    WHERE id = ? AND quantity >= ?
  `);

  for (const item of items) {
    if (!item.id) {
      continue;
    }

    const quantity = Number(item.quantity);
    const result = reduceStock.run(
      quantity,
      String(item.id),
      quantity
    );

    if (result.changes === 1) {
      const product = products.find(
        (savedProduct) => String(savedProduct.id) === String(item.id)
      );

      if (product) {
        product.quantity = Number(product.quantity) - quantity;
      }
    } else {
      console.warn(`Could not reduce stock for product ${item.id}.`);
    }
  }
}

    return res.json({
      status: true,
      message: "Order saved successfully.",
    });
  } catch (error) {
    console.error("Save order error:", error);

    return res.status(500).json({
      status: false,
      message: "Could not save the order.",
    });
  }
});
app.get("/api/orders/mine", authenticateToken, (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({
      status: false,
      message: "Customer access required.",
    });
  }

  const savedOrders = db.prepare(`
    SELECT
      reference,
      customer_email AS customerEmail,
      items_json AS itemsJson,
      delivery_info_json AS deliveryInfoJson,
      total,
      status,
      tracking_status AS trackingStatus,
      date
    FROM orders
    WHERE customer_email = ?
    ORDER BY rowid DESC
  `).all(req.user.email);

  const orders = savedOrders.map((order) => ({
    reference: order.reference,
    items: JSON.parse(order.itemsJson),
    deliveryInfo: JSON.parse(order.deliveryInfoJson || "null"),
    total: Number(order.total),
    status: order.status,
    trackingStatus: order.trackingStatus,
    date: order.date,
  }));

  res.json({
    status: true,
    orders,
  });
});
app.post("/api/orders/:reference/cancel", (req, res) => {
  const reference = String(req.params.reference || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!reference || !email) {
    return res.status(400).json({
      status: false,
      message: "Order reference and email are required.",
    });
  }

  const order = db
    .prepare(
      "SELECT reference, customer_email, status FROM orders WHERE reference = ?"
    )
    .get(reference);

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Order not found in the database.",
    });
  }

  if (String(order.customer_email || "").toLowerCase() !== email) {
    return res.status(403).json({
      status: false,
      message: "The email does not match this order.",
    });
  }

  if (order.status === "Cancelled") {
    return res.json({
      status: true,
      message: "This order is already cancelled.",
    });
  }

  if (order.status !== "Paid") {
    return res.status(400).json({
      status: false,
      message: "Only paid orders can be cancelled before processing.",
    });
  }

  db.prepare(`
    UPDATE orders
    SET status = 'Cancelled',
        tracking_status = 'Cancelled'
    WHERE reference = ?
  `).run(reference);

  return res.json({
    status: true,
    message: "Order cancelled successfully.",
  });
});
app.put(
  "/api/orders/:reference/tracking",
  authenticateToken,
  (req, res) => {
    const reference = String(req.params.reference || "").trim();
    const trackingStatus = String(req.body.trackingStatus || "").trim();
    const allowedStatuses = [
      "Paid",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
    ];

    if (!allowedStatuses.includes(trackingStatus)) {
      return res.status(400).json({
        status: false,
        message: "Invalid tracking status.",
      });
    }

    const order = db
      .prepare(
        "SELECT reference, customer_email AS customerEmail, status FROM orders WHERE reference = ?"
      )
      .get(reference);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found.",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOrderOwner =
      req.user.role === "customer" &&
      String(req.user.email || "").toLowerCase() ===
        String(order.customerEmail || "").toLowerCase();

    if (!isAdmin && !isOrderOwner) {
      return res.status(403).json({
        status: false,
        message: "You cannot update this order.",
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        status: false,
        message: "A cancelled order cannot be updated.",
      });
    }

    db.prepare(`
      UPDATE orders
      SET status = ?, tracking_status = ?
      WHERE reference = ?
    `).run(trackingStatus, trackingStatus, reference);

    return res.json({
      status: true,
      message: "Tracking status saved.",
      trackingStatus,
    });
  }
);
app.get("/api/reviews/:productName", (req, res) => {
  const productName = String(req.params.productName || "").trim();

  const reviews = db.prepare(`
    SELECT
      id,
      product_name AS productName,
      rating,
      text,
      created_at AS createdAt
    FROM reviews
    WHERE product_name = ?
    ORDER BY created_at DESC
  `).all(productName);

  res.json({
    status: true,
    reviews,
  });
});

app.post("/api/reviews", (req, res) => {
  const productName = String(req.body.productName || "").trim();
  const rating = Number(req.body.rating);
  const text = String(req.body.text || "").trim();

  const productExists =
    Object.keys(marketplacePrices).some(
      (name) => name.toLowerCase() === productName.toLowerCase()
    ) ||
    products.some(
      (product) => product.name.toLowerCase() === productName.toLowerCase()
    );

  if (!productExists) {
    return res.status(404).json({
      status: false,
      message: "Product not found.",
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      status: false,
      message: "Choose a rating from 1 to 5.",
    });
  }

  if (!text || text.length > 1000) {
    return res.status(400).json({
      status: false,
      message: "Write a review of 1 to 1000 characters.",
    });
  }

  const id = Date.now().toString();

  db.prepare(`
    INSERT INTO reviews (id, product_name, rating, text)
    VALUES (?, ?, ?, ?)
  `).run(id, productName, rating, text);

  const review = db.prepare(`
    SELECT
      id,
      product_name AS productName,
      rating,
      text,
      created_at AS createdAt
    FROM reviews
    WHERE id = ?
  `).get(id);

  res.status(201).json({
    status: true,
    review,
  });
});
app.post("/api/customers/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res.status(400).json({
      status: false,
      message: "Name, email, and password are required.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      status: false,
      message: "Password must be at least 6 characters long.",
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      status: false,
      message: "Please enter a valid email address.",
    });
  }

  const existingCustomer = customers.find(
    (customer) => customer.email.toLowerCase() === email.toLowerCase()
  );

  if (existingCustomer) {
    return res.status(409).json({
      status: false,
      message: "An account with this email already exists.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const customer = {
    id: Date.now().toString(),
    name,
    email,
    password: hashedPassword,
  };

  customers.push(customer);
  saveDatabaseState();
  res.json({
    status: true,
    message: "Customer registration successful.",
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
  });
});

app.post("/api/sellers/register", async (req, res) => {
  const businessName = String(req.body.businessName || "").trim();
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");

  if (!businessName || !name || !email || !phone || !password) {
    return res.status(400).json({
      status: false,
      message: "All seller registration fields are required.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      status: false,
      message: "Password must be at least 6 characters long.",
    });
  }

  const phonePattern = /^(?:0\d{9}|\+233\d{9})$/;

  if (!phonePattern.test(phone)) {
    return res.status(400).json({
      status: false,
      message: "Please enter a valid Ghana phone number.",
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      status: false,
      message: "Please enter a valid email address.",
    });
  }

  const existingSeller = sellers.find(
    (seller) => seller.email.toLowerCase() === email
  );

  if (existingSeller) {
    return res.status(409).json({
      status: false,
      message: "An account with this email already exists.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  sellers.push({
    businessName,
    name,
    email,
    phone,
    password: hashedPassword,
  });
  saveDatabaseState();
  res.json({
    status: true,
    message: "Seller registration received successfully.",
  });
});

app.get("/api/customers", authenticateToken, requireAdmin, (req, res) => {
  res.json({
    status: true,
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
    })),
  });
});

app.get("/api/sellers", authenticateToken, requireAdmin, (req, res) => {
  res.json({
    status: true,
    sellers: sellers.map((seller) => ({
      businessName: seller.businessName,
      name: seller.name,
      email: seller.email,
      phone: seller.phone,
    })),
  });
});
app.get("/api/admin/orders", authenticateToken, requireAdmin, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT
        reference,
        customer_email AS customerEmail,
        items_json AS itemsJson,
        delivery_info_json AS deliveryInfoJson,
        total,
        status,
        tracking_status AS trackingStatus,
        date
      FROM orders
      ORDER BY rowid DESC
    `).all().map((order) => ({
      reference: order.reference,
      customerEmail: order.customerEmail,
      items: JSON.parse(order.itemsJson),
      deliveryInfo: order.deliveryInfoJson
        ? JSON.parse(order.deliveryInfoJson)
        : null,
      total: Number(order.total),
      status: order.status,
      trackingStatus: order.trackingStatus,
      date: order.date,
    }));

    return res.json({ status: true, orders });
  } catch (error) {
    console.error("Failed to load admin orders:", error);
    return res.status(500).json({
      status: false,
      message: "Could not load orders.",
    });
  }
});
app.get(
  "/api/admin/notifications",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO notifications (
          id, user_email, reference, message, date, is_read
        )
        SELECT
          'payment-' || orders.reference,
          orders.customer_email,
          orders.reference,
          'Payment successful for order ' || orders.reference || '.',
          orders.date,
          0
        FROM orders
        WHERE orders.status <> 'Cancelled'
          AND NOT EXISTS (
            SELECT 1
            FROM notifications
            WHERE reference = orders.reference
          )
      `).run();

      const notifications = db.prepare(`
        SELECT
          id,
          user_email AS userEmail,
          reference,
          message,
          date,
          is_read AS isRead
        FROM notifications
        ORDER BY rowid DESC
      `).all();

      return res.json({ status: true, notifications });
    } catch (error) {
      console.error("Failed to load admin notifications:", error);
      return res.status(500).json({
        status: false,
        message: "Could not load notifications.",
      });
    }
  }
);

app.get("/api/customers/profile/:email", authenticateToken, (req, res) => {
  if (
    req.user.role !== "customer" ||
    req.user.email.toLowerCase() !== req.params.email.toLowerCase()
  ) {
    return res.status(403).json({
      status: false,
      message: "You can only access your own profile.",
    });
  }

  const { email } = req.params;

  const customer = customers.find(
    (customer) =>
      customer.email.toLowerCase() === email.toLowerCase()
  );

  if (!customer) {
    return res.status(404).json({
      status: false,
      message: "Customer not found.",
    });
  }

  res.json({
    status: true,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
  });
});

app.put("/api/customers/profile/:email", authenticateToken, (req, res) => {
  if (
    req.user.role !== "customer" ||
    req.user.email.toLowerCase() !== req.params.email.toLowerCase()
  ) {
    return res.status(403).json({
      status: false,
      message: "You can only update your own profile.",
    });
  }

  const { email } = req.params;
  const { name, newEmail } = req.body;

  const customer = customers.find(
    (customer) =>
      customer.email.toLowerCase() === email.toLowerCase()
  );

  if (!customer) {
    return res.status(404).json({
      status: false,
      message: "Customer not found.",
    });
  }

  if (!name || !newEmail) {
    return res.status(400).json({
      status: false,
      message: "Name and email are required.",
    });
  }

  customer.name = name.trim();
  customer.email = newEmail.trim();
  saveDatabaseState();
  res.json({
    status: true,
    message: "Profile updated successfully.",
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
  });
});

app.post("/api/customers/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({
      status: false,
      message: "Email and password are required.",
    });
  }

  const customer = customers.find(
    (customer) => customer.email.toLowerCase() === email
  );

  if (
    !customer ||
    !(await bcrypt.compare(password, customer.password))
  ) {
    return res.status(401).json({
      status: false,
      message: "Invalid email or password.",
    });
  }

  const token = jwt.sign(
    {
      id: customer.id,
      email: customer.email,
      role: "customer",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    status: true,
    message: "Login successful.",
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
  });
});

app.post("/api/sellers/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({
      status: false,
      message: "Email and password are required.",
    });
  }

  const seller = sellers.find(
    (seller) => seller.email.toLowerCase() === email
  );

  if (
    !seller ||
    !(await bcrypt.compare(password, seller.password))
  ) {
    return res.status(401).json({
      status: false,
      message: "Invalid email or password.",
    });
  }

  const token = jwt.sign(
    {
      id: seller.email,
      email: seller.email,
      role: "seller",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    status: true,
    message: "Seller login received successfully.",
    token,
    seller: {
      businessName: seller.businessName,
      name: seller.name,
      email: seller.email,
      phone: seller.phone,
    },
  });
});

app.post("/api/admin/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({
      status: false,
      message: "Email and password are required.",
    });
  }

  if (
    email !== String(ADMIN_EMAIL || "").toLowerCase() ||
    password !== String(ADMIN_PASSWORD || "")
  ) {
    return res.status(401).json({
      status: false,
      message: "Invalid admin credentials.",
    });
  }

  const token = jwt.sign(
    {
      email: ADMIN_EMAIL,
      role: "admin",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    status: true,
    message: "Admin login successful.",
    token,
  });
});

app.get("/api/paystack/callback", (req, res) => {
  const reference = String(req.query.reference || "").trim();

if (!reference || !/^[A-Za-z0-9_-]+$/.test(reference)) {
  return res.status(400).json({
    message: "Invalid payment reference.",
  });
}

  console.log("Paystack callback received:", reference);

  res.redirect(
    "http://localhost:5174/?payment=success&reference=" +
      encodeURIComponent(reference || "")
  );
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log("AfriMarket server running on port " + PORT);
});




