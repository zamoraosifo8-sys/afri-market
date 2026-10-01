function SellerDeleteProduct() {
  return (
    <section className="seller-delete-product">
      <div className="container">
        <h2>Delete Product</h2>

        <p>Remove a product from your AfriMarket store.</p>

        <form onSubmit={async (e) => {
          e.preventDefault();

          const form = e.currentTarget;
          const id = form
            .querySelector('input[placeholder="Product ID"]')
            .value.trim();

          try {
            const response = await fetch(
              `/api/products/${id}`,
              {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("afriMarketSellerToken")}`,
  },
}
            );

            const data = await response.json();

            if (!response.ok || !data.status) {
              throw new Error(
                data.message || "Product could not be deleted."
              );
            }

            alert(data.message);
            form.reset();
          } catch (error) {
            console.error("Delete product error:", error);
            alert(error.message);
          }
        }}>
          <input type="text" placeholder="Product ID" />

          <button type="submit">Delete Product</button>
        </form>
      </div>
    </section>
  );
}

export default SellerDeleteProduct;
