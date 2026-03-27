// src/App.jsx
import React, { useState } from "react";
import TopicsTable from "./components/TopicsTable";
import BrokersTable from "./components/BrokersTable";
import ConsumerGroupsTable from "./components/ConsumerGroupsTable";
import GroupLag from "./components/GroupLag";
import TopicStream from "./components/TopicStream";

export default function App() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>Kafka Control Center</h1>

      <BrokersTable />

      <TopicsTable />

      <ConsumerGroupsTable onSelectGroup={setSelectedGroup} />

      <GroupLag groupId={selectedGroup} />

      <TopicStream topic={selectedTopic || "test"} />
    </div>
  );
}