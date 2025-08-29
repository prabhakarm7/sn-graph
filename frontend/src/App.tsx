import React from 'react';
import TextToCypherDashboard from './components/TextToCypherDashboard';
import TextToCypherDashboardOld from './components/TextToCypherDashboardOld';
import ConsultingDashboard from './components/ConsultingDashboard';
import JPMNetworkDashboard from './components/JPMNetworkDashboard';
import ConsultantNetworkGraph from './components/ConsultantNetworkGraph';
import JPMGraphPreview from './components/JPMGraphPreview';
import JPMGraphPreviewEx from './components/JPMGraphPreviewEx';
import JPMGraphPreviewWithFilters from './components/JPMGraphPreviewWithFilters';

function App() {
  return (
    <div className="App">
      <JPMGraphPreviewWithFilters />
    </div>
  );
}

export default App;