import { useState } from "react";
import axios from "axios";
import React from "react";


export default function AnimalForm() {
  const [form, setForm] = useState({
    nome: "",
    especie: "",
    raca: "",
    idade: "",
    sexo: "",
    id_responsavel: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3000/animais", form);
      alert("Animal cadastrado com sucesso!");
    } catch (err) {
      alert("Erro ao cadastrar animal: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="nome" placeholder="Nome" onChange={handleChange} />
      <input name="especie" placeholder="Espécie" onChange={handleChange} />
      <input name="raca" placeholder="Raça" onChange={handleChange} />
      <input name="idade" type="number" placeholder="Idade" onChange={handleChange} />
      <input name="sexo" placeholder="Sexo" onChange={handleChange} />
      <input name="id_responsavel" placeholder="ID do Responsável" onChange={handleChange} />
      <button type="submit">Cadastrar</button>
    </form>
  );
}
