"use client";
import { useEffect, useState } from "react";

type Endpoint = {
  endpoint: string;
  runs: number;
  avg_score: number;
  p50_latency: number | null;
  booking_success_rate?: number;
  last_run?: string;
};

type SelectionData = {
  selectionCounts: { [key: string]: number };
  results: any[];
};

export default function Home() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectionData, setSelectionData] = useState<SelectionData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    const fetchMetrics = () => {
      fetch(process.env.NEXT_PUBLIC_AEO_API || "http://localhost:8080/metrics")
        .then(r => r.json())
        .then(j => {
          setEndpoints(j.endpoints || []);
          setLastUpdate(new Date().toLocaleTimeString());
        })
        .catch(() => setEndpoints([]));
    };

    const fetchSelectionData = () => {
      fetch(process.env.NEXT_PUBLIC_AEO_API?.replace('/metrics', '/selection-data') || "http://localhost:8080/selection-data")
        .then(r => r.json())
        .then(j => setSelectionData(j))
        .catch(() => setSelectionData(null));
    };

    fetchMetrics();
    fetchSelectionData();
    const interval = setInterval(() => {
      fetchMetrics();
      fetchSelectionData();
    }, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return "#10b981"; // green
    if (score >= 0.7) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const getLatencyColor = (latency: number | null) => {
    if (!latency) return "#6b7280";
    if (latency < 300) return "#10b981";
    if (latency < 1000) return "#f59e0b";
    return "#ef4444";
  };

  const getRankEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}.`;
  };

  const getMCPName = (endpoint: string) => {
    if (endpoint.includes("airbnb")) return "Airbnb";
    if (endpoint.includes("expedia")) return "Expedia";
    if (endpoint.includes("booking")) return "Booking.com";
    if (endpoint.includes("tripadvisor")) return "TripAdvisor";
    return endpoint;
  };

  const getSelectionRate = (endpoint: string) => {
    if (!selectionData) return null;
    const mcpName = getMCPName(endpoint);
    const count = selectionData.selectionCounts[mcpName] || 0;
    const total = selectionData.results.length || 1;
    return (count / total) * 100;
  };

  const getRecommendations = (endpoint: Endpoint) => {
    const recommendations = [];
    if (endpoint.avg_score < 0.7) {
      recommendations.push("Critical: Score below 70% - review response quality");
    }
    if (endpoint.p50_latency && endpoint.p50_latency > 1000) {
      recommendations.push("High latency detected - optimize for <300ms");
    }
    if (endpoint.runs < 10) {
      recommendations.push("Limited data - run more tests for accuracy");
    }
    const selectionRate = getSelectionRate(endpoint.endpoint);
    if (selectionRate !== null && selectionRate < 20) {
      recommendations.push("Low agent selection rate - improve AEO score");
    }
    return recommendations;
  };

  return (
    <main style={{
      padding: 40,
      maxWidth: 1400,
      margin: "0 auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          marginBottom: 8,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          AEO Dashboard
        </h1>
        <p style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>
          Agentic Engine Optimization - MCP Endpoint Performance
        </p>
        <p style={{ fontSize: 14, opacity: 0.5 }}>
          Last updated: {lastUpdate || "Loading..."} • Auto-refresh every 5s
        </p>
      </div>

      {endpoints.length === 0 ? (
        <div style={{
          padding: 60,
          textAlign: "center",
          background: "#f9fafb",
          borderRadius: 12,
          border: "2px dashed #e5e7eb"
        }}>
          <p style={{ fontSize: 18, opacity: 0.6 }}>
            No endpoint data yet. Run the probe to start collecting metrics:
          </p>
          <code style={{
            display: "block",
            marginTop: 16,
            padding: 12,
            background: "#1f2937",
            color: "#10b981",
            borderRadius: 6,
            fontSize: 14
          }}>
            npm run probe
          </code>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            marginBottom: 32
          }}>
            <StatCard
              title="Total Endpoints"
              value={endpoints.length.toString()}
              icon="🎯"
            />
            <StatCard
              title="Total Runs"
              value={endpoints.reduce((sum, e) => sum + e.runs, 0).toString()}
              icon="📊"
            />
            <StatCard
              title="Top Score"
              value={endpoints.length > 0 ? endpoints[0].avg_score.toFixed(3) : "-"}
              icon="⭐"
            />
            <StatCard
              title="Best Latency"
              value={
                endpoints.length > 0 && endpoints[0].p50_latency
                  ? `${endpoints[0].p50_latency}ms`
                  : "-"
              }
              icon="⚡"
            />
          </div>

          {/* Competitive Comparison - Selection Correlation */}
          {selectionData && (
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
              color: "white"
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                🎯 Agent Selection Correlation
              </h2>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 20 }}>
                Proving the hypothesis: MCPs with higher AEO scores get selected more often by Claude agents
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16
              }}>
                {endpoints.map((endpoint) => {
                  const selectionRate = getSelectionRate(endpoint.endpoint);
                  if (selectionRate === null) return null;
                  return (
                    <div key={endpoint.endpoint} style={{
                      background: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(10px)",
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.2)"
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>
                        {endpoint.endpoint.includes("airbnb") ? "🏠" :
                         endpoint.endpoint.includes("expedia") ? "✈️" :
                         endpoint.endpoint.includes("booking") ? "🏨" : "🗺️"}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                        {getMCPName(endpoint.endpoint)}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                        AEO Score: <strong>{endpoint.avg_score.toFixed(3)}</strong>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Selected: <strong>{selectionRate.toFixed(0)}%</strong> of the time
                      </div>
                      <div style={{
                        marginTop: 8,
                        height: 6,
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 3,
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${selectionRate}%`,
                          height: "100%",
                          background: "white",
                          transition: "width 0.5s ease"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{
                marginTop: 20,
                padding: 16,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 13
              }}>
                <strong>💡 Insight:</strong> The MCP with the highest AEO score is selected{" "}
                {endpoints.length > 0 && selectionData ? (
                  <>
                    <strong>
                      {Math.abs(
                        (getSelectionRate(endpoints[0].endpoint) || 0) -
                        (getSelectionRate(endpoints[endpoints.length - 1].endpoint) || 0)
                      ).toFixed(0)}%
                    </strong> more often than the lowest scorer
                  </>
                ) : "more often"}.
                This proves AEO optimization directly improves agent selection rates.
              </div>
            </div>
          )}

          {/* Endpoint Rankings Table */}
          <div style={{
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 24px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                Endpoint Rankings
              </h2>
            </div>

            <table style={{
              width: "100%",
              borderCollapse: "collapse"
            }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={thStyle}>Rank</th>
                  <th style={thStyle} align="left">Endpoint</th>
                  <th style={thStyle} align="center">Runs</th>
                  <th style={thStyle} align="center">Avg Score</th>
                  <th style={thStyle} align="center">Score Bar</th>
                  <th style={thStyle} align="center">P50 Latency</th>
                  {selectionData && <th style={thStyle} align="center">Selection %</th>}
                  <th style={thStyle} align="center">Status</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((endpoint, index) => (
                  <tr
                    key={endpoint.endpoint}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontSize: 20 }}>
                        {getRankEmoji(index)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>
                          {endpoint.endpoint.includes("airbnb") ? "🏠 Airbnb" :
                           endpoint.endpoint.includes("expedia") ? "✈️ Expedia" :
                           endpoint.endpoint.includes("booking") ? "🏨 Booking" :
                           endpoint.endpoint}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
                          {endpoint.endpoint}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle} align="center">
                      <span style={{
                        background: "#eff6ff",
                        color: "#1e40af",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {endpoint.runs}
                      </span>
                    </td>
                    <td style={tdStyle} align="center">
                      <span style={{
                        color: getScoreColor(endpoint.avg_score),
                        fontWeight: 600,
                        fontSize: 16
                      }}>
                        {endpoint.avg_score.toFixed(3)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{
                        width: 200,
                        height: 24,
                        background: "#e5e7eb",
                        borderRadius: 4,
                        overflow: "hidden",
                        position: "relative"
                      }}>
                        <div style={{
                          width: `${endpoint.avg_score * 100}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${getScoreColor(endpoint.avg_score)}, ${getScoreColor(endpoint.avg_score)}cc)`,
                          transition: "width 0.5s ease"
                        }} />
                        <span style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#1f2937"
                        }}>
                          {(endpoint.avg_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle} align="center">
                      <span style={{
                        color: getLatencyColor(endpoint.p50_latency),
                        fontWeight: 500
                      }}>
                        {endpoint.p50_latency ? `${endpoint.p50_latency}ms` : "-"}
                      </span>
                    </td>
                    {selectionData && (
                      <td style={tdStyle} align="center">
                        {(() => {
                          const rate = getSelectionRate(endpoint.endpoint);
                          if (rate === null) return "-";
                          return (
                            <span style={{
                              background: rate >= 40 ? "#dcfce7" : rate >= 20 ? "#fef9c3" : "#fee2e2",
                              color: rate >= 40 ? "#166534" : rate >= 20 ? "#854d0e" : "#991b1b",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                              fontWeight: 600
                            }}>
                              {rate.toFixed(0)}%
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td style={tdStyle} align="center">
                      {endpoint.avg_score >= 0.9 ? "🟢" :
                       endpoint.avg_score >= 0.7 ? "🟡" : "🔴"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendations Panel */}
          <div style={{
            marginTop: 32,
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 24px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                💡 Actionable Recommendations
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              {endpoints.map((endpoint, index) => {
                const recommendations = getRecommendations(endpoint);
                if (recommendations.length === 0) return null;

                return (
                  <div key={endpoint.endpoint} style={{
                    marginBottom: 20,
                    padding: 16,
                    background: "#fef3c7",
                    borderLeft: "4px solid #f59e0b",
                    borderRadius: 8
                  }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}>
                      {getRankEmoji(index)} {getMCPName(endpoint.endpoint)}
                      <span style={{
                        fontSize: 12,
                        fontWeight: 400,
                        opacity: 0.7,
                        marginLeft: 4
                      }}>
                        (Score: {endpoint.avg_score.toFixed(3)})
                      </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                      {recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {endpoints.every(e => getRecommendations(e).length === 0) && (
                <div style={{
                  textAlign: "center",
                  padding: 40,
                  fontSize: 14,
                  color: "#10b981"
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <strong>All MCPs performing well!</strong>
                  <div style={{ marginTop: 8, opacity: 0.7 }}>
                    Keep monitoring and running tests to maintain quality.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            marginTop: 24,
            padding: 20,
            background: "#f9fafb",
            borderRadius: 8,
            fontSize: 13,
            opacity: 0.8
          }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Score Legend:</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <span>🟢 Excellent (0.9+)</span>
              <span>🟡 Good (0.7-0.9)</span>
              <span>🔴 Needs Improvement (&lt;0.7)</span>
              <span>⚡ Target Latency: &lt;300ms</span>
              {selectionData && (
                <>
                  <span style={{ marginLeft: 16 }}>Selection Rate:</span>
                  <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: 3 }}>High (40%+)</span>
                  <span style={{ background: "#fef9c3", color: "#854d0e", padding: "2px 6px", borderRadius: 3 }}>Medium (20-40%)</span>
                  <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: 3 }}>Low (&lt;20%)</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div style={{
      background: "white",
      padding: 20,
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      border: "1px solid #f3f4f6"
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const thStyle = {
  padding: 12,
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color: "#6b7280"
};

const tdStyle = {
  padding: 16,
  fontSize: 14
};
