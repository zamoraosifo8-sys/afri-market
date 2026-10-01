function OrderSuccess({ reference, onContinueShopping }) {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>🎉 Payment Successful!</h1>

      <p>
        Thank you for your order. Your payment has been confirmed.
      </p>

      {reference && (
        <p>
          <strong>Order Reference:</strong> {reference}
        </p>
      )}

      <button onClick={onContinueShopping}>
        Continue Shopping
      </button>
    </div>
  );
}

export default OrderSuccess;
