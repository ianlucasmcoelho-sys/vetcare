// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../services/api.js';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [clinica, setClinica] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregarClinica = async () => {
    try {
      const response = await fetch(`${API_URL}/configuracoes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClinica(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da clínica:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');

    if (token && usuarioSalvo) {
      try {
        const usuarioData = JSON.parse(usuarioSalvo);
        setUsuario(usuarioData);
        carregarClinica();
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, usuarioData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuarioData));
    setUsuario(usuarioData);
    carregarClinica();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setClinica(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        clinica,
        setClinica,
        login,
        logout,
        loading,
        isAuthenticated,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
