import { useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import { useSearchParams } from 'react-router-dom';

const StockActualPage = () => {
  const { snapshot, loading, error } = useInventoryStore((state) => ({
    snapshot: state.snapshot,
    loading: state.loading,
    error: state.error
  }));

  const [searchParams, setSearchParams] = useSearchParams();
  const itemType = searchParams.get('type') || 'all';

  const inventoryList = useMemo(() => {
    if (!snapshot) return [];

    let filtered = [...snapshot.inventory];

    // Filtrar por tipo si se especifica
    if (itemType === 'ingredient') {
      filtered = filtered.filter(item => item.itemType === 'ingredient');
    } else if (itemType === 'beverage') {
      filtered = filtered.filter(item => item.itemType === 'beverage');
    }

    // Calcular stock efectivo: si tiene merma, usar stockMerma; si no, usar stock
    const effectiveStock = (item: typeof filtered[0]) =>
      (item.factorMermaNat != null && item.factorMermaNat > 0 && item.stockMerma != null)
        ? item.stockMerma
        : item.stock;

    // Ordenar: primero los que están por debajo del punto de pedido (usando stock efectivo)
    return filtered.sort((a, b) => {
      const aLow = effectiveStock(a) <= a.reorderPoint ? 1 : 0;
      const bLow = effectiveStock(b) <= b.reorderPoint ? 1 : 0;
      if (aLow !== bLow) return bLow - aLow;
      return a.name.localeCompare(b.name);
    });
  }, [snapshot, itemType]);

  const handleTypeChange = (newType: string) => {
    if (newType === 'all') {
      searchParams.delete('type');
    } else {
      searchParams.set('type', newType);
    }
    setSearchParams(searchParams);
  };

  const getDescriptionText = () => {
    switch (itemType) {
      case 'ingredient':
        return 'Vista del inventario de ingredientes';
      case 'beverage':
        return 'Vista del inventario de bebidas';
      default:
        return 'Vista completa del inventario actual';
    }
  };

  if (loading && !snapshot) {
    return <Skeleton variant="rectangular" height={300} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Stock Actual
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {getDescriptionText()}
      </Typography>
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="item-type-select-label">Tipo de item</InputLabel>
        <Select
          labelId="item-type-select-label"
          id="item-type-select"
          value={itemType}
          label="Tipo de item"
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="ingredient">Ingredientes</MenuItem>
          <MenuItem value="beverage">Bebidas</MenuItem>
        </Select>
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!snapshot ? (
        <Typography>Sin datos disponibles aún.</Typography>
      ) : (
        <Grid container spacing={2}>
          {inventoryList.map((item) => {
            const hasMerma = typeof item.factorMermaNat === 'number' && item.factorMermaNat > 0;
            const displayStock = hasMerma && typeof item.stockMerma === 'number'
              ? item.stockMerma
              : item.stock;
            const isLow = displayStock <= item.reorderPoint;

            return (
              <Grid key={item.id} item xs={12} sm={6} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor: isLow ? 'error.main' : 'divider',
                    bgcolor: isLow ? '#fef2f2' : 'background.paper',
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {item.categoryName}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {item.name}
                      </Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Stock Real: {displayStock} {item.unit}
                        </Typography>
                        {hasMerma && (
                          <>
                            <Typography variant="body2" color="text.secondary">·</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Merma: {Math.round((item.factorMermaNat ?? 0) * 100)}%
                            </Typography>
                          </>
                        )}
                      </Stack>
                      {isLow && (
                        <Typography variant="caption" color="error">
                          Punto de pedido: {item.reorderPoint} {item.unit}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default StockActualPage;
