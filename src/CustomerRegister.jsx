import { useState } from "react";
import PasswordInput from "./PasswordInput";
function CustomerRegister({ onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      return alert("Please enter your full name.");
    }

    if (password.length < 6) {
      return alert("Password must be at least 6 characters long.");
    }

    if (!email.includes("@")) {
      return alert("Please enter a valid email address.");
    }

    try {
      const response = await fetch(
        "/api/customers/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        return alert(data.message || "Registration failed.");
      }

      alert("Registration successful! Welcome to AfriMarket ðŸŽ‰");

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Customer registration error:", error);
      alert("Could not connect to AfriMarket. Please try again.");
    }
  };

  return (
    <div>
      {onBack && (
        <button type="button" onClick={onBack}>&#128281; Back</button>
      )}

      <h2>Create AfriMarket Account</h2>

      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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

        <button type="submit">Create Account</button>
      </form>
    </div>
  );
}

export default CustomerRegister;


