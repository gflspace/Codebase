import React from 'react';

export default function TestPage() {
  return (
    <div style={{ padding: '50px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', color: '#333' }}>Admin Test Page</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>If you can see this, routing is working!</p>
      <p style={{ fontSize: '14px', color: '#999' }}>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}
