import { useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { useInventoryStore } from '../hooks/useInventoryStore';

const InventoryPage = () => {
  const { snapshot, loading, error } = useInventoryStore((state) => ({
    snapshot: state.snapshot,
    loading: state.loading,
    error: state.error
  }));

  const inventoryList = useMemo(() => {
    if (!snapshot) return [];
    return [...snapshot.inventory].sort((a, b) => {
      const aLow = a.stock <= a.reorderPoint ? 1 : 0;
      const bLow = b.stock <= b.reorderPoint ? 1 : 0;
      if (aLow !== bLow) return bLow - aLow;
      return a.name.localeCompare(b.name);
    });
  }, [snapshot]);

  if (loading && !snapshot) {
    return <Skeleton variant="rectangular" height={300} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Inventario
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Vista completa del inventario actual
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!snapshot ? (
        <Typography>Sin datos disponibles aún.</Typography>
      ) : (
        <Grid container spacing={2}>
          {inventoryList.map((item) => (
            <Grid key={item.id} item xs={12} sm={6} md={4}>
              <Card
                variant="outlined"
                sx={{ 
                  borderColor: item.stock <= item.reorderPoint ? 'error.main' : 'divider',
                  height: '100%'
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                      {(() => {
                        // Mapear categorías nuevas a etiquetas
                        const categoryLabels: Record<string, string> = {
                          'ingredient': 'Ingrediente',
                          'beverage': 'Bebida',
                          'coffee': 'Café',
                          'bebida': 'Bebida',
                          'cafe': 'Café',
                          'condimentos': 'Condimentos',
                          'frutas': 'Frutas',
                          'cereales': 'Cereales',
                          'lacteos': 'Lácteos',
                          'otros': 'Otros',
                          'proteinas': 'Proteínas',
                          'vegetales': 'Vegetales'
                        };
                        return categoryLabels[item.category] || item.category;
                      })()}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Stock: {item.stock} {item.unit}
                    </Typography>
                    {item.stock <= item.reorderPoint && (
                      <Typography variant="caption" color="error">
                        Punto de pedido: {item.reorderPoint} {item.unit}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default InventoryPage;

