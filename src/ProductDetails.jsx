import { useEffect, useState } from "react";

function ProductDetails({
  product,
  onClose,
  onAddToCart,
  onAddToWishlist,
  isInWishlist = false,
}) {
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch(`/api/reviews/${encodeURIComponent(product.name)}`)
      .then(async (response) => {
        const data = await response.json();

        if (response.ok && data.status) {
          setReviews(data.reviews);
        }
      })
      .catch((error) => {
        console.error("Could not load reviews:", error);
      });
  }, [product.name]);

  async function submitReview() {
    if (!reviewText.trim()) {
      alert("Please write a review before submitting.");
      return;
    }

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: product.name,
          rating,
          text: reviewText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || "Could not save your review.");
      }

      setReviews((currentReviews) => [data.review, ...currentReviews]);
      setReviewText("");
      alert("Review submitted successfully!");
    } catch (error) {
      alert(error.message || "Could not save your review.");
    }
  }

  return (
    <section className="product-details">
      <div className="product-details-header">
        <button type="button" onClick={onClose}>
          Back to Shop
        </button>
        <h1>Product Details</h1>
      </div>

      <div className="product-details-main">
        <div className="product-details-image">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="product-details-info">
          <p className="product-details-category">{product.category}</p>
          <h2>{product.name}</h2>

          <p className="product-details-price">
            {typeof product.price === "string" &&
            product.price.trim().startsWith("\u20A6")
              ? product.price
              : `\u20A6${Number(
                  String(product.price ?? 0).replace(/,/g, "") || 0
                ).toLocaleString()}`}
          </p>

          <p className="product-details-description">
            {product.description}
          </p>

          <div className="product-details-actions">
            <button type="button" onClick={() => onAddToCart(product)}>
              Add to Cart
            </button>

            <button
              type="button"
              onClick={() => onAddToWishlist(product)}
            >
              {isInWishlist ? "Remove from Wishlist" : "Wishlist"}
            </button>
          </div>
        </div>
      </div>

      <div className="product-details-reviews">
        <h3>Ratings &amp; Reviews</h3>

        <p>Choose a rating:</p>

        <select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        >
          <option value="5">{"\u2B50".repeat(5)} 5 Stars</option>
          <option value="4">{"\u2B50".repeat(4)} 4 Stars</option>
          <option value="3">{"\u2B50".repeat(3)} 3 Stars</option>
          <option value="2">{"\u2B50".repeat(2)} 2 Stars</option>
          <option value="1">{"\u2B50"} 1 Star</option>
        </select>

        <textarea
          value={reviewText}
          onChange={(event) => setReviewText(event.target.value)}
          placeholder="Write your review..."
          rows="4"
        />

        <button type="button" onClick={submitReview}>
          Submit Review
        </button>

        {reviews.map((review) => (
          <div key={review.id} className="product-review">
            <p>
              <strong>Rating:</strong>{" "}
              {"\u2B50".repeat(Number(review.rating))}
            </p>
            <p>
              <strong>Review:</strong> {review.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ProductDetails;
