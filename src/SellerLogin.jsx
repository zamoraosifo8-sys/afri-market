import PasswordInput from "./PasswordInput";
function SellerLogin({ onLoggedIn }) {
   const handleSellerLogin = async (e) => {
  e.preventDefault();

  const form = e.currentTarget;

  const email = form.querySelector('input[placeholder="Email Address"]').value.trim();
  const password = form.querySelector('input[placeholder="Password"]').value;

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  try {
    const response = await fetch(
      "/api/sellers/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(
        data.message || "Seller login failed."
      );
    }
localStorage.setItem("afriMarketSellerToken", data.token);
    localStorage.setItem("afriMarketSeller", JSON.stringify(data.seller));
    alert(data.message); if (onLoggedIn) onLoggedIn();
  } catch (error) {
    console.error("Seller login error:", error);
    alert(error.message);
  }
};
  return (
    <section className="seller-login">
      <div className="container">
        <h2>Seller Login</h2>

        <p>Log in to manage your AfriMarket store.</p>

        <form onSubmit={handleSellerLogin}>
          <input
            type="email"
            placeholder="Email Address"
          />

          <PasswordInput
  placeholder="Password"
  required
/>

          <button type="submit">
            Login as a Seller
          </button>
        </form>
      </div>
    </section>
  );
}

export default SellerLogin;



