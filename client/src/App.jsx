import { useEffect } from "react";

function App() {
  useEffect(() => {
    fetch("http://localhost:5000")
      .then((res) => res.text())
      .then((data) => console.log(data));
  }, []);

  return (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">Connected to Backend ✅</h1>
    </div>
  );
}

export default App;
