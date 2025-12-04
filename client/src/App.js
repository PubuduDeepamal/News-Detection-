import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { ThemeProvider } from './ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DetectionPage from './pages/DetectionPage';
import ResourcesPage from './pages/ResourcesPage';
import ExtensionPage from './pages/ExtensionPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          <Header />
          <Box
            component="main"
            sx={{
              flex: 1,
              py: 4,
              px: { xs: 2, sm: 3 },
            }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/detection" element={<DetectionPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/extension" element={<ExtensionPage />} />
            </Routes>
          </Box>
          <Footer />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
