// src/components/TopicsTable.jsx
import React, { useEffect, useState } from "react";

export default function TopicsTable() {
  const [topics, setTopics] = useState({});

  useEffect(() => {
    fetch("http://localhost:8000/topics/details")
      .then(res => res.json())
      .then(data => setTopics(data));
  }, []);

  return (
    <div>
      <h2>Topics</h2>
      <table>
        <thead>
          <tr>
            <th>Topic</th>
            <th>Partitions</th>
            <th>Leader</th>
            <th>Replicas</th>
            <th>ISR</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(topics).map(([name, info]) =>
            info.partitions.map(p => (
              <tr key={`${name}-${p.partition}`}>
                <td>{name}</td>
                <td>{p.partition}</td>
                <td>{p.leader}</td>
                <td>{p.replicas.join(", ")}</td>
                <td>{p.isr.join(", ")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}