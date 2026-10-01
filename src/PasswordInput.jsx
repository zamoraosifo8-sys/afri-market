import { useState } from "react";

function PasswordInput(props) {
  const [showPassword, setShowPassword] = useState(false);
  const label = showPassword ? "Hide password" : "Show password";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        {...props}
        type={showPassword ? "text" : "password"}
        style={{
          ...props.style,
          boxSizing: "border-box",
          paddingRight: "3.25rem",
        }}
      />

      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setShowPassword((visible) => !visible)}
        style={{
          position: "absolute",
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "1.1rem",
          padding: "4px",
        }}
      >
        {showPassword ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

export default PasswordInput;
