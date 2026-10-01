function ProductCard({
  name,
  price,
  image,
  onAddToCart,
  onViewDetails,
  onAddToWishlist,
  isInWishlist = false,
}) {
  return (
    <div className="product-card">
      <img src={image} alt={name} />

      <div className="product-info">
        <h3>{name}</h3>
        <p>
  {typeof price === "string" && price.startsWith("₦")
    ? price
    : `₦${Number(price || 0).toLocaleString()}`}
</p>

        <button type="button" onClick={onViewDetails}>
          View Details
        </button>

        <button type="button" onClick={onAddToCart}>
          Add to cart
        </button>

        <button type="button" onClick={onAddToWishlist}>
  {isInWishlist ? "Remove from Wishlist" : "♡ Wishlist"}
</button>
      </div>
    </div>
  );
}

export default ProductCard;