import React from "react";
import { 
  FiMenu, FiX 
} from "react-icons/fi";
import "./MenuToggle.css";

export default function MenuToggle({ isOpen, onClick }) {
  return (
    <button 
      className={`menu-toggle-premium ${isOpen ? 'active' : ''}`} 
      onClick={onClick}
      aria-label="Alternar Menu"
      aria-expanded={isOpen}
      aria-controls="app-navigation"
    >
      {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
    </button>
  );
}
