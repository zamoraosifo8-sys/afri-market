import { useEffect, useState } from "react";

function Admin() {
  const adminToken = localStorage.getItem("afriMarketAdminToken");
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);

 useEffect(() => {
  fetch("/api/customers", {
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
})
    .then((response) => response.json())
    .then((data) => {
      if (data.status) {
        setCustomers(data.customers);
      }
    })
    .catch((error) => {
      console.error("Failed to load customers:", error);
    });

    fetch("/api/sellers", {
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
})
    .then((response) => response.json())
    .then((data) => {
      if (data.status) {
        setSellers(data.sellers);
      }
    })
    .catch((error) => {
      console.error("Failed to load sellers:", error);
    });

  fetch("/api/products", {
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
})
    .then((response) => response.json())
    .then((data) => {
      if (data.status) {
        setProducts(data.products);
      }
    })
    .catch((error) => {
      console.error("Failed to load products:", error);
    });

    fetch("/api/admin/orders", {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status) {
        setOrders(data.orders);
      }
    })
    .catch((error) => {
      console.error("Failed to load orders:", error);
    });
    fetch("/api/support/messages", {
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
})
    .then((response) => response.json())
    .then((data) => {
      if (data.status) {
        setSupportMessages(data.messages);
      }
    })
    .catch((error) => {
      console.error("Failed to load support messages:", error);
    });
}, []);

  return (
    <section className="admin-page">
      <h1>AfriMarket Admin</h1>
      <div className="admin-summary">
  <p>Customers: {customers.length}</p>
  <p>Sellers: {sellers.length}</p>
  <p>Products: {products.length}</p>
  <p>Orders: {orders.length}</p>
  <p>Support Messages: {supportMessages.length}</p>
</div>
      <p>Customer Management</p>

      <h2>Customers ({customers.length})</h2>

      {customers.length === 0 ? (
        <p>No customers found.</p>
      ) : (
        <ul>
          {customers.map((customer) => (
            <li key={customer.id}>
              {customer.name} — {customer.email}
            </li>
          ))}
        </ul>
      )}
            <p>Seller Management</p>

      <h2>Sellers ({sellers.length})</h2>

      {sellers.length === 0 ? (
        <p>No sellers found.</p>
      ) : (
        <ul>
          {sellers.map((seller) => (
            <li key={seller.email}>
              {seller.businessName} — {seller.name} — {seller.email} —{" "}
              {seller.phone}
            </li>
          ))}
        </ul>
      )}
    <p>Product Management</p>

<h2>Products ({products.length})</h2>

{products.length === 0 ? (
  <p>No products found.</p>
) : (
  <ul>
    {products.map((product) => (
      <li key={product.id}>
        {product.name} — {product.price}{" "}

        <button
          onClick={() => {
            fetch(`/api/products/${product.id}`, {
              method: "DELETE",
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.status) {
                  setProducts((currentProducts) =>
                    currentProducts.filter(
                      (currentProduct) => currentProduct.id !== product.id
                    )
                  );
                }
              })
              .catch((error) => {
                console.error("Failed to delete product:", error);
              });
          }}
        >
          Delete
        </button>

        <button
          onClick={() => {
            const updatedName = window.prompt(
              "Enter new product name:",
              product.name
            );

            if (!updatedName) {
              return;
            }

            fetch(`/api/products/${product.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: updatedName,
                description: product.description,
                price: product.price,
                quantity: product.quantity,
                category: product.category,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.status) {
                  setProducts((currentProducts) =>
                    currentProducts.map((currentProduct) =>
                      currentProduct.id === product.id
                        ? data.product
                        : currentProduct
                    )
                  );
                }
              })
              .catch((error) => {
                console.error("Failed to update product:", error);
              });
          }}
        >
          Edit
        </button>
      </li>
    ))}
  </ul>
)}
<p>Support Management</p>

<h2>Support Messages ({supportMessages.length})</h2>

{supportMessages.length === 0 ? (
  <p>No support messages found.</p>
) : (
  <ul>
    {supportMessages.map((message) => (
      <li key={message.id}>
        <p>
          <strong>Conversation:</strong>{" "}
          {message.conversationId || "Old messages"}
        </p>

        <p>
          {message.sender} — {message.text}
        </p>

        {message.sender === "customer" && message.conversationId && (
          <button
            type="button"
            onClick={async () => {
              const replyText = window.prompt("Type your reply to this customer:");

              if (!replyText || !replyText.trim()) {
                return;
              }

              try {
                const response = await fetch(
                  "/api/support/reply",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({
                      conversationId: message.conversationId,
                      text: replyText.trim(),
                    }),
                  }
                );

                const data = await response.json();

                if (!response.ok || !data.status) {
                  throw new Error(
                    data.message || "Could not send your reply."
                  );
                }

                setSupportMessages((currentMessages) => [
                  ...currentMessages,
                  data.message,
                ]);

                alert("Reply sent successfully.");
              } catch (error) {
                alert(error.message || "Could not send your reply.");
              }
            }}
          >
            Reply
          </button>
        )}
      </li>
    ))}
    </ul>
)}
    </section>
  );
}

export default Admin;


