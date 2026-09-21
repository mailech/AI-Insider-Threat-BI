import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';

export const EntityGraph = ({ graphData, height = '500px', onSelectNode }) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !graphData || !graphData.nodes) return;

    const data = {
      nodes: graphData.nodes.map(n => ({
        id: n.id,
        label: n.label,
        shape: n.type === 'employee' ? 'dot' : (n.type === 'file' ? 'square' : 'triangle'),
        color: {
          background: n.color,
          border: n.is_risk ? '#ff0055' : '#ffffff',
          highlight: { background: '#06b6d4', border: '#ffffff' }
        },
        size: n.size || 18,
        font: { color: '#e2e8f0', size: 12, face: 'Plus Jakarta Sans' },
        borderWidth: n.is_risk ? 3 : 1
      })),
      edges: (graphData.edges || []).map((e, idx) => ({
        id: idx,
        from: e.from,
        to: e.to,
        color: { color: e.color || '#475569', opacity: 0.6 },
        width: 1.5,
        smooth: { type: 'continuous' }
      }))
    };

    const options = {
      physics: {
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.2,
          springLength: 120,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.8
        },
        stabilization: { iterations: 150 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true
      },
      nodes: {
        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 8 }
      }
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    if (onSelectNode) {
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          onSelectNode(params.nodes[0]);
        }
      });
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [graphData]);

  return (
    <div className="relative border border-slate-800 rounded-xl bg-[#0a0e17] overflow-hidden">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span> Critical/High Risk Entity</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> Normal Identity</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#10b981]"></span> File/Doc Resource</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#8b5cf6]"></span> USB Peripheral</span>
      </div>
      <div ref={containerRef} style={{ height, width: '100%' }} />
    </div>
  );
};
