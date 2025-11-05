"use client";
import { useEffect, useState } from "react";

type Row = { endpoint: string; runs: number; avg_score: number; p50_latency: number | null };

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_AEO_API || "http://localhost:8080/metrics")
      .then(r => r.json())
      .then(j => setRows(j.endpoints || []))
      .catch(() => setRows([]));
  }, []);
  return (
    <main style={{ padding: 24 }}>
      <h1>AEO Visibility (Hotels)</h1>
      <p style={{ opacity: 0.7 }}>Endpoint ranking by selection score</p>
      <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Endpoint</th>
            <th align="right">Runs</th>
            <th align="right">Avg Score</th>
            <th align="right">P50 Latency (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.endpoint}>
              <td>{r.endpoint}</td>
              <td align="right">{r.runs}</td>
              <td align="right">{r.avg_score.toFixed(3)}</td>
              <td align="right">{r.p50_latency ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
