// src/components/GroupLag.jsx
import React, { useEffect, useState } from "react";

export default function GroupLag({ groupId }) {
  const [lagData, setLagData] = useState([]);

  useEffect(() => {
    if (!groupId) return;
    fetch(`http://localhost:8000/consumer-groups/${groupId}/lag`)
      .then(res => res.json())
      .then(data => setLagData(data));
  }, [groupId]);

  if (!groupId) return <div>Sélectionne un consumer group.</div>;

  return (
    <div>
      <h2>Lag par partition — {groupId}</h2>
      <table>
        <thead>
          <tr>
            <th>Topic</th>
            <th>Partition</th>
            <th>Current offset</th>
            <th>Latest offset</th>
            <th>Lag</th>
          </tr>
        </thead>
        <tbody>
          {lagData.map((p, idx) => (
            <tr key={idx}>
              <td>{p.topic}</td>
              <td>{p.partition}</td>
              <td>{p.current_offset}</td>
              <td>{p.latest_offset}</td>
              <td>{p.lag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}