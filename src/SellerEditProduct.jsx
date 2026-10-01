function SellerEditProduct() {
  return (
    <section className="seller-edit-product">
      <div className="container">
        <h2>Edit Product</h2>

        <p>Update your AfriMarket product details.</p>

        <form onSubmit={async (e) => {
  e.preventDefault();

  const form = e.currentTarget;

  const id = form.querySelector('input[placeholder="Product ID"]').value.trim();
  const name = form.querySelector('input[placeholder="Product Name"]').value.trim();
  const description = form.querySelector('textarea[placeholder="Product Description"]').value.trim();
  const price = form.querySelector('input[placeholder="Price"]').value;
  const quantity = form.querySelector('input[placeholder="Quantity"]').value;
  const category = form.querySelector('input[placeholder="Category"]').value.trim();

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${localStorage.getItem("afriMarketAdminToken") || localStorage.getItem("afriMarketSellerToken")}`,
},
body: JSON.stringify({
        name,
        description,
        price,
        quantity,
        category,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Product could not be updated.");
    }

    alert(data.message);
    form.reset();
  } catch (error) {
    console.error("Edit product error:", error);
    alert(error.message);
  }
}}>
          <input
            type="text"
            placeholder="Product ID"
          />

          <input
            type="text"
            placeholder="Product Name"
          />

          <textarea
            placeholder="Product Description"
          ></textarea>

          <input
            type="number"
            placeholder="Price"
          />

          <input
            type="number"
            placeholder="Quantity"
          />

          <input
            type="text"
            placeholder="Category"
          />

          <button type="submit">
            Update Product
          </button>
        </form>
      </div>
    </section>
  );
}

export default SellerEditProduct;
