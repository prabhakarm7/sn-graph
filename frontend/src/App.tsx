import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import JPMGraphPerformanceOptimized from './components/JPMGraphPerformanceOptimized';

function App() {
  return (
    <div className="App">
      <Router>
        <Switch>
          {/* Landing page as default route */}
          <Route exact path="/" component={LandingPage} />
          
          {/* Main graph page */}
          <Route path="/graph" component={JPMGraphPerformanceOptimized} />
          
          {/* Redirect any unknown routes to landing page */}
          <Redirect to="/" />
        </Switch>
      </Router>
    </div>
  );
}

export default App;