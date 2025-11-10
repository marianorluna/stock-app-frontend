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
  MenuItem
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KitchenIcon from '@mui/icons-material/Kitchen';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import StoreIcon from '@mui/icons-material/Store';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

type AppShellProps = {
  children: ReactNode;
};

const navLinks = [
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, to: '/dashboard' }
  
];

const trailingLinks = [
  { label: 'Proveedores', icon: <StoreIcon fontSize="small" />, to: '/suppliers' },
  { label: 'Registro Manual', icon: <PlaylistAddIcon fontSize="small" />, to: '/manual' }
];

const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [productsAnchor, setProductsAnchor] = useState<null | HTMLElement>(null);

  const handleOpenProducts = (event: React.MouseEvent<HTMLButtonElement>) => {
    setProductsAnchor(event.currentTarget);
  };

  const handleCloseProducts = () => {
    setProductsAnchor(null);
  };

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="inherit" sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton edge="start" size="large" color="primary" component={Link} to="/dashboard">
            <KitchenIcon />
          </IconButton>
          <Typography
            component={Link}
            to="/dashboard"
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 600, textDecoration: 'none', color: 'inherit' }}
          >
            Stockearly
          </Typography>
          {isMobile ? (
            <>
              <IconButton edge="end" color="primary" onClick={toggleDrawer(true)}>
                <MenuIcon />
              </IconButton>
              <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
                <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
                  <List>
                    {navLinks.map((link) => (
                      <ListItemButton component={Link} to={link.to} key={link.to} selected={location.pathname === link.to}>
                        <ListItemIcon>{link.icon}</ListItemIcon>
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    ))}
                    <ListItemButton selected={location.pathname.startsWith('/ingredients') || location.pathname.startsWith('/recipes') || location.pathname.startsWith('/drinks')}>
                      <ListItemIcon>
                        <KitchenIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Productos" />
                    </ListItemButton>
                    <List component="div" disablePadding sx={{ pl: 4 }}>
                      <ListItemButton component={Link} to="/ingredients" selected={location.pathname === '/ingredients'}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <KitchenIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Ingredientes" />
                      </ListItemButton>
                      <ListItemButton component={Link} to="/recipes" selected={location.pathname === '/recipes'}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <ReceiptLongIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Recetas" />
                      </ListItemButton>
                      <ListItemButton component={Link} to="/drinks" selected={location.pathname === '/drinks'}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <LocalCafeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Bebidas y café" />
                      </ListItemButton>
                    </List>
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
            <Stack direction="row" spacing={1}>
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
              <Button
                onClick={handleOpenProducts}
                startIcon={<KitchenIcon fontSize="small" />}
                variant={
                  location.pathname === '/ingredients' ||
                  location.pathname === '/recipes' ||
                  location.pathname === '/drinks'
                    ? 'contained'
                    : 'text'
                }
              >
                Productos
              </Button>
              <Menu anchorEl={productsAnchor} open={Boolean(productsAnchor)} onClose={handleCloseProducts}>
                <MenuItem
                  component={Link}
                  to="/ingredients"
                  onClick={handleCloseProducts}
                  selected={location.pathname === '/ingredients'}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <KitchenIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Ingredientes</ListItemText>
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/recipes"
                  onClick={handleCloseProducts}
                  selected={location.pathname === '/recipes'}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ReceiptLongIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Recetas</ListItemText>
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/drinks"
                  onClick={handleCloseProducts}
                  selected={location.pathname === '/drinks'}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <LocalCafeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Bebidas y café</ListItemText>
                </MenuItem>
              </Menu>
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
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, width: '100%', px: { xs: 2, md: 4 }, py: 4 }}>{children}</Box>
    </Box>
  );
};

export default AppShell;

