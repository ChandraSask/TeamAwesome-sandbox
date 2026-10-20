import { useState } from "react";
import { appConfig } from "../appConfig";
import SaskTelLogo from "./SaskTelLogo";

export default function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("employee");

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onLogin({
      role,
      displayName: formData.get("username").trim(),
    });
  }

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <SaskTelLogo />
        <p className="eyebrow">WELCOME</p>
        <h1 id="login-title">Sign in to {appConfig.name}</h1>
        <p className="login-intro">
          Choose a demo role and enter any username and password to continue.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-role">I am signing in as</label>
          <select
            id="login-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>

          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Enter any username"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter any password"
            required
          />

          <button className="primary-button login-submit" type="submit">
            Continue
          </button>
        </form>
        <p className="login-demo-note">
          Demo only: these details are not checked or saved. This screen does
          not authenticate users or protect data.
        </p>
      </section>
      <footer className="login-footer">
        {appConfig.name}
        <span>Fictional local prototype · SaskTel</span>
      </footer>
    </main>
  );
}
