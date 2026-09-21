import networkx as nx
import pandas as pd
from typing import Dict, Any, List, Tuple

def compute_graph_metrics(df_files: pd.DataFrame, df_usb: pd.DataFrame) -> Tuple[nx.Graph, pd.DataFrame]:
    G = nx.Graph()
    
    # 1. Add file access edges
    if not df_files.empty:
        for _, row in df_files.iterrows():
            u = str(row["employee_id"])
            f = str(row["file"])
            G.add_node(u, node_type="employee")
            G.add_node(f, node_type="file")
            G.add_edge(u, f, edge_type="file_access", weight=1)
            
    # 2. Add USB usage edges
    if not df_usb.empty:
        for _, row in df_usb.iterrows():
            u = str(row["employee_id"])
            d = str(row["device"])
            G.add_node(u, node_type="employee")
            G.add_node(d, node_type="device")
            G.add_edge(u, d, edge_type="usb_device", weight=1)
            
    degrees = nx.degree_centrality(G) if len(G.nodes) > 0 else {}
    betweenness = nx.betweenness_centrality(G) if len(G.nodes) > 0 else {}
    
    user_nodes = [n for n, attr in G.nodes(data=True) if attr.get("node_type") == "employee"]
    graph_features = []
    for u in user_nodes:
        graph_features.append({
            "employee_id": u,
            "degree_centrality": round(float(degrees.get(u, 0.0)), 4),
            "betweenness_centrality": round(float(betweenness.get(u, 0.0)), 4)
        })
        
    df_graph = pd.DataFrame(graph_features) if graph_features else pd.DataFrame(columns=["employee_id", "degree_centrality", "betweenness_centrality"])
    return G, df_graph

def export_graph_for_ui(G: nx.Graph, at_risk_users: List[str] = None) -> Dict[str, Any]:
    if at_risk_users is None:
        at_risk_users = []
        
    nodes = []
    edges = []
    
    for n, data in G.nodes(data=True):
        ntype = data.get("node_type", "entity")
        is_risky = n in at_risk_users
        
        color = "#ef4444" if is_risky else ("#3b82f6" if ntype == "employee" else ("#10b981" if ntype == "file" else "#8b5cf6"))
        size = 28 if is_risky else (20 if ntype == "employee" else 14)
        
        nodes.append({
            "id": n,
            "label": n,
            "type": ntype,
            "color": color,
            "size": size,
            "is_risk": is_risky
        })
        
    for u, v, data in G.edges(data=True):
        etype = data.get("edge_type", "access")
        edges.append({
            "from": u,
            "to": v,
            "type": etype,
            "color": "#64748b" if etype == "file_access" else "#a855f7"
        })
        
    return {"nodes": nodes, "edges": edges}
