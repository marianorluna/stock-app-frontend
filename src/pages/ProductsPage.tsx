import { Grid, Card, CardContent, CardActionArea, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission } from '../components/auth/RequirePermission';
import KitchenIcon from '@mui/icons-material/Kitchen';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';

const ProductsPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const productCards = [
    {
      title: 'Ingredientes',
      description: 'Gestiona los ingredientes de tu inventario',
      icon: <KitchenIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/ingredients',
      permission: { resource: 'ingredients', action: 'read' }
    },
    {
      title: 'Recetas',
      description: 'Visualiza y gestiona las recetas',
      icon: <ReceiptLongIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/recipes',
      permission: { resource: 'recipes', action: 'read' }
    },
    {
      title: 'Bebidas',
      description: 'Administra las bebidas',
      icon: <LocalCafeIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/drinks',
      permission: { resource: 'recipes', action: 'read' }
    }
  ];

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Productos
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Selecciona una categoría para gestionar tus productos
        </Typography>
      </Grid>
      {productCards.map((card) => (
        <RequirePermission
          key={card.to}
          resource={card.permission.resource}
          action={card.permission.action}
          hide
        >
          <Grid item xs={12} sm={6} md={4}>
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
        </RequirePermission>
      ))}
    </Grid>
  );
};

export default ProductsPage;

