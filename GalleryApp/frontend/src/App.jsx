import { useEffect, useState } from "react";

function App() {
  const [health, setHealth] = useState("loading...");

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setHealth(`${data.status} (${data.timestampUtc})`))
      .catch(() => setHealth("backend unavailable"));
  }, []);

  return (
    <main style={{ fontFamily: "Segoe UI, sans-serif", padding: "2rem" }}>
      <h1>Gallery App</h1>
      <p>React frontend is running.</p>
      <p>Backend health: {health}</p>
    </main>
  );
}

export default App;
