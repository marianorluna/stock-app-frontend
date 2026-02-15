import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '60vh'
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        403
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom>
        Acceso Denegado
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        No tienes permisos para acceder a esta página.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>
        Volver al inicio
      </Button>
    </Box>
  );
};

export default UnauthorizedPage;

