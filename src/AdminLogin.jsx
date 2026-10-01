import { useState } from "react";
import PasswordInput from "./PasswordInput";
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.status) {
        localStorage.setItem("afriMarketAdminToken", data.token);
      }

      alert(data.message);
    } catch (error) {
      console.error("Admin login failed:", error);
      alert("Unable to connect to AfriMarket.");
    }
  }

  return (
    <section className="admin-login">
      <h2>Admin Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <PasswordInput
  placeholder="Admin password"
  value={password}
  onChange={(event) => setPassword(event.target.value)}
/>

        <button type="submit">Login</button>
      </form>
    </section>
  );
}

export default AdminLogin;
