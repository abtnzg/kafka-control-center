// src/components/BrokersTable.jsx
import React, { useEffect, useState } from "react";

export default function BrokersTable() {
  const [brokers, setBrokers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/brokers")
      .then(res => res.json())
      .then(data => setBrokers(data));
  }, []);

  return (
    <div>
      <h2>Brokers</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Host</th>
            <th>Port</th>
            <th>Rack</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map(b => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.host}</td>
              <td>{b.port}</td>
              <td>{b.rack || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}