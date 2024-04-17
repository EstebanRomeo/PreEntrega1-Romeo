import React from 'react'

const registerHandlebars = () => {
  return (
    <div>
        <h1>Registro de Usuario</h1>
    <form action="/register" method="POST">
        <label for="username">Nombre de usuario:</label>
        <input type="text" id="username" name="username" required></input>
        <label for="email">Correo electrónico:</label>
        <input type="email" id="email" name="email" required></input>
        <label for="password">Contraseña:</label>
        <input type="password" id="password" name="password" required></input>
        <button type="submit">Registrarse</button>
    </form>
    <p>¿Ya tienes una cuenta? <a href="/login">Inicia sesión aquí</a></p>
    </div>
  )
}

export default registerHandlebars