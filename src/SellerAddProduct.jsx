function SellerAddProduct() {
  return (
    <section className="seller-add-product">
      <div className="container">
        <h2>Add Product</h2>

        <p>Add a new product to your AfriMarket store.</p>

        <form
          onSubmit={async (event) => {
            event.preventDefault();

            const form = event.currentTarget;
            const imageUrl = form
              .querySelector('input[placeholder="Image URL"]')
              .value.trim();
            const imageFile = form.querySelector('input[type="file"]').files[0];

            let image = imageUrl;

            if (imageFile) {
              if (!imageFile.type.startsWith("image/")) {
                alert("Please choose an image file.");
                return;
              }

              if (imageFile.size > 5 * 1024 * 1024) {
                alert("Please choose an image smaller than 5 MB.");
                return;
              }

              try {
                image = await new Promise((resolve, reject) => {
                  const reader = new FileReader();

                  reader.onload = () => resolve(reader.result);
                  reader.onerror = () =>
                    reject(new Error("Could not read that image file."));

                  reader.readAsDataURL(imageFile);
                });
              } catch (error) {
                alert(error.message);
                return;
              }
            }

            const name = form
              .querySelector('input[placeholder="Product Name"]')
              .value.trim();
            const description = form
              .querySelector('textarea[placeholder="Product Description"]')
              .value.trim();
            const price = form.querySelector('input[placeholder="Price"]').value;
            const quantity = form.querySelector(
              'input[placeholder="Quantity"]'
            ).value;
            const category = form
              .querySelector('input[placeholder="Category"]')
              .value.trim();

            try {
              const response = await fetch(
                "/api/products",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem(
                      "afriMarketSellerToken"
                    )}`,
                  },
                  body: JSON.stringify({
                    name,
                    description,
                    price,
                    quantity,
                    category,
                    image,
                  }),
                }
              );

              const data = await response.json();

              if (!response.ok || !data.status) {
                throw new Error(data.message || "Product could not be added.");
              }

              alert(data.message);
              form.reset();
            } catch (error) {
              console.error("Add product error:", error);
              alert(error.message || "Could not connect to AfriMarket.");
            }
          }}
        >
          <label>
            Image URL (optional)
            <input type="url" placeholder="Image URL" />
          </label>

          <label>
            Or choose an image file (maximum 5 MB)
            <input type="file" accept="image/*" />
          </label>

          <input type="text" placeholder="Product Name" required />

          <textarea
            placeholder="Product Description"
            required
          ></textarea>

          <input type="number" placeholder="Price" required />

          <input type="number" placeholder="Quantity" required />

          <input type="text" placeholder="Category" required />

          <button type="submit">Add Product</button>
        </form>
      </div>
    </section>
  );
}

export default SellerAddProduct;
