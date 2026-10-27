import React from 'react';
import { Link } from 'react-router-dom';
import './BackToDashboard.css';
import { FiArrowLeft } from 'react-icons/fi';

export default function BackToDashboard() {
  return <Link className="back-dashboard" to="/"><FiArrowLeft aria-hidden="true" /> Voltar ao dashboard</Link>;
}
