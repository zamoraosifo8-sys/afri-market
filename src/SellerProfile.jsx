function SellerProfile({ onDashboard }) {
  const seller = JSON.parse(localStorage.getItem("afriMarketSeller") || "{}");
  return (
    <section className="seller-profile">
      <div className="container">
        <h2>Seller Profile</h2>

        <div className="seller-profile-actions"><button type="button" onClick={onDashboard}>Seller Dashboard</button></div>

        <div className="seller-profile-card">
          <p>
            <strong>Business Name:</strong> {seller.businessName || "Not available"}
          </p>

          <p>
            <strong>Seller Name:</strong> {seller.name || "Not available"}
          </p>

          <p>
            <strong>Email:</strong> {seller.email || "Not available"}
          </p>

          <p>
            <strong>Phone:</strong> {seller.phone || "Not available"}
          </p>

          <p>
            <strong>Store Status:</strong> Active
          </p>
        </div>
      </div>
    </section>
  );
}

export default SellerProfile;






