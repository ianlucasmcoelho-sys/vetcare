import { Link } from "react-router-dom";
import "./Navbar.css";
import React from "react";


export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/">Home</Link>
      <Link to="/responsaveis">Responsáveis</Link>
      <Link to="/animais">Animais</Link>
    </nav>
  );
}
