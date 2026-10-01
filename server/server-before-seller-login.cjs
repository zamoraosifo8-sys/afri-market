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
app.post("/api/customers/register", async (req, res) => {
  try {
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

    const existingCustomerResult = await supabaseDb.query(
      "SELECT id FROM customers WHERE email = $1",
      [email]
    );

    if (existingCustomerResult.rows.length > 0) {
      return res.status(409).json({
        status: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customerId = Date.now().toString();

    await supabaseDb.query(
      `INSERT INTO customers (id, name, email, password)
       VALUES ($1, $2, $3, $4)`,
      [customerId, name, email, hashedPassword]
    );

    return res.json({
      status: true,
      message: "Registration successful.",
    });
  } catch (error) {
    console.error("Customer registration error:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong during registration.",
    });
  }
});
app.post("/api/customers/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required.",
      });
    }

    const customerResult = await supabaseDb.query(
      `SELECT id, name, email, password
       FROM customers
       WHERE email = $1`,
      [email]
    );

    const customer = customerResult.rows[0];

    if (!customer) {
      return res.status(401).json({
        status: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, customer.password);

    if (!passwordMatches) {
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
      { expiresIn: "7d" }
    );

    return res.json({
      status: true,
      message: "Login successful.",
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("Customer login error:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong during login.",
    });
  }
});
app.post("/api/sellers/register", async (req, res) => {
  try {
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

    const existingSellerResult = await supabaseDb.query(
      "SELECT email FROM sellers WHERE email = $1",
      [email]
    );

    if (existingSellerResult.rows.length > 0) {
      return res.status(409).json({
        status: false,
        message: "A seller account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await supabaseDb.query(
      `INSERT INTO sellers (
        email, business_name, name, phone, password
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [email, businessName, name, phone, hashedPassword]
    );

    return res.json({
      status: true,
      message: "Seller registration successful.",
    });
  } catch (error) {
    console.error("Seller registration error:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong during seller registration.",
    });
  }
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

app.post("/api/products", authenticateToken, requireSellerOrAdmin, async (req, res) => {
  try {
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
      price: Number(price),
      quantity: Number(quantity),
      category,
      image: image || "",
    };

    await supabaseDb.query(
      `INSERT INTO products (
        id, seller_email, name, description, price, quantity, category, image
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        product.id,
        product.sellerEmail,
        product.name,
        product.description,
        product.price,
        product.quantity,
        product.category,
        product.image,
      ]
    );

    products.push(product);

    return res.json({
      status: true,
      message: "Product added successfully.",
      product,
    });
  } catch (error) {
    console.error("Product create error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong while adding the product.",
    });
  }
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

app.put("/api/products/:id", authenticateToken, requireSellerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, category, image } = req.body;

    const product = products.find(
      (savedProduct) => String(savedProduct.id) === String(id)
    );

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

    const updatedProduct = {
      ...product,
      name,
      description,
      price: Number(price),
      quantity: Number(quantity),
      category,
      image: image === undefined ? product.image || "" : image,
    };

    await supabaseDb.query(
      `UPDATE products
       SET name = $1,
           description = $2,
           price = $3,
           quantity = $4,
           category = $5,
           image = $6
       WHERE id = $7`,
      [
        updatedProduct.name,
        updatedProduct.description,
        updatedProduct.price,
        updatedProduct.quantity,
        updatedProduct.category,
        updatedProduct.image,
        String(id),
      ]
    );

    Object.assign(product, updatedProduct);

    return res.json({
      status: true,
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Product update error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong while updating the product.",
    });
  }
});

app.delete(
  "/api/products/:id",
  authenticateToken,
  requireSellerOrAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const productIndex = products.findIndex(
        (savedProduct) => String(savedProduct.id) === String(id)
      );

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

      await supabaseDb.query(
        "DELETE FROM products WHERE id = $1",
        [String(id)]
      );

      products.splice(productIndex, 1);

      return res.json({
        status: true,
        message: "Product deleted successfully.",
      });
    } catch (error) {
      console.error("Product delete error:", error);
      return res.status(500).json({
        status: false,
        message: "Something went wrong while deleting the product.",
      });
    }
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
    const productResult = await supabaseDb.query("SELECT price, quantity FROM products WHERE id = $1", [String(item.id)]);
    const savedProduct = productResult.rows[0];

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

    const existingOrderResult = await supabaseDb.query(
      "SELECT reference FROM orders WHERE reference = $1",
      [reference]
    );

    const existingOrder = existingOrderResult.rows[0];

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

    const savedOrderResult = await supabaseDb.query(
      `INSERT INTO orders (
        id, reference, customer_email, items_json, delivery_info_json,
        total, status, tracking_status, date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (reference) DO NOTHING
      RETURNING id, reference`,
      [
        order.id,
        order.reference,
        order.customerEmail,
        order.itemsJson,
        order.deliveryInfoJson,
        order.total,
        order.status,
        order.trackingStatus,
        order.date,
      ]
    );

    const savedOrder = {
      changes: savedOrderResult.rows.length,
    };

if (savedOrder.changes === 1) {
    await supabaseDb.query(
      `INSERT INTO notifications (
        id, user_email, reference, message, date, is_read
      )
      VALUES ($1, $2, $3, $4, $5, 0)
      ON CONFLICT (id) DO NOTHING`,
      [
        `payment-${reference}`,
        order.customerEmail,
        reference,
        "Payment successful for order " + reference + ".",
        order.date,
      ]
    );

  for (const item of items) {
    if (!item.id) {
      continue;
    }

    const quantity = Number(item.quantity);

    const stockResult = await supabaseDb.query(
      `UPDATE products
       SET quantity = quantity - $1
       WHERE id = $2 AND quantity >= $1
       RETURNING id, quantity`,
      [quantity, String(item.id)]
    );

    if (stockResult.rows.length === 1) {
      const product = products.find(
        (savedProduct) => String(savedProduct.id) === String(item.id)
      );

      if (product) {
        product.quantity = Number(stockResult.rows[0].quantity);
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
    console.error("Order save error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong while saving the order.",
    });
  }
});

async function startServer() {
  try {
    const supabaseProducts = await loadProductsFromSupabase();
    products.splice(0, products.length, ...supabaseProducts);

    app.listen(5000, () => {
      console.log("AfriMarket server running on port 5000");
      console.log("Products loaded from Supabase:", products.length);
    });
  } catch (error) {
    console.error("Failed to load products from Supabase:", error.message);
    process.exit(1);
  }
}

startServer();



















