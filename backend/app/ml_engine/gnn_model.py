import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import networkx as nx
from typing import Dict, List, Tuple

class GraphConvolution(nn.Module):
    """Simple GCN layer implementing H^{(l+1)} = \sigma(\tilde{D}^{-1/2} \tilde{A} \tilde{D}^{-1/2} H^{(l)} W^{(l)})"""
    def __init__(self, in_features: int, out_features: int):
        super(GraphConvolution, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.weight = nn.Parameter(torch.FloatTensor(in_features, out_features))
        self.bias = nn.Parameter(torch.FloatTensor(out_features))
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.weight)
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        support = torch.mm(x, self.weight)
        output = torch.spmm(adj, support)
        return output + self.bias

class GraphAnomalyAutoencoder(nn.Module):
    """Graph Neural Network Autoencoder for node anomaly detection"""
    def __init__(self, nfeat: int, nhid: int, nembed: int):
        super(GraphAnomalyAutoencoder, self).__init__()
        self.gc1 = GraphConvolution(nfeat, nhid)
        self.gc2 = GraphConvolution(nhid, nembed)
        self.gc3 = GraphConvolution(nembed, nhid)
        self.gc4 = GraphConvolution(nhid, nfeat)
        
    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        h1 = F.relu(self.gc1(x, adj))
        z = F.relu(self.gc2(h1, adj))  # Graph Embedding
        h3 = F.relu(self.gc3(z, adj))
        reconstructed = self.gc4(h3, adj)
        return reconstructed, z

def normalize_adjacency(adj: np.ndarray) -> torch.Tensor:
    """Computes normalized adjacency matrix with added self-loops"""
    adj = adj + np.eye(adj.shape[0])
    rowsum = np.array(adj.sum(1))
    d_inv_sqrt = np.power(rowsum, -0.5, where=rowsum > 0).flatten()
    d_inv_sqrt[np.isinf(d_inv_sqrt)] = 0.
    d_mat_inv_sqrt = np.diag(d_inv_sqrt)
    normalized = adj.dot(d_mat_inv_sqrt).transpose().dot(d_mat_inv_sqrt)
    return torch.FloatTensor(normalized)

def train_and_evaluate_gnn(G: nx.Graph, node_features: Dict[str, List[float]]) -> Dict[str, float]:
    """Trains a PyTorch Graph Neural Network on the entity graph to produce GNN anomaly scores"""
    nodes = list(G.nodes())
    n = len(nodes)
    if n == 0:
        return {}
        
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    
    # Adjacency matrix
    adj = nx.to_numpy_array(G, nodelist=nodes)
    adj_tensor = normalize_adjacency(adj)
    
    # Feature matrix (dimension = 4)
    feat_dim = 4
    x_matrix = np.zeros((n, feat_dim), dtype=np.float32)
    for i, node in enumerate(nodes):
        if node in node_features and len(node_features[node]) >= feat_dim:
            x_matrix[i] = node_features[node][:feat_dim]
        else:
            deg = G.degree(node)
            x_matrix[i] = [deg, deg * 0.5, 1.0 if str(node).startswith("EMP") else 0.0, 0.5]
            
    x_tensor = torch.FloatTensor(x_matrix)
    
    # Instantiate PyTorch GNN Autoencoder
    model = GraphAnomalyAutoencoder(nfeat=feat_dim, nhid=8, nembed=4)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=1e-4)
    
    # Train GNN
    model.train()
    for _ in range(40):
        optimizer.zero_grad()
        recon, _ = model(x_tensor, adj_tensor)
        loss = F.mse_loss(recon, x_tensor)
        loss.backward()
        optimizer.step()
        
    # Evaluate node reconstruction anomaly scores
    model.eval()
    with torch.no_grad():
        recon, _ = model(x_tensor, adj_tensor)
        reconstruction_error = torch.mean((recon - x_tensor) ** 2, dim=1).numpy()
        
    gnn_scores = {}
    for i, node in enumerate(nodes):
        if str(node).startswith("EMP"):
            gnn_scores[node] = round(float(reconstruction_error[i]), 4)
            
    return gnn_scores
