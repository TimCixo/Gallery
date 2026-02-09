import { useEffect, useState } from "react";

function App() {
  const [health, setHealth] = useState("loading...");
  const [inputValue, setInputValue] = useState("");
  const [submittedText, setSubmittedText] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setHealth(`${data.status} (${data.timestampUtc})`))
      .catch(() => setHealth("backend unavailable"));
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmittedText(inputValue.trim());
  };

  return (
    <main
      style={{
        fontFamily: "Segoe UI, sans-serif",
        minHeight: "100vh",
        margin: 0,
        backgroundColor: "#f4f6f8",
      }}
    >
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "1rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #d9dee3",
          backgroundColor: "#ffffff",
          position: "sticky",
          top: 0,
        }}
      >
        <a
          href="/"
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#111827",
            textDecoration: "none",
            justifySelf: "start",
          }}
        >
          Gallery
        </a>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "0.5rem",
            width: "min(760px, 100%)",
            justifySelf: "center",
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Type text..."
            style={{
              width: "min(620px, 65vw)",
              padding: "0.55rem 0.7rem",
              border: "1px solid #c6ccd2",
              borderRadius: "0.45rem",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.55rem 0.85rem",
              border: "1px solid #0f172a",
              borderRadius: "0.45rem",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </form>

        <button
          type="button"
          style={{
            justifySelf: "end",
            fontSize: "0.8rem",
            padding: "0.4rem 0.65rem",
            border: "1px solid #c6ccd2",
            borderRadius: "0.45rem",
            backgroundColor: "#ffffff",
            cursor: "pointer",
          }}
        >
          Upload
        </button>
      </header>

      <section style={{ padding: "1.25rem 1rem" }}>
        <p>React frontend is running.</p>
        <p>Backend health: {health}</p>
        {submittedText ? <p>Last submitted: {submittedText}</p> : null}
      </section>
    </main>
  );
}

export default App;
