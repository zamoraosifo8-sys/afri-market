import { useEffect, useState } from "react";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const adminToken = localStorage.getItem("afriMarketAdminToken");

    if (!adminToken) {
      setError("Please log in to Admin to view notifications.");
      return;
    }

    fetch("/api/admin/notifications", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok || !data.status) {
          throw new Error(data.message || "Could not load notifications.");
        }

        setNotifications(data.notifications || []);
      })
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  return (
    <section className="notifications-page">
      <h1>Notifications</h1>

      {error ? (
        <p>{error}</p>
      ) : notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li key={notification.id}>
              {notification.message} — {notification.date}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default Notifications;
