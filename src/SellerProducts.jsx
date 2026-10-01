import { useState } from "react";

function SellerProducts() {
  const [products, setProducts] = useState([]);

  const handleLoadProducts = async () => {
    try {
      const response = await fetch("/api/products", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("afriMarketSellerToken")}`,
  },
});
      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || "Could not load products.");
      }

      setProducts(data.products);
    } catch (error) {
      console.error("Load products error:", error);
      alert(error.message);
    }
  };

  return (
    <section className="seller-products">
      <div className="container">
        <h2>My Products</h2>
        <p>View the products in your AfriMarket store.</p>

        <button type="button" onClick={handleLoadProducts}>
          Load My Products
        </button>

        {products.length > 0 && (
          <div className="seller-product-list">
            {products.map((product) => (
              <div key={product.id}>
                <h3>{product.name}</h3>
                <p>Product ID: {product.id}</p>
                <p>Description: {product.description}</p>
                <p>Price: {product.price}</p>
                <p>Quantity: {product.quantity}</p>
                <p>Category: {product.category}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default SellerProducts;
