function Cart({
  items = [],
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
      <h1>Your Shopping Cart</h1>
      {items.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <button onClick={onContinueShopping}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <>
          {items.map((item, index) => (
            <div className="cart-item" key={item.id || index}>
              <div>
                <h2>{item.name}</h2>
                <p>
  Quantity:
  <button
    type="button"
    onClick={() => onDecrease(index)}
  >
    −
  </button>

  <span>{item.quantity || 0}</span>

  <button
    type="button"
    onClick={() => onIncrease(index)}
  >
    +
  </button>
</p>
              </div>
              <strong>
                {typeof item.price === "number"
                  ? `₦${item.price.toLocaleString()}`
                  : item.price}
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
