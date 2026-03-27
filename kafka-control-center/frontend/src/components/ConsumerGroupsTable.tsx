// src/components/ConsumerGroupsTable.jsx
import React, { useEffect, useState } from "react";

export default function ConsumerGroupsTable({ onSelectGroup }) {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/consumer-groups")
      .then(res => res.json())
      .then(data => setGroups(data));
  }, []);

  return (
    <div>
      <h2>Consumer Groups</h2>
      <table>
        <thead>
          <tr>
            <th>Group ID</th>
            <th>State</th>
            <th>Protocol</th>
            <th>Members</th>
            <th>Lag</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <tr key={g.group_id} onClick={() => onSelectGroup(g.group_id)} style={{ cursor: "pointer" }}>
              <td>{g.group_id}</td>
              <td>{g.state}</td>
              <td>{g.protocol}</td>
              <td>{g.members}</td>
              <td>Voir</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}