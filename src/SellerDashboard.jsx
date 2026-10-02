function SellerDashboard({ onAddProduct, onEditProduct, onDeleteProduct }) {
  return (
    <section className="seller-dashboard">
      <div className="container">
        <h2>Seller Dashboard</h2>
        <p>Welcome to your AfriMarket seller dashboard.</p>

        <div className="seller-dashboard-actions">
          <button type="button" onClick={onAddProduct}>
            Add Product
          </button>

          <button type="button" onClick={onEditProduct}>
            Edit Product
          </button>

          <button type="button" onClick={onDeleteProduct}>
            Delete Product
          </button>
        </div>
      </div>
    </section>
  );
}

export default SellerDashboard;

