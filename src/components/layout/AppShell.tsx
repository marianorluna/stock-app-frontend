import { ReactNode, useState } from 'react';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Stack,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import KitchenIcon from '@mui/icons-material/Kitchen';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import StoreIcon from '@mui/icons-material/Store';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { RequirePermission } from '../auth/RequirePermission';
import { useInventoryStore } from '../../hooks/useInventoryStore';

type AppShellProps = {
  children: ReactNode;
};

//enlaces de navegación que se mostrarán según permisos
const getNavLinks = (hasPermission: (resource: string, action: string) => boolean) => {
  const links = [];
  
  if (hasPermission('dashboard', 'read')) {
    links.push({ label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, to: '/dashboard' });
  }
  
  return links;
};

//enlaces que se mostrarán según permisos del usuario
const getTrailingLinks = (hasPermission: (resource: string, action: string) => boolean) => {
  const links = [];
  
  if (hasPermission('suppliers', 'read')) {
    links.push({ label: 'Proveedores', icon: <StoreIcon fontSize="small" />, to: '/suppliers' });
  }
  
  if (hasPermission('manual', 'read')) {
    links.push({ label: 'Registro Manual', icon: <PlaylistAddIcon fontSize="small" />, to: '/manual' });
  }
  
  return links;
};

const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout, hasPermission, hasAnyRole } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const { loading, loadingMessage } = useInventoryStore((state) => ({
    loading: state.loading,
    loadingMessage: state.loadingMessage
  }));
  
  const navLinks = getNavLinks(hasPermission);
  const trailingLinks = getTrailingLinks(hasPermission);
  const canAccessInventory = hasAnyRole(['admin', 'manager']);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleCloseUserMenu();
    await logout();
    navigate('/login');
  };

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <AppBar position="sticky" color="inherit" sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton edge="start" size="large" color="primary" component={Link} to="/">
            <KitchenIcon />
          </IconButton>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 600, textDecoration: 'none', color: 'inherit' }}
          >
            Stockearly
          </Typography>
          {user && isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              <Chip 
                label={user.role.toUpperCase()} 
                size="small" 
                color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'warning' : 'default'}
              />
              <IconButton onClick={handleOpenUserMenu} size="small">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={handleCloseUserMenu}>
                <MenuItem disabled>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={user.name} secondary={user.email} />
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Cerrar Sesión" />
                </MenuItem>
              </Menu>
            </Box>
          )}
          {isMobile ? (
            <>
              <IconButton edge="end" color="primary" onClick={toggleDrawer(true)}>
                <MenuIcon />
              </IconButton>
              <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
                <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
                  <List>
                    {navLinks.map((link) => (
                      <ListItemButton
                        component={Link}
                        to={link.to}
                        key={link.to}
                        selected={location.pathname === link.to}
                      >
                        <ListItemIcon>{link.icon}</ListItemIcon>
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    ))}
                    {canAccessInventory && (
                      <>
                        <ListItemButton 
                          component={Link}
                          to="/inventory"
                          selected={location.pathname === '/inventory' || location.pathname.startsWith('/inventory/')}
                        >
                          <ListItemIcon>
                            <BarChartIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary="Inventario" />
                        </ListItemButton>
                        <List component="div" disablePadding sx={{ pl: 4 }}>
                          <ListItemButton component={Link} to="/inventory/stock" selected={location.pathname === '/inventory/stock'}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <InventoryIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Stock Actual" />
                          </ListItemButton>
                          <ListItemButton component={Link} to="/inventory/purchases" selected={location.pathname === '/inventory/purchases'}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <ShoppingCartIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Compras" />
                          </ListItemButton>
                          <ListItemButton component={Link} to="/inventory/sales" selected={location.pathname === '/inventory/sales'}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <PointOfSaleIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Ventas" />
                          </ListItemButton>
                        </List>
                      </>
                    )}
                    <RequirePermission resource="ingredients" action="read" hide>
                      <ListItemButton 
                        component={Link}
                        to="/products"
                        selected={location.pathname === '/products' || location.pathname.startsWith('/ingredients') || location.pathname.startsWith('/recipes') || location.pathname.startsWith('/drinks')}
                      >
                        <ListItemIcon>
                          <KitchenIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Productos" />
                      </ListItemButton>
                      <List component="div" disablePadding sx={{ pl: 4 }}>
                        <RequirePermission resource="ingredients" action="read" hide>
                          <ListItemButton component={Link} to="/ingredients" selected={location.pathname === '/ingredients'}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <KitchenIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Ingredientes" />
                          </ListItemButton>
                        </RequirePermission>
                        <RequirePermission resource="recipes" action="read" hide>
                          <ListItemButton component={Link} to="/recipes" selected={location.pathname === '/recipes'}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <ReceiptLongIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Recetas" />
                          </ListItemButton>
                        </RequirePermission>
                        <RequirePermission resource="recipes" action="read" hide>
                          <ListItemButton component={Link} to="/drinks" selected={location.pathname === '/drinks'}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <LocalCafeIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Bebidas y café" />
                          </ListItemButton>
                        </RequirePermission>
                      </List>
                    </RequirePermission>
                    {trailingLinks.map((link) => (
                      <ListItemButton component={Link} to={link.to} key={link.to} selected={location.pathname === link.to}>
                        <ListItemIcon>{link.icon}</ListItemIcon>
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              </Drawer>
            </>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              {navLinks.map((link) => (
                <Button
                  key={link.to}
                  component={Link}
                  to={link.to}
                  startIcon={link.icon}
                  variant={location.pathname === link.to ? 'contained' : 'text'}
                >
                  {link.label}
                </Button>
              ))}
              {canAccessInventory && (
                <Button
                  component={Link}
                  to="/inventory"
                  startIcon={<BarChartIcon fontSize="small" />}
                  variant={location.pathname === '/inventory' || location.pathname.startsWith('/inventory/') ? 'contained' : 'text'}
                >
                  Inventario
                </Button>
              )}
              <RequirePermission resource="ingredients" action="read" hide>
                <Button
                  component={Link}
                  to="/products"
                  startIcon={<KitchenIcon fontSize="small" />}
                  variant={
                    location.pathname === '/products' ||
                    location.pathname === '/ingredients' ||
                    location.pathname === '/recipes' ||
                    location.pathname === '/drinks'
                      ? 'contained'
                      : 'text'
                  }
                >
                  Productos
                </Button>
              </RequirePermission>
              {trailingLinks.map((link) => (
                <Button
                  key={link.to}
                  component={Link}
                  to={link.to}
                  startIcon={link.icon}
                  variant={location.pathname === link.to ? 'contained' : 'text'}
                >
                  {link.label}
                </Button>
              ))}
              {user && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={user.role.toUpperCase()} 
                      size="small" 
                      color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'warning' : 'default'}
                    />
                    <IconButton onClick={handleOpenUserMenu} size="small">
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </IconButton>
                    <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={handleCloseUserMenu}>
                      <MenuItem disabled>
                        <ListItemIcon>
                          <AccountCircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={user.name} secondary={user.email} />
                      </MenuItem>
                      <MenuItem onClick={handleLogout}>
                        <ListItemIcon>
                          <LogoutIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Cerrar Sesión" />
                      </MenuItem>
                    </Menu>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, width: '100%', px: { xs: 2, md: 4 }, py: 4 }}>{children}</Box>
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(255,255,255,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: (theme) => theme.zIndex.modal + 1,
            px: 2
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {loadingMessage ?? 'Cargando datos...'}
          </Typography>
          {loadingMessage && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 360, textAlign: 'center' }}
            >
              {loadingMessage}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AppShell;

