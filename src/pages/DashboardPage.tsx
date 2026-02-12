import { useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useInventoryStore } from '../hooks/useInventoryStore';
import { useTheme } from '@mui/material/styles';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const DashboardPage = () => {
  const theme = useTheme();
  const { snapshot, loading, error } = useInventoryStore((state) => ({
    snapshot: state.snapshot,
    loading: state.loading,
    error: state.error
  }));

  const totals = useMemo(() => {
    if (!snapshot) {
      return {
        ingredients: { total: 0, lowStock: 0 },
        beverages: { total: 0, lowStock: 0 }
      };
    }

    const ingredientTotals = snapshot.categoryTotals?.ingredient ?? { total: 0, lowStock: 0 };
    const beverageTotals = snapshot.categoryTotals?.beverage ?? { total: 0, lowStock: 0 };
    const coffeeTotals = snapshot.categoryTotals?.coffee ?? { total: 0, lowStock: 0 };

    return {
      ingredients: ingredientTotals,
      beverages: {
        total: beverageTotals.total + coffeeTotals.total,
        lowStock: beverageTotals.lowStock + coffeeTotals.lowStock
      }
    };
  }, [snapshot]);


  const categoryBreakdown = useMemo(() => {
    if (!snapshot) {
      return { total: 0, segments: [] as Array<{ key: string; label: string; value: number; color: string }> };
    }

    const palette = {
      ingredient: theme.palette.primary.main,
      beverage: theme.palette.info.light,
      coffee: theme.palette.warning.light
    };

    const aggregated = snapshot.inventory.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.stock;
      return acc;
    }, {});

    const total = Object.values(aggregated).reduce((sum, value) => sum + value, 0);

    const segments = (['ingredient', 'beverage', 'coffee'] as const)
      .filter((category) => (aggregated[category] ?? 0) > 0)
      .map((category) => ({
        key: category,
        label: category === 'ingredient' ? 'Ingredientes' : category === 'coffee' ? 'Café' : 'Bebidas',
        value: aggregated[category] ?? 0,
        color: palette[category]
      }));

    return { total, segments };
  }, [snapshot, theme.palette.info.light, theme.palette.primary.main, theme.palette.warning.light]);

  const stockHealth = useMemo(() => {
    if (!snapshot || !snapshot.inventory || snapshot.inventory.length === 0) {
      return {
        healthy: 0,
        warning: 0,
        critical: 0,
        ratios: { healthy: 0, warning: 0, critical: 0 },
        highlights: [] as Array<{ id: string; name: string; stock: number; reorderPoint: number; unit: string }>
      };
    }

    const inventory = snapshot.inventory;
    const counters = inventory.reduce(
      (acc, item) => {
        if (item.stock <= 0) {
          acc.critical += 1;
        } else if (item.stock <= item.reorderPoint) {
          acc.warning += 1;
        } else {
          acc.healthy += 1;
        }
        return acc;
      },
      { healthy: 0, warning: 0, critical: 0 }
    );

    const total = inventory.length;
    const ratios = {
      healthy: Math.round((counters.healthy / total) * 100),
      warning: Math.round((counters.warning / total) * 100),
      critical: Math.round((counters.critical / total) * 100)
    };

    const highlights = inventory.filter((item) => item.stock <= item.reorderPoint).slice(0, 5);

    return { ...counters, ratios, highlights };
  }, [snapshot]);

  const lowStockItems = useMemo(() => snapshot?.lowStock?.slice(0, 5) ?? [], [snapshot]);

  if (loading && !snapshot) {
    return <Skeleton variant="rectangular" height={300} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Resumen y estadísticas del inventario
      </Typography>

      <Grid container spacing={3}>
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box
                  component={Link}
                  to="/ingredients"
                  sx={{ 
                    textDecoration: 'none',
                    display: 'block'
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{ 
                      textAlign: 'left', 
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Ingredientes
                      </Typography>
                      <Typography variant="h4">{totals.ingredients.total}</Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  component={Link}
                  to="/ingredients"
                  sx={{ 
                    textDecoration: 'none',
                    display: 'block'
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{ 
                      textAlign: 'left', 
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Faltantes
                      </Typography>
                      <Typography variant="h4" color={totals.ingredients.lowStock > 0 ? 'error' : 'primary'}>
                        {totals.ingredients.lowStock}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box
                  component={Link}
                  to="/drinks"
                  sx={{ 
                    textDecoration: 'none',
                    display: 'block'
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{ 
                      textAlign: 'left', 
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Bebidas & Café
                      </Typography>
                      <Typography variant="h4">{totals.beverages.total}</Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  component={Link}
                  to="/drinks"
                  sx={{ 
                    textDecoration: 'none',
                    display: 'block'
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{ 
                      textAlign: 'left', 
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Faltantes
                      </Typography>
                      <Typography variant="h4" color={totals.beverages.lowStock > 0 ? 'error' : 'primary'}>
                        {totals.beverages.lowStock}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="h6">Salud del inventario</Typography>
                </Stack>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" color="success" label="Saludable" />
                    <Typography variant="body2" color="text.secondary">
                      {stockHealth.healthy} ítems ({stockHealth.ratios.healthy}%)
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={stockHealth.ratios.healthy} color="success" />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" color="warning" label="Atención" />
                    <Typography variant="body2" color="text.secondary">
                      {stockHealth.warning} ítems ({stockHealth.ratios.warning}%)
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={stockHealth.ratios.warning} color="warning" />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" color="error" label="Crítico" />
                    <Typography variant="body2" color="text.secondary">
                      {stockHealth.critical} ítems ({stockHealth.ratios.critical}%)
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={stockHealth.ratios.critical} color="error" />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Ítems con stock ajustado
                </Typography>
                {stockHealth.highlights.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Sin alertas por el momento.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {stockHealth.highlights.map((item) => (
                      <Stack key={item.id} spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Stock {item.stock} / Punto {item.reorderPoint} {item.unit}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <BarChartIcon color="primary" fontSize="small" />
                  <Typography variant="h6">Distribución por categoría</Typography>
                </Stack>
                {categoryBreakdown.total === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay inventario cargado.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 3,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexGrow: 1
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        width: 220,
                        height: 220
                      }}
                    >
                      <svg viewBox="0 0 42 42" width="100%" height="100%">
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9155"
                          fill="transparent"
                          stroke="var(--mui-palette-divider)"
                          strokeWidth="3"
                        />
                        {categoryBreakdown.segments.reduce<{ segments: Array<{ dashArray: string; dashOffset: string; color: string }>; cumulative: number }>(
                          (acc, segment) => {
                            const percentage = (segment.value / categoryBreakdown.total) * 100;
                            const dashArray = `${percentage} ${100 - percentage}`;
                            const dashOffset = `${100 - acc.cumulative}`;
                            acc.segments.push({ dashArray, dashOffset, color: segment.color });
                            acc.cumulative += percentage;
                            return acc;
                          },
                          { segments: [], cumulative: 0 }
                        ).segments.map((segment, index) => (
                          <circle
                            key={index}
                            cx="21"
                            cy="21"
                            r="15.9155"
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth="3"
                            strokeDasharray={segment.dashArray}
                            strokeDashoffset={segment.dashOffset}
                            strokeLinecap="butt"
                          />
                        ))}
                      </svg>
                      <Stack sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Total
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={600}>
                          100%
                        </Typography>
                      </Stack>
                    </Box>
                    <Stack spacing={1.5}>
                      {categoryBreakdown.segments.map((segment) => (
                        <Stack key={segment.key} direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 12, height: 12, bgcolor: segment.color, borderRadius: '50%' }} />
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {segment.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {((segment.value / categoryBreakdown.total) * 100).toFixed(1)}%
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <WarningAmberIcon color="error" fontSize="small" />
                  <Typography variant="h6">Prioridades de compra</Typography>
                </Stack>
                {lowStockItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay ingredientes por debajo del punto de pedido.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {lowStockItems.map((item) => (
                      <Stack key={item.id ?? item.name} spacing={0.25}>
                        <Typography variant="body2" fontWeight={600}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Stock actual: {item.stock} {item.unit} • Punto de pedido: {item.reorderPoint} {item.unit}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <LocalDiningIcon color="primary" fontSize="small" />
                  <Typography variant="h6">Cobertura por categoría</Typography>
                </Stack>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LocalDiningIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2">Ingredientes</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {totals.ingredients.total > 0
                          ? `${((1 - totals.ingredients.lowStock / totals.ingredients.total) * 100).toFixed(1)}% saludable`
                          : 'Sin datos'}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={
                        totals.ingredients.total > 0
                          ? Math.max(
                              0,
                              Math.min(100, ((totals.ingredients.total - totals.ingredients.lowStock) / totals.ingredients.total) * 100)
                            )
                          : 0
                      }
                      color="primary"
                    />
                  </Stack>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LocalDrinkIcon color="secondary" fontSize="small" />
                        <Typography variant="subtitle2">Bebidas & Café</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {totals.beverages.total > 0
                          ? `${((1 - totals.beverages.lowStock / totals.beverages.total) * 100).toFixed(1)}% saludable`
                          : 'Sin datos'}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={
                        totals.beverages.total > 0
                          ? Math.max(
                              0,
                              Math.min(100, ((totals.beverages.total - totals.beverages.lowStock) / totals.beverages.total) * 100)
                            )
                          : 0
                      }
                      color="secondary"
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
    </Box>
  );
};

export default DashboardPage;

