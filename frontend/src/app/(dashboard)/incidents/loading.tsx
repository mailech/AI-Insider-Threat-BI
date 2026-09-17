export default function IncidentsLoading() {
  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            height:          '32px',
            width:           '320px',
            backgroundColor: '#1E2640',
            borderRadius:    '6px',
            marginBottom:    '8px',
            animation:       'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
        <div
          style={{
            height:          '16px',
            width:           '480px',
            backgroundColor: '#161C2E',
            borderRadius:    '4px',
            animation:       'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      </div>

      {/* Stat Cards skeleton */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap:                 '16px',
          marginBottom:        '24px',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height:          '100px',
              backgroundColor: '#161C2E',
              border:          '1px solid #2A3352',
              borderRadius:    '8px',
              padding:         '16px 20px',
            }}
          >
            <div
              style={{
                height:          '12px',
                width:           '100px',
                backgroundColor: '#1E2640',
                borderRadius:    '4px',
                marginBottom:    '12px',
              }}
            />
            <div
              style={{
                height:          '28px',
                width:           '60px',
                backgroundColor: '#1E2640',
                borderRadius:    '4px',
              }}
            />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div
        style={{
          height:          '400px',
          backgroundColor: '#161C2E',
          border:          '1px solid #2A3352',
          borderRadius:    '8px',
          padding:         '20px',
          display:         'flex',
          flexDirection:   'column',
          gap:             '14px',
        }}
      >
        <div
          style={{
            height:          '40px',
            backgroundColor: '#111726',
            borderRadius:    '6px',
          }}
        />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height:          '44px',
              backgroundColor: '#1E2640',
              borderRadius:    '4px',
              opacity:         0.7,
            }}
          />
        ))}
      </div>
    </div>
  );
}
