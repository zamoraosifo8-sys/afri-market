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
      </div>
    </div>
  );
}

export default ProductCard;

