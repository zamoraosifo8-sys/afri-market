const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
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
app.get(
  "/api/admin/customers",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await supabaseDb.query(`
        SELECT
          id,
          name,
          email
        FROM customers
        ORDER BY id DESC
      `);

      return res.json({
        status: true,
        customers: result.rows,
      });
    } catch (error) {
      console.error("Admin customers error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to load customers.",
      });
    }
  }
);
app.get(
  "/api/admin/sellers",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await supabaseDb.query(`
        SELECT
          email,
          business_name AS "businessName",
          name,
          phone
        FROM sellers
        ORDER BY email ASC
      `);

      return res.json({
        status: true,
        sellers: result.rows,
      });
    } catch (error) {
      console.error("Admin sellers error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to load sellers.",
      });
    }
  }
);
app.get("/api/reviews/:productName", async (req, res) => {
  const productName = String(req.params.productName || "").trim();

  try {
    const result = await supabaseDb.query(`
      SELECT
        id,
        product_name AS "productName",
        rating,
        text,
        created_at AS "createdAt"
      FROM reviews
      WHERE product_name = $1
      ORDER BY created_at DESC
    `, [productName]);

    return res.json({
      status: true,
      reviews: result.rows,
    });
  } catch (error) {
    console.error("Reviews GET error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to load reviews.",
    });
  }
});

app.post("/api/reviews", async (req, res) => {
  const productName = String(req.body.productName || "").trim();
  const rating = Number(req.body.rating);
  const text = String(req.body.text || "").trim();

  if (!productName) {
    return res.status(400).json({
      status: false,
      message: "Product name is required.",
    });
  }

  try {
    const productResult = await supabaseDb.query(`
      SELECT id
      FROM products
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `, [productName]);

    const productExists =
      productResult.rows.length > 0 ||
      Object.keys(marketplacePrices).some(
        (name) => name.toLowerCase() === productName.toLowerCase()
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

    const reviewResult = await supabaseDb.query(`
      INSERT INTO reviews (id, product_name, rating, text)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        product_name AS "productName",
        rating,
        text,
        created_at AS "createdAt"
    `, [id, productName, rating, text]);

    return res.status(201).json({
      status: true,
      review: reviewResult.rows[0],
    });
  } catch (error) {
    console.error("Reviews POST error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to save review.",
    });
  }
});

app.get(
  "/api/admin/notifications",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await supabaseDb.query(`
        SELECT
          id,
          user_email AS "userEmail",
          reference,
          message,
          date,
          is_read AS "isRead"
        FROM notifications
        ORDER BY date DESC
      `);

      return res.json({
        status: true,
        notifications: result.rows,
      });
    } catch (error) {
      console.error("Admin notifications error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to load notifications.",
      });
    }
  }
);
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
app.post("/api/sellers/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required.",
      });
    }

    const sellerResult = await supabaseDb.query(
      `SELECT email, business_name, name, phone, password
       FROM sellers
       WHERE email = $1`,
      [email]
    );

    const seller = sellerResult.rows[0];

    if (!seller) {
      return res.status(401).json({
        status: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, seller.password);

    if (!passwordMatches) {
      return res.status(401).json({
        status: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        email: seller.email,
        role: "seller",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      status: true,
      message: "Login successful.",
      token,
      seller: {
        email: seller.email,
        businessName: seller.business_name,
        name: seller.name,
        phone: seller.phone,
      },
    });
  } catch (error) {
    console.error("Seller login error:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong during login.",
    });
  }
});
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      status: false,
      message: "Email and password are required.",
    });
  }
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
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
    { expiresIn: "7d" }
  );
  return res.json({
    status: true,
    message: "Admin login successful.",
    token,
  });
});
app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ordersResult = await supabaseDb.query(`
      SELECT
        reference,
        customer_email AS "customerEmail",
        items_json AS "itemsJson",
        delivery_info_json AS "deliveryInfoJson",
        total,
        status,
        tracking_status AS "trackingStatus",
        date
      FROM orders
      ORDER BY id DESC
    `);

    const orders = ordersResult.rows.map((order) => ({
      reference: order.reference,
      customerEmail: order.customerEmail,
      items: JSON.parse(order.itemsJson || "[]"),
      deliveryInfo: order.deliveryInfoJson
        ? JSON.parse(order.deliveryInfoJson)
        : null,
      total: Number(order.total),
      status: order.status,
      trackingStatus: order.trackingStatus,
      date: order.date,
    }));

    return res.json({
      status: true,
      orders,
    });
  } catch (error) {
    console.error("Failed to load admin orders:", error);

    return res.status(500).json({
      status: false,
      message: "Could not load orders.",
    });
  }
});

app.get("/api/admin/customers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await supabaseDb.query(`
      SELECT
        id,
        name,
        email
      FROM customers
      ORDER BY id DESC
    `);

    return res.json({
      status: true,
      customers: result.rows,
    });
  } catch (error) {
    console.error("Failed to load admin customers:", error);

    return res.status(500).json({
      status: false,
      message: "Could not load customers.",
    });
  }
});

app.get("/api/admin/sellers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await supabaseDb.query(`
      SELECT
        email,
        business_name AS "businessName",
        name,
        phone
      FROM sellers
      ORDER BY email ASC
    `);

    return res.json({
      status: true,
      sellers: result.rows,
    });
  } catch (error) {
    console.error("Failed to load admin sellers:", error);

    return res.status(500).json({
      status: false,
      message: "Could not load sellers.",
    });
  }
});

async function loadProductsFromSupabase() {
  const result = await supabaseDb.query(`SELECT id, seller_email AS "sellerEmail", name, description, price, quantity, category, image FROM products ORDER BY created_at ASC`);
  return result.rows;
}

const products = [];
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
app.get("/api/customers/profile/:email", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        status: false,
        message: "Customer access required.",
      });
    }

    const requestedEmail = String(req.params.email || "").trim().toLowerCase();

    if (!requestedEmail || requestedEmail !== String(req.user.email || "").toLowerCase()) {
      return res.status(403).json({
        status: false,
        message: "You can only access your own profile.",
      });
    }

    const result = await supabaseDb.query(
      `SELECT id, name, email
       FROM customers
       WHERE id = $1 AND email = $2`,
      [req.user.id, requestedEmail]
    );

    const customer = result.rows[0];

    if (!customer) {
      return res.status(404).json({
        status: false,
        message: "Customer not found.",
      });
    }

    return res.json({
      status: true,
      customer,
    });
  } catch (error) {
    console.error("Customer profile GET error:", error);

    return res.status(500).json({
      status: false,
      message: "Could not load your profile.",
    });
  }
});

app.put("/api/customers/profile/:email", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        status: false,
        message: "Customer access required.",
      });
    }

    const requestedEmail = String(req.params.email || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const newEmail = String(req.body.newEmail || "").trim().toLowerCase();

    if (!requestedEmail || requestedEmail !== String(req.user.email || "").toLowerCase()) {
      return res.status(403).json({
        status: false,
        message: "You can only update your own profile.",
      });
    }

    if (!name || !newEmail) {
      return res.status(400).json({
        status: false,
        message: "Name and email are required.",
      });
    }

    const existingEmail = await supabaseDb.query(
      `SELECT id
       FROM customers
       WHERE email = $1 AND id <> $2`,
      [newEmail, req.user.id]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        status: false,
        message: "That email is already in use.",
      });
    }

    const result = await supabaseDb.query(
      `UPDATE customers
       SET name = $1, email = $2
       WHERE id = $3
       RETURNING id, name, email`,
      [name, newEmail, req.user.id]
    );

    const customer = result.rows[0];

    if (!customer) {
      return res.status(404).json({
        status: false,
        message: "Customer not found.",
      });
    }

    return res.json({
      status: true,
      message: "Profile updated successfully.",
      customer,
    });
  } catch (error) {
    console.error("Customer profile PUT error:", error);

    return res.status(500).json({
      status: false,
      message: "Could not update your profile.",
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
  async (req, res) => {
    try {
      const result = await supabaseDb.query(`
        SELECT
          id,
          conversation_id AS "conversationId",
          text,
          sender,
          created_at AS "createdAt"
        FROM support_messages
        ORDER BY created_at ASC
      `);

      return res.json({
        status: true,
        messages: result.rows,
      });
    } catch (error) {
      console.error("Admin support messages error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to load support messages.",
      });
    }
  }
);
app.get("/api/support/messages/:conversationId", async (req, res) => {
  const conversationId = String(req.params.conversationId || "").trim();

  try {
    const result = await supabaseDb.query(`
      SELECT
        id,
        conversation_id AS "conversationId",
        text,
        sender,
        created_at AS "createdAt"
      FROM support_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversationId]);

    return res.json({
      status: true,
      messages: result.rows,
    });
  } catch (error) {
    console.error("Support messages load error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to load support messages.",
    });
  }
});

app.post("/api/support/messages", async (req, res) => {
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

  try {
    await supabaseDb.query(`
      INSERT INTO support_messages
        (id, conversation_id, text, sender, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      newMessage.id,
      newMessage.conversationId,
      newMessage.text,
      newMessage.sender,
      newMessage.createdAt,
    ]);

    return res.json({
      status: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Support message save error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to save support message.",
    });
  }
});

app.post(
  "/api/support/reply",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const conversationId = String(req.body.conversationId || "").trim();
    const text = String(req.body.text || "").trim();

    if (!conversationId || !text) {
      return res.status(400).json({
        status: false,
        message: "Conversation and reply are required.",
      });
    }

    const reply = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      text,
      sender: "support",
      createdAt: new Date().toISOString(),
    };

    try {
      const conversation = await supabaseDb.query(
        "SELECT id FROM support_messages WHERE conversation_id = $1 LIMIT 1",
        [conversationId]
      );

      if (conversation.rows.length === 0) {
        return res.status(404).json({
          status: false,
          message: "Conversation not found.",
        });
      }

      await supabaseDb.query(`
        INSERT INTO support_messages
          (id, conversation_id, text, sender, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        reply.id,
        reply.conversationId,
        reply.text,
        reply.sender,
        reply.createdAt,
      ]);

      return res.json({
        status: true,
        message: reply,
      });
    } catch (error) {
      console.error("Support reply save error:", error);
      return res.status(500).json({
        status: false,
        message: "Failed to save support reply.",
      });
    }
  }
);

app.post("/api/products", authenticateToken, requireSellerOrAdmin, async (req, res) => {
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

  try {
    const result = await supabaseDb.query(`
      INSERT INTO products (
        id, seller_email, name, description, price, quantity, category, image
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        seller_email AS "sellerEmail",
        name,
        description,
        price,
        quantity,
        category,
        image
    `, [
      product.id,
      product.sellerEmail,
      product.name,
      product.description,
      product.price,
      product.quantity,
      product.category,
      product.image,
    ]);

    return res.json({
      status: true,
      message: "Product added successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Product save error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to add product.",
    });
  }
});
app.get("/api/products", authenticateToken, requireSellerOrAdmin, async (req, res) => {
  try {
    const result = await supabaseDb.query(`
      SELECT
        id,
        seller_email AS "sellerEmail",
        name,
        description,
        price,
        quantity,
        category,
        image
      FROM products
      ORDER BY created_at ASC
    `);

    const visibleProducts =
      req.user.role === "admin"
        ? result.rows
        : result.rows.filter(
            (product) => product.sellerEmail === req.user.email
          );

    return res.json({
      status: true,
      products: visibleProducts,
    });
  } catch (error) {
    console.error("Products load error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to load products.",
    });
  }
});
app.put("/api/products/:id", authenticateToken, requireSellerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, quantity, category } = req.body;

  try {
    const existing = await supabaseDb.query(`
      SELECT
        id,
        seller_email AS "sellerEmail",
        name,
        description,
        price,
        quantity,
        category,
        image
      FROM products
      WHERE id = $1
    `, [id]);

    const product = existing.rows[0];

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

    const result = await supabaseDb.query(`
      UPDATE products
      SET
        name = $1,
        description = $2,
        price = $3,
        quantity = $4,
        category = $5
      WHERE id = $6
      RETURNING
        id,
        seller_email AS "sellerEmail",
        name,
        description,
        price,
        quantity,
        category,
        image
    `, [name, description, price, quantity, category, id]);

    return res.json({
      status: true,
      message: "Product updated successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Product update error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to update product.",
    });
  }
});

app.delete(
  "/api/products/:id",
  authenticateToken,
  requireSellerOrAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const existing = await supabaseDb.query(`
        SELECT
          id,
          seller_email AS "sellerEmail"
        FROM products
        WHERE id = $1
      `, [id]);

      const product = existing.rows[0];

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
          message: "You can only delete your own products.",
        });
      }

      await supabaseDb.query(
        "DELETE FROM products WHERE id = $1",
        [id]
      );

      return res.json({
        status: true,
        message: "Product deleted successfully.",
      });
    } catch (error) {
      console.error("Product delete error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to delete product.",
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
    const savedProductResult = await supabaseDb.query(
  "SELECT price, quantity FROM products WHERE id = $1",
  [String(item.id)]
);

const savedProduct = savedProductResult.rows[0];

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
          callback_url: "http://afri-market-web.onrender.com/",
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
app.put("/api/orders/:reference/tracking", authenticateToken, async (req, res) => {
  try {
    const reference = String(req.params.reference || "").trim();
    const trackingStatus = String(req.body.trackingStatus || "").trim();

    const allowedStatuses = [
      "Paid",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
    ];

    if (!reference || !allowedStatuses.includes(trackingStatus)) {
      return res.status(400).json({
        status: false,
        message: "Invalid order reference or tracking status.",
      });
    }

    const result = await supabaseDb.query(
      `UPDATE orders
       SET tracking_status = $1,
           status = $1
       WHERE reference = $2
       RETURNING reference`,
      [trackingStatus, reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Order not found.",
      });
    }

    return res.json({
      status: true,
      message: "Tracking status updated successfully.",
    });
  } catch (error) {
    console.error("Update tracking status error:", error);

    return res.status(500).json({
      status: false,
      message: "Could not update tracking status.",
    });
  }
});app.post("/api/orders/:reference/cancel", async (req, res) => {
  try {
    const reference = String(req.params.reference || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!reference || !email) {
      return res.status(400).json({
        status: false,
        message: "Order reference and email are required.",
      });
    }

    const orderResult = await supabaseDb.query(
      `SELECT reference, customer_email, status
       FROM orders
       WHERE reference = $1`,
      [reference]
    );

    const order = orderResult.rows[0];

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

    await supabaseDb.query(
      `UPDATE orders
       SET status = 'Cancelled',
           tracking_status = 'Cancelled'
       WHERE reference = $1`,
      [reference]
    );

    return res.json({
      status: true,
      message: "Order cancelled successfully.",
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return res.status(500).json({
      status: false,
      message: "Could not cancel order.",
    });
  }
});
app.get("/api/orders/mine", authenticateToken, async (req, res) => {
  try {
    const customerEmail = String(req.user.email || "").trim().toLowerCase();

    if (!customerEmail) {
      return res.status(400).json({
        status: false,
        message: "Customer email is missing.",
      });
    }

    const ordersResult = await supabaseDb.query(
      `SELECT
        id,
        reference,
        customer_email,
        items_json,
        delivery_info_json,
        total,
        status,
        tracking_status,
        date
       FROM orders
       WHERE LOWER(customer_email) = $1
       ORDER BY id DESC`,
      [customerEmail]
    );

    const orders = ordersResult.rows.map((order) => ({
      id: order.id,
      reference: order.reference,
      customerEmail: order.customer_email,
      items: JSON.parse(order.items_json || "[]"),
      deliveryInfo: JSON.parse(order.delivery_info_json || "{}"),
      total: Number(order.total),
      status: order.status,
      trackingStatus: order.tracking_status,
      date: order.date,
    }));

    return res.json({
      status: true,
      orders,
    });
  } catch (error) {
    console.error("Load customer orders error:", error);

    return res.status(500).json({
      status: false,
      message: "Could not load customer orders.",
    });
  }
});app.post("/api/orders/save", async (req, res) => {
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

    const savedOrderResult = await supabaseDb.query(`
  INSERT INTO orders (
    id, reference, customer_email, items_json, delivery_info_json,
    total, status, tracking_status, date
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (reference) DO NOTHING
  RETURNING reference
`, [
  order.id,
  order.reference,
  order.customerEmail,
  order.itemsJson,
  order.deliveryInfoJson,
  order.total,
  order.status,
  order.trackingStatus,
  order.date
]);

const savedOrder = {
  changes: savedOrderResult.rowCount
};

if (savedOrder.changes === 1) {
      await supabaseDb.query(`
        INSERT INTO notifications (
          id, user_email, reference, message, date, is_read
        )
        VALUES ($1, $2, $3, $4, $5, 0)
        ON CONFLICT (id) DO NOTHING
      `, [
        `payment-${reference}`,
        order.customerEmail,
        reference,
        "Payment successful for order " + reference + ".",
        order.date
      ]);

  const reduceStock = async (quantity, productId) => {
  return supabaseDb.query(`
    UPDATE products
    SET quantity = quantity - $1
    WHERE id = $2 AND quantity >= $3
  `, [quantity, productId, quantity]);
};

  for (const item of items) {
    if (!item.id) {
      continue;
    }

    const quantity = Number(item.quantity);
    const result = await reduceStock(
  quantity,
  String(item.id)
);

    if (result.rowCount === 1) {
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
    console.error("Order save error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong while saving the order.",
    });
  }
});
async function startServer() {
  try {
    const loadedProducts = await loadProductsFromSupabase();

    products.splice(0, products.length, ...loadedProducts);

    console.log(
      `Products loaded from Supabase: ${products.length}`
    );

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`AfriMarket server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}
startServer();


























