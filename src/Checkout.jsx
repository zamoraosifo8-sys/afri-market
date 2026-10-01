import { useState, useEffect } from "react";
import OrderSuccess from "./OrderSuccess";

function Checkout({ items, onBackToCart, onPaymentSuccess }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
const [deliveryAddress, setDeliveryAddress] = useState("");
const [city, setCity] = useState("");
const [country, setCountry] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");

  function getPrice(price) {
    if (typeof price === "number") {
      return price;
    }

    return (
      parseFloat(
        String(price)
          .replace(/[₦$,]/g, "")
          .trim()
      ) || 0
    );
  }

  const total = items.reduce(
    (sum, item) => sum + getPrice(item.price) * (Number(item.quantity) || 0),
    0
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");

    if (!reference) {
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(
          `/api/paystack/verify/${reference}`
        );

        const data = await response.json();

        if (!response.ok || !data.status) {
          throw new Error(
            data.message || "Payment verification failed."
          );
        }

        console.log("Paystack verification:", data);

        if (data.data.status === "success") {
          const orderSaved = await onPaymentSuccess(reference);

          if (!orderSaved) {
            return;
          }

          window.history.replaceState({}, document.title, window.location.pathname);
          setPaymentReference(reference);
          setPaymentSuccess(true);
        } else {
          alert(`Payment status: ${data.data.status}`);
        }
      } catch (error) {
        console.error("Verification error:", error);
        alert(error.message || "Could not verify your payment.");
      }
    };

    verifyPayment();
  }, []);

  const handlePlaceOrder = async () => {
    try {
      if (!email) {
        if (
  !fullName.trim() ||
  !deliveryAddress.trim() ||
  !city.trim() ||
  !country.trim()
) {
  alert("Please complete all delivery information.");
  return;
}
        alert("Please enter your email address.");
        return;
      }

      // Paystack expects NGN in the smallest unit: kobo.
      const amount = Math.round(total * 100);

      const response = await fetch(
        "/api/paystack/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount,
            items,
            currency: "NGN",
            callback_url: "https://renovate-nylon-prolonged.ngrok-free.dev/",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(
          data.message || "Could not start Paystack payment."
        );
      }
localStorage.setItem(
  "afriMarketPendingOrder",
  JSON.stringify({
    reference: data.data.reference,
    items,
    deliveryInfo: {
      fullName: fullName.trim(),
      email: email.trim(),
      address: deliveryAddress.trim(),
      city: city.trim(),
      country: country.trim(),
    },
  })
);
      window.location.href = data.data.authorization_url;
    } catch (error) {
      console.error("Payment error:", error);
      alert(error.message || "Something went wrong with the payment.");
    }
  };

  if (paymentSuccess) {
    return (
      <OrderSuccess
        reference={paymentReference}
        onContinueShopping={onBackToCart}
      />
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-content">
        <div className="checkout-form">
         <h2>Delivery Information</h2>

<input
  type="text"
  placeholder="Full Name"
  value={fullName}
  onChange={(event) => setFullName(event.target.value)}
/>

<input
  type="email"
  placeholder="Email Address"
  value={email}
  onChange={(event) => setEmail(event.target.value)}
/>

<input
  type="text"
  placeholder="Delivery Address"
  value={deliveryAddress}
  onChange={(event) => setDeliveryAddress(event.target.value)}
/>

<input
  type="text"
  placeholder="City"
  value={city}
  onChange={(event) => setCity(event.target.value)}
/>

<input
  type="text"
  placeholder="Country"
  value={country}
  onChange={(event) => setCountry(event.target.value)}
/>
          <h2>Payment</h2>

          <p>Secure payment will be available here.</p>

          <button onClick={handlePlaceOrder}>
            Place Order
          </button>
        </div>

        <div className="checkout-summary">
          <h2>Order Summary</h2>

          {items.map((item, index) => {
            const itemPrice = getPrice(item.price);
            const itemTotal =
              itemPrice * (Number(item.quantity) || 0);

            return (
              <div key={index}>
                <p>
                  {item.name} × {item.quantity}
                </p>

                <strong>
                  ₦{itemTotal.toLocaleString()}
                </strong>
              </div>
            );
          })}

          <h2> Total: ₦{total.toLocaleString()}</h2>

          <button onClick={onBackToCart}>
            Back to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default Checkout;


