import { ReactNode, useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Collapse,
  Badge,
  Snackbar,
  Alert
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
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { RequirePermission } from '../auth/RequirePermission';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import apiClient from '../../services/apiClient';
import socketClient from '../../services/socketClient';

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
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { loading, loadingMessage, isUpdatingStock, setIsUpdatingStock } = useInventoryStore((state) => ({
    loading: state.loading,
    loadingMessage: state.loadingMessage,
    isUpdatingStock: state.isUpdatingStock,
    setIsUpdatingStock: state.setIsUpdatingStock
  }));

  const canAccessInventory = hasAnyRole(['admin', 'manager']);

  // Obtener contador de notificaciones no leídas
  const fetchUnreadCount = useCallback(async () => {
    if (!canAccessInventory) return;

    try {
      const { data } = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error obteniendo contador de notificaciones:', error);
    }
  }, [canAccessInventory]);

  // Actualizar contador cuando cambia la ruta o cada 30 segundos
  useEffect(() => {
    if (user && canAccessInventory) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Actualizar cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [user, canAccessInventory, fetchUnreadCount, location.pathname]);

  // Marcar todas como leídas al entrar a la página de notificaciones
  useEffect(() => {
    if (location.pathname === '/notifications' && canAccessInventory && unreadCount > 0) {
      apiClient.patch('/notifications/read-all')
        .then(() => {
          setUnreadCount(0);
        })
        .catch((error) => {
          console.error('Error marcando notificaciones como leídas:', error);
        });
    }
  }, [location.pathname, canAccessInventory, unreadCount]);

  // Escuchar eventos de actualización automática de stock via WebSocket
  useEffect(() => {
    const handleStockUpdateStarted = () => {
      setIsUpdatingStock(true);
    };

    const handleStockUpdateCompleted = () => {
      setIsUpdatingStock(false);
    };

    socketClient.on('stock_update_started', handleStockUpdateStarted);
    socketClient.on('stock_update_completed', handleStockUpdateCompleted);

    return () => {
      socketClient.off('stock_update_started', handleStockUpdateStarted);
      socketClient.off('stock_update_completed', handleStockUpdateCompleted);
    };
  }, [setIsUpdatingStock]);

  const navLinks = getNavLinks(hasPermission);
  const trailingLinks = getTrailingLinks(hasPermission);

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
                <Badge
                  badgeContent={canAccessInventory ? unreadCount : 0}
                  color="error"
                  max={99}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left'
                  }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                </Badge>
              </IconButton>
              <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={handleCloseUserMenu}>
                <MenuItem disabled>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={user.name} secondary={user.email} />
                </MenuItem>
                {canAccessInventory && (
                  <MenuItem
                    component={Link}
                    to="/notifications"
                    onClick={() => {
                      handleCloseUserMenu();
                      fetchUnreadCount();
                    }}
                  >
                    <ListItemIcon>
                      <Badge badgeContent={unreadCount} color="error" max={99}>
                        <NotificationsIcon fontSize="small" />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText primary="Notificaciones" />
                  </MenuItem>
                )}
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
                <Box sx={{ width: 250 }} role="presentation" onKeyDown={toggleDrawer(false)}>
                  <List>
                    {navLinks.map((link) => (
                      <ListItemButton
                        component={Link}
                        to={link.to}
                        key={link.to}
                        selected={location.pathname === link.to}
                        onClick={toggleDrawer(false)}
                      >
                        <ListItemIcon>{link.icon}</ListItemIcon>
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    ))}
                    {canAccessInventory && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ListItemButton
                            component={Link}
                            to="/inventory"
                            selected={location.pathname === '/inventory' || location.pathname.startsWith('/inventory/')}
                            onClick={toggleDrawer(false)}
                            sx={{ flex: 1 }}
                          >
                            <ListItemIcon>
                              <BarChartIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Inventario" />
                          </ListItemButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInventoryMenuOpen(!inventoryMenuOpen);
                            }}
                            sx={{ mr: 1 }}
                          >
                            {inventoryMenuOpen ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </Box>
                        <Collapse in={inventoryMenuOpen} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding sx={{ pl: 4 }}>
                            <ListItemButton component={Link} to="/inventory/stock" selected={location.pathname === '/inventory/stock'} onClick={toggleDrawer(false)}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <InventoryIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Stock Actual" />
                            </ListItemButton>
                            <ListItemButton component={Link} to="/inventory/purchases" selected={location.pathname === '/inventory/purchases'} onClick={toggleDrawer(false)}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <ShoppingCartIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Compras" />
                            </ListItemButton>
                            <ListItemButton component={Link} to="/inventory/sales" selected={location.pathname === '/inventory/sales'} onClick={toggleDrawer(false)}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <PointOfSaleIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Ventas" />
                            </ListItemButton>
                          </List>
                        </Collapse>
                      </>
                    )}
                    <RequirePermission resource="ingredients" action="read" hide>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ListItemButton
                          component={Link}
                          to="/products"
                          selected={location.pathname === '/products' || location.pathname.startsWith('/ingredients') || location.pathname.startsWith('/recipes') || location.pathname.startsWith('/drinks')}
                          onClick={toggleDrawer(false)}
                          sx={{ flex: 1 }}
                        >
                          <ListItemIcon>
                            <KitchenIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary="Productos" />
                        </ListItemButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductsMenuOpen(!productsMenuOpen);
                          }}
                          sx={{ mr: 1 }}
                        >
                          {productsMenuOpen ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                      <Collapse in={productsMenuOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding sx={{ pl: 4 }}>
                          <RequirePermission resource="ingredients" action="read" hide>
                            <ListItemButton component={Link} to="/ingredients" selected={location.pathname === '/ingredients'} onClick={toggleDrawer(false)}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <KitchenIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Ingredientes" />
                            </ListItemButton>
                          </RequirePermission>
                          <RequirePermission resource="recipes" action="read" hide>
                            <ListItemButton component={Link} to="/drinks" selected={location.pathname === '/drinks'} onClick={toggleDrawer(false)}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <LocalCafeIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Bebidas" />
                            </ListItemButton>
                          </RequirePermission>
                          <RequirePermission resource="recipes" action="read" hide>
                            <ListItemButton component={Link} to="/recipes" selected={location.pathname === '/recipes'} onClick={toggleDrawer(false)}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <ReceiptLongIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Recetas" />
                            </ListItemButton>
                          </RequirePermission>
                        </List>
                      </Collapse>
                    </RequirePermission>
                    {trailingLinks.map((link) => (
                      <ListItemButton component={Link} to={link.to} key={link.to} selected={location.pathname === link.to} onClick={toggleDrawer(false)}>
                        <ListItemIcon>{link.icon}</ListItemIcon>
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    ))}
                    {canAccessInventory && (
                      <ListItemButton
                        component={Link}
                        to="/notifications"
                        selected={location.pathname === '/notifications'}
                        onClick={() => {
                          toggleDrawer(false)();
                          fetchUnreadCount();
                        }}
                      >
                        <ListItemIcon>
                          <Badge badgeContent={unreadCount} color="error" max={99}>
                            <NotificationsIcon fontSize="small" />
                          </Badge>
                        </ListItemIcon>
                        <ListItemText primary="Notificaciones" />
                      </ListItemButton>
                    )}
                    {hasPermission('config', 'read') && (
                      <ListItemButton
                        component={Link}
                        to="/configuraciones"
                        selected={location.pathname === '/configuraciones' || location.pathname.startsWith('/configuraciones/')}
                        onClick={toggleDrawer(false)}
                      >
                        <ListItemIcon>
                          <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Configuraciones" />
                      </ListItemButton>
                    )}
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
              {canAccessInventory && (
                <IconButton
                  component={Link}
                  to="/notifications"
                  color={location.pathname === '/notifications' ? 'primary' : 'default'}
                  onClick={() => {
                    // Actualizar contador al hacer clic
                    fetchUnreadCount();
                  }}
                >
                  <Badge badgeContent={unreadCount} color="error" max={99}>
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              )}
              {hasPermission('config', 'read') && (
                <Button
                  component={Link}
                  to="/configuraciones"
                  startIcon={<SettingsIcon fontSize="small" />}
                  variant={location.pathname === '/configuraciones' || location.pathname.startsWith('/configuraciones/') ? 'contained' : 'text'}
                >
                  Configuraciones
                </Button>
              )}
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
                      <Badge
                        badgeContent={canAccessInventory ? unreadCount : 0}
                        color="error"
                        max={99}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'left'
                        }}
                      >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </IconButton>
                    <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={handleCloseUserMenu}>
                      <MenuItem disabled>
                        <ListItemIcon>
                          <AccountCircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={user.name} secondary={user.email} />
                      </MenuItem>
                      {canAccessInventory && (
                        <MenuItem
                          component={Link}
                          to="/notifications"
                          onClick={() => {
                            handleCloseUserMenu();
                            fetchUnreadCount();
                          }}
                        >
                          <ListItemIcon>
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                              <NotificationsIcon fontSize="small" />
                            </Badge>
                          </ListItemIcon>
                          <ListItemText primary="Notificaciones" />
                        </MenuItem>
                      )}
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

      {/* Toast de actualización automática de stock en curso */}
      <Snackbar
        open={isUpdatingStock}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 2 }}
      >
        <Alert
          severity="info"
          icon={<CircularProgress size={18} color="inherit" />}
          sx={{ width: '100%', alignItems: 'center' }}
        >
          Actualización automática de stock en curso. Las operaciones manuales están temporalmente bloqueadas.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AppShell;

