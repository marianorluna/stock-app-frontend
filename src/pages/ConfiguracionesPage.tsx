import { Grid, Card, CardContent, CardActionArea, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';

const ConfiguracionesPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Solo mostrar las cards si el usuario tiene permiso config:read
  if (!hasPermission('config', 'read')) {
    return null;
  }

  const configCards = [
    {
      title: 'Actualizar Bearer',
      description: 'Modificar el valor del bearer token para la API de Qamarero',
      icon: <VpnKeyIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/configuraciones/bearer'
    },
    {
      title: 'Emails de Notificación',
      description: 'Gestionar las direcciones de correo electrónico para notificaciones del sistema',
      icon: <EmailIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      to: '/configuraciones/notification-emails'
    }
  ];

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Configuraciones
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Gestiona las configuraciones del sistema
        </Typography>
      </Grid>
      {configCards.map((card) => (
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

export default ConfiguracionesPage;
