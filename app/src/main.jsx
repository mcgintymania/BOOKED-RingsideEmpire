import "./storage-shim.js";
import "./index.css";
import { createRoot } from "react-dom/client";
import BookedRingsideEmpire from "./App.jsx";

createRoot(document.getElementById("root")).render(<BookedRingsideEmpire />);
