import { useState } from "react";
import PasswordInput from "./PasswordInput";
function CustomerLogin({ onBack, onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      alert("Email and password are required.");
      return;
    }

    try {
      const response = await fetch(
        "/api/customers/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        alert(data.message || "Login failed.");
        return;
      }

      localStorage.setItem(
        "afriMarketCustomer",
        JSON.stringify(data.customer)
      );
      localStorage.setItem("afriMarketCustomerToken", data.token);

      alert("Login successful! Welcome back to AfriMarket");

      if (onLoggedIn) {
        onLoggedIn();
      }
    } catch (error) {
      console.error("Customer login error:", error);
      alert("Could not connect to AfriMarket. Please try again.");
    }
  };

  return (
    <div>
      {onBack && (
        <button type="button" onClick={onBack}>&#128281; Back</button>
      )}

      <h2>Customer Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordInput
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default CustomerLogin;







