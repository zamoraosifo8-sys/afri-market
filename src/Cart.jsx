function Cart({
  items = [],
  onBack,
  onContinueShopping,
  onRemove,
  onIncrease,
  onDecrease,
  onCheckout,
}) {
  const total = items.reduce((sum, item) => {
    const price =
      typeof item.price === "number"
        ? item.price
        : parseFloat(String(item.price).replace(/[₦,]/g, "")) || 0;
    return sum + price * (Number(item.quantity) || 0);
  }, 0);

  return (
    <div className="cart-page">
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        🔙 Back
      </button>

      <h1>Your Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <button type="button" onClick={onContinueShopping}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          {items.map((item, index) => (
            <div className="cart-item" key={item.id || index}>
              <div>
                <h2>{item.name}</h2>

                <div className="quantity-row">
                  <span>Quantity:</span>

                  <div className="quantity-control">
                    <button
                      type="button"
                      className="quantity-button"
                      onClick={() => onIncrease(index)}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>

                    <span className="quantity-value">
                      {item.quantity || 0}
                    </span>

                    <button
                      type="button"
                      className="quantity-button"
                      onClick={() => onDecrease(index)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              <strong>
                {(() => {
                  const price =
                    typeof item.price === "number"
                      ? item.price
                      : parseFloat(
                          String(item.price).replace(/[^\d.]/g, "")
                        ) || 0;

                  return (
                    String.fromCharCode(0x20a6) +
                    (price * (Number(item.quantity) || 0)).toLocaleString()
                  );
                })()}
              </strong>

              <button
                type="button"
                onClick={() => onRemove(index)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="cart-total">
            <h2>Total: ₦{total.toLocaleString()}</h2>

            <button type="button" onClick={onCheckout}>
              Proceed to Checkout
            </button>

            <button type="button" onClick={onContinueShopping}>
              Continue Shopping
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
