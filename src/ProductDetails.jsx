import { useEffect, useState } from "react";

function ProductDetails({ product, onClose, onAddToCart }) {
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch(
      `/api/reviews/${encodeURIComponent(product.name)}`
    )
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
    <div className="product-details" style={{ padding: "20px" }}>
      <h1>PRODUCT DETAILS</h1>

      <button onClick={onClose}>Close</button>

      <img src={product.image} alt={product.name} />

      <h2>{product.name}</h2>
      <p>{product.category}</p>

      <p>
        {typeof product.price === "string" && product.price.startsWith("₦")
          ? product.price
          : `₦${Number(product.price || 0).toLocaleString()}`}
      </p>

      <p>{product.description}</p>
      <hr />

      <h3>Ratings &amp; Reviews</h3>
      <p>Choose a rating:</p>

      <select value={rating} onChange={(event) => setRating(event.target.value)}>
        <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
        <option value="4">⭐⭐⭐⭐ 4 Stars</option>
        <option value="3">⭐⭐⭐ 3 Stars</option>
        <option value="2">⭐⭐ 2 Stars</option>
        <option value="1">⭐ 1 Star</option>
      </select>

      <textarea
        value={reviewText}
        onChange={(event) => setReviewText(event.target.value)}
        placeholder="Write your review..."
        rows="4"
      />

      <button onClick={submitReview}>Submit Review</button>

      {reviews.map((review) => (
        <div key={review.id}>
          <p>
            <strong>Rating:</strong> {"⭐".repeat(Number(review.rating))}
          </p>
          <p>
            <strong>Review:</strong> {review.text}
          </p>
        </div>
      ))}

      <button onClick={() => onAddToCart(product)}>Add to cart</button>
    </div>
  );
}

export default ProductDetails;
