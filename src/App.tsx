import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import DashboardPage from './pages/DashboardPage';
import IngredientsPage from './pages/IngredientsPage';
import RecipesPage from './pages/RecipesPage';
import DrinksPage from './pages/DrinksPage';
import ManualEntryPage from './pages/ManualEntryPage';
import SuppliersPage from './pages/SuppliersPage';
import { useInventoryStore } from './hooks/useInventoryStore';
import socketClient from './services/socketClient';
import AppShell from './components/layout/AppShell';

const App = () => {
  const { fetchSnapshot, registerSocketListeners } = useInventoryStore();

  useEffect(() => {
    fetchSnapshot();
    const cleanup = registerSocketListeners(socketClient);
    return () => {
      cleanup();
    };
  }, [fetchSnapshot, registerSocketListeners]);

  return (
    <AppShell>
      <Box component="main" sx={{ flex: 1, py: 1 }}>
        <Container maxWidth="lg" sx={{ py: 0 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/drinks" element={<DrinksPage />} />
            <Route path="/manual" element={<ManualEntryPage />} />
          </Routes>
        </Container>
      </Box>
    </AppShell>
  );
};

export default App;

