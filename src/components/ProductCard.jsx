function ProductCard({
  name,
  price,
  image,
  onViewDetails,
}) {
  return (
    <button
      type="button"
      className="product-card"
      onClick={onViewDetails}
      aria-label={`View details for ${name}`}
    >
      <img src={image} alt={name} />

      <div className="product-info">
        <h3>{name}</h3>
        <p>
          {typeof price === "string" && price.startsWith("₦")
            ? price
            : <>₦{Number(price || 0).toLocaleString()}</>}
        </p>
      </div>
    </button>
  );
}

export default ProductCard;
