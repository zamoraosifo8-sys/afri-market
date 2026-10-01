import { useEffect, useState } from "react";

function getConversationId() {
  let conversationId = localStorage.getItem("afriMarketSupportConversationId");

  if (!conversationId) {
    conversationId =
      window.crypto?.randomUUID?.() ||
      `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem("afriMarketSupportConversationId", conversationId);
  }

  return conversationId;
}

function CustomerChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationId] = useState(getConversationId);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isActive = true;

    async function loadMessages() {
      try {
        const response = await fetch(
          `/api/support/messages/${encodeURIComponent(
            conversationId
          )}`
        );

        const data = await response.json();

        if (isActive && response.ok && data.status) {
          setMessages(data.messages);
        }
      } catch (loadError) {
        console.error("Could not load support messages:", loadError);
      }
    }

    loadMessages();
    const intervalId = setInterval(loadMessages, 3000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [conversationId, open]);

  async function sendMessage() {
    const messageText = message.trim();

    if (!messageText || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch(
        "/api/support/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            text: messageText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || "Could not send your message.");
      }

      setMessages((currentMessages) => {
        const alreadyAdded = currentMessages.some(
          (currentMessage) => currentMessage.id === data.message.id
        );

        return alreadyAdded
          ? currentMessages
          : [...currentMessages, data.message];
      });

      setMessage("");
    } catch (sendError) {
      setError(sendError.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "none",
          background: "#000",
          color: "#fff",
          fontSize: "28px",
          cursor: "pointer",
          zIndex: 9999,
        }}
      >
        💬
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: "20px",
            bottom: "90px",
            width: "320px",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "12px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.2)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "15px",
              background: "#000",
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            AfriMarket Support
          </div>

          <div
            style={{
              padding: "15px",
              height: "200px",
              overflowY: "auto",
            }}
          >
            {messages.length === 0 && (
              <p>Hello! 👋 How can we help you?</p>
            )}

            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                style={{
                  textAlign:
                    chatMessage.sender === "customer" ? "right" : "left",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: "15px",
                    background:
                      chatMessage.sender === "customer" ? "#000" : "#eee",
                    color: chatMessage.sender === "customer" ? "#fff" : "#000",
                    maxWidth: "80%",
                  }}
                >
                  {chatMessage.text}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ color: "red", padding: "0 15px" }}>{error}</p>
          )}

          <div style={{ padding: "15px" }}>
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
              style={{
                width: "100%",
                padding: "10px",
                boxSizing: "border-box",
                marginBottom: "10px",
              }}
            />

            <button type="button" onClick={sendMessage} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomerChat;
