import { useEffect, useState } from "react";
import axios from "axios";
import React from "react";


export default function AnimalList() {
  const [animais, setAnimais] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:3000/animais")
      .then(res => setAnimais(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Lista de Animais</h2>
      <ul>
        {animais.map(animal => (
          <li key={animal.id_animal}>
            {animal.nome} - {animal.especie} ({animal.raca})
          </li>
        ))}
      </ul>
    </div>
  );
}
