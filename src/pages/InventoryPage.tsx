import { Grid, Card, CardContent, CardActionArea, Typography, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

const InventoryPage = () => {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();

  // Solo mostrar las cards si el usuario tiene acceso (admin o manager)
  if (!hasAnyRole(['admin', 'manager'])) {
    return null;
  }

  const inventoryCards = [
    {
      title: 'Stock Actual',
      description: 'Vista completa del inventario actual',
      icon: <InventoryIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/inventory/stock'
    },
    {
      title: 'Compras',
      description: 'Listado de compras registradas',
      icon: <ShoppingCartIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/inventory/purchases'
    },
    {
      title: 'Ventas',
      description: 'Listado de ventas registradas',
      icon: <PointOfSaleIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/inventory/sales'
    }
  ];

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Inventario
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Selecciona una categoría para gestionar tu inventario
            </Typography>
          </Box>
        </Box>
      </Grid>
      {inventoryCards.map((card) => (
        <Grid key={card.to} item xs={12} sm={6} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea
              onClick={() => navigate(card.to)}
              sx={{ height: '100%', p: 2 }}
            >
              <CardContent>
                <Stack spacing={2} alignItems="center" textAlign="center">
                  {card.icon}
                  <Typography variant="h6" component="div">
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default InventoryPage;
