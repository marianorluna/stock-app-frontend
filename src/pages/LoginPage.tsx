import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Tab,
  Tabs
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../contexts/AuthContext';

const DEMO_GUEST_EMAIL = 'guest@test.demo';
const DEMO_GUEST_PASSWORD = 'Demo123+';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const { login, register, user, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();

  //efecto para redirigir cuando el usuario se autentica
  useEffect(() => {
    if (user) {
      //redirigir según rol y permisos del usuario
      if (hasRole('operator')) {
        //operadores van directamente a la página de mermas
        navigate('/manual', { replace: true });
      } else if (hasPermission('dashboard', 'read')) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/products', { replace: true });
      }
    }
  }, [user, hasPermission, hasRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tabValue === 0) {
        //login
        await login(email, password);
      } else {
        //register
        if (!name.trim()) {
          setError('El nombre es requerido');
          setLoading(false);
          return;
        }
        await register(email, password, name);
      }
      //la redirección se manejará automáticamente por el useEffect cuando el usuario se sincronice
    } catch (err: any) {
      setError(err.message || 'Error al autenticar');
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Stockearly
          </Typography>

          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
            <Tab label="Iniciar Sesión" />
            <Tab label="Registrarse" disabled={true} />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {tabValue === 1 && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Nombre"
                name="name"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              autoFocus={tabValue === 0}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Cargando...' : tabValue === 0 ? 'Iniciar Sesión' : 'Registrarse'}
            </Button>
          </Box>
        </Paper>

        <Accordion
          disableGutters
          elevation={0}
          sx={{
            mt: 3,
            width: '100%',
            borderRadius: `${10}px !important`,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}
            sx={{
              px: 2,
              py: 1,
              '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center', gap: 1 }
            }}
          >
            <Typography component="span" sx={{ mr: 0.5 }}>
              🚨
            </Typography>
            <Typography component="span" variant="subtitle1" fontWeight={600}>
              Cuenta de demostración
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Puedes entrar con el usuario guest para explorar la aplicación de forma rápida.
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                bgcolor: 'grey.50',
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                fontSize: '0.85rem'
              }}
            >
              <Typography variant="body2" component="div">
                <strong>Correo:</strong> {DEMO_GUEST_EMAIL}
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                <strong>Contraseña:</strong> {DEMO_GUEST_PASSWORD}
              </Typography>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              Esta cuenta tiene{' '}
              <Typography component="span" variant="body2" fontWeight={600} color="text.primary">
                accesos limitados
              </Typography>{' '}
              según el rol guest. Si necesitas probar todas las funcionalidades con permisos completos,{' '}
              <Typography component="span" variant="body2" fontWeight={600} color="primary.main">
                comunícate con el administrador
              </Typography>{' '}
              para que te asigne un usuario administrador.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Container>
  );
};

export default LoginPage;

