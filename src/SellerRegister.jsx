import PasswordInput from "./PasswordInput";
function SellerRegister() {
  const handleSellerSubmit = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;

    const businessName = form
      .querySelector('input[placeholder="Business Name"]')
      .value.trim();
    const name = form
      .querySelector('input[placeholder="Your Name"]')
      .value.trim();
    const email = form
      .querySelector('input[placeholder="Email Address"]')
      .value.trim();
    const phone = form
      .querySelector('input[placeholder="Phone Number"]')
      .value.trim();
    const password = form.querySelector(
      'input[placeholder="Create Password"]'
    ).value;

    if (!businessName || !name || !email || !phone || !password) {
      alert("Please fill in all fields.");
      return;
    }

    try {
     const response = await fetch(
  "/api/sellers/register",
  {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessName,
            name,
            email,
            phone,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(
          data.message || "Seller registration failed."
        );
      }

      alert(data.message);

      form.reset();
    } catch (error) {
      console.error("Seller registration error:", error);
      alert("Sorry, seller registration could not be completed.");
    }
  };

  return (
    <section className="seller-register">
      <div className="container">
        <h2>Seller Registration</h2>

        <p>Join AfriMarket and start selling your products.</p>

        <form onSubmit={handleSellerSubmit}>
          <input
            type="text"
            placeholder="Business Name"
          />

          <input
            type="text"
            placeholder="Your Name"
          />

          <input
            type="email"
            placeholder="Email Address"
          />

          <input
            type="tel"
            placeholder="Phone Number"
          />

          <PasswordInput
  placeholder="Create Password"
/>

          <button type="submit">
            Register as a Seller
          </button>
        </form>
      </div>
    </section>
  );
}

export default SellerRegister;
