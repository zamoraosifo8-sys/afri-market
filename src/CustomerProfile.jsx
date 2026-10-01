import { useEffect, useState } from "react";

function CustomerProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");

  useEffect(() => {
  const savedCustomer = JSON.parse(
    localStorage.getItem("afriMarketCustomer")
  );
  const token = localStorage.getItem("afriMarketCustomerToken");

  if (!savedCustomer?.email || !token) {
    return;
  }

  setOriginalEmail(savedCustomer.email);

  fetch(
    `/api/customers/profile/${encodeURIComponent(
      savedCustomer.email
    )}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.status) {
        setName(data.customer.name);
        setEmail(data.customer.email);
      } else {
        if (data.message === "Customer not found.") {
  localStorage.removeItem("afriMarketCustomer");
  localStorage.removeItem("afriMarketCustomerToken");
} else {
  alert(data.message || "Could not load your profile.");
}
      }
    })
    .catch((error) => {
      console.error("Profile loading error:", error);
      alert("Could not connect to AfriMarket.");
    });
}, []);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      return alert("Name and email are required.");
    }

    try {
      const response = await fetch(
        `/api/customers/profile/${encodeURIComponent(
          originalEmail
        )}`,
        {
          method: "PUT",
          headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("afriMarketCustomerToken")}`,
},
          body: JSON.stringify({
            name: name.trim(),
            newEmail: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        return alert(data.message || "Profile update failed.");
      }

      localStorage.setItem(
        "afriMarketCustomer",
        JSON.stringify(data.customer)
      );

      setOriginalEmail(data.customer.email);

      alert("Profile updated successfully! 🎉");
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Could not connect to AfriMarket.");
    }
  };

  return (
    <div>
      <h2>My Profile</h2>

      <form onSubmit={handleSave}>
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

        <button type="submit">Save Profile</button>
      </form>
    </div>
  );
}

export default CustomerProfile;


