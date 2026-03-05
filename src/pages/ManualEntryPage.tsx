import {
  Box,
  Snackbar,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState, ChangeEvent, type JSX } from 'react';
import { useTheme } from '@mui/material/styles';
import ManualSaleForm from '../components/manual/ManualSaleForm';
import ManualPurchaseForm from '../components/manual/ManualPurchaseForm';
import ManualWastageForm from '../components/manual/ManualWastageForm';
import { useInventoryStore } from '../hooks/useInventoryStore';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission } from '../components/auth/RequirePermission';
import type { ManualLogFilters, SaleRecord, PurchaseRecord, WastageRecord } from '../types';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

type ManualTabValue = 'sale' | 'purchase' | 'wastage';
type InnerTabValue = 'form' | 'list';

type ManualTabConfig = {
  value: ManualTabValue;
  selectorLabel: string;
  registerLabel: string;
  listLabel: string;
  component: JSX.Element;
  renderList: () => JSX.Element;
};

const ManualEntryPage = () => {
  const { hasPermission } = useAuth();
  const canDeleteWastage = hasPermission('manual', 'delete');
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeForm, setActiveForm] = useState<ManualTabValue>('wastage');
  const [activeInnerTab, setActiveInnerTab] = useState<InnerTabValue>('form');
  const {
    salesLog,
    purchasesLog,
    wastageLog,
    suppliers,
    logsLoading,
    manualFilters,
    fetchManualLogs,
    fetchSuppliers,
    setManualFilters,
    deleteWastage
  } = useInventoryStore((state) => ({
    salesLog: state.salesLog,
    purchasesLog: state.purchasesLog,
    wastageLog: state.wastageLog,
    suppliers: state.suppliers,
    logsLoading: state.logsLoading,
    manualFilters: state.manualFilters,
    fetchManualLogs: state.fetchManualLogs,
    fetchSuppliers: state.fetchSuppliers,
    setManualFilters: state.setManualFilters,
    deleteWastage: state.deleteWastage
  }));
  const [wastageToDelete, setWastageToDelete] = useState<WastageRecord | null>(null);
  const deleteButtonDisabled = useMemo(() => logsLoading, [logsLoading]);

  const handleSuccess = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    setActiveInnerTab('form');
  }, [activeForm]);

  useEffect(() => {
    void fetchManualLogs();
    void fetchSuppliers();
  }, [fetchManualLogs, fetchSuppliers]);

  const handleDateFilterChange =
    (field: keyof ManualLogFilters) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.trim();
      const nextFilters: ManualLogFilters = { ...(manualFilters ?? {}) };
      if (value) {
        nextFilters[field] = value;
      } else {
        delete nextFilters[field];
      }
      setManualFilters(nextFilters);
      void fetchManualLogs(nextFilters);
    };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const getDishName = (dish: SaleRecord['lines'][number]['dish']) =>
    typeof dish === 'string' ? dish : dish?.name ?? '';

  const getIngredientName = (
    ingredient: PurchaseRecord['items'][number]['ingredient'] | WastageRecord['items'][number]['ingredient']
  ) => (typeof ingredient === 'string' ? ingredient : ingredient?.name ?? '');

  const getWastageItemDisplay = (item: WastageRecord['items'][number]) => {
    if (item.ingredient) {
      const name = typeof item.ingredient === 'string' ? item.ingredient : item.ingredient?.name ?? '';
      return `${name} • ${item.quantityInGrams ?? 0} g`;
    }
    if (item.beverage) {
      const name = typeof item.beverage === 'string' ? item.beverage : (item.beverage as { _id: string; name: string })?.name ?? '';
      return `${name} • ${item.quantityInUnits ?? 0} u`;
    }
    return '—';
  };

  const getSupplierName = (sku: string | undefined) => {
    if (!sku) return 'Proveedor sin especificar';
    const supplier = suppliers.find((s) => s.sku === sku);
    return supplier?.name ?? sku;
  };

  const renderDateFilters = () => (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
      <TextField
        label="Desde"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={manualFilters.from ?? ''}
        onChange={handleDateFilterChange('from')}
        fullWidth
      />
      <TextField
        label="Hasta"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={manualFilters.to ?? ''}
        onChange={handleDateFilterChange('to')}
        fullWidth
      />
    </Stack>
  );

  const renderSalesLog = () => (
    <Stack spacing={2}>
      {renderDateFilters()}
      {logsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Ventas
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {salesLog.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin registros en el rango seleccionado.
              </Typography>
            ) : (
              salesLog.map((sale, index) => {
                const note = sale.metadata?.note;
                return (
                  <Box key={sale._id} sx={{ mb: index === salesLog.length - 1 ? 0 : 2 }}>
                    <Typography variant="subtitle2">{formatDateTime(sale.timestamp)}</Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {sale.lines.map((line, lineIndex) => (
                        <Typography key={`${sale._id}-${lineIndex}`} variant="body2">
                          {getDishName(line.dish)} • {line.quantity} uds.
                        </Typography>
                      ))}
                    </Stack>
                    {note !== undefined && note !== null && (
                      <Typography variant="caption" color="text.secondary">
                        {String(note)}
                      </Typography>
                    )}
                    {index !== salesLog.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  const renderPurchasesLog = () => (
    <Stack spacing={2}>
      {renderDateFilters()}
      {logsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Compras
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {purchasesLog.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin registros en el rango seleccionado.
              </Typography>
            ) : (
              purchasesLog.map((purchase, index) => {
                const note = purchase.metadata?.note;
                return (
                  <Box key={purchase._id} sx={{ mb: index === purchasesLog.length - 1 ? 0 : 2 }}>
                    <Typography variant="subtitle2">
                      {formatDateTime(purchase.timestamp)} • {getSupplierName(purchase.supplier)}
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {purchase.items.map((item, itemIndex) => (
                        <Typography key={`${purchase._id}-${itemIndex}`} variant="body2">
                          {getIngredientName(item.ingredient)} • {item.quantityInGrams} g • €
                          {item.unitPrice.toFixed(2)}
                        </Typography>
                      ))}
                    </Stack>
                    {note !== undefined && note !== null && (
                      <Typography variant="caption" color="text.secondary">
                        {String(note)}
                      </Typography>
                    )}
                    {index !== purchasesLog.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  const renderWastageLog = () => (
    <Stack spacing={2}>
      {renderDateFilters()}
      {logsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Mermas
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {wastageLog.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin registros en el rango seleccionado.
              </Typography>
            ) : (
              wastageLog.map((wastage, index) => {
                const note = wastage.metadata?.note;
                return (
                  <Box key={wastage._id} sx={{ mb: index === wastageLog.length - 1 ? 0 : 2 }}>
                    <Typography variant="subtitle2">{formatDateTime(wastage.timestamp)}</Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {wastage.items.map((item, itemIndex) => (
                        <Typography key={`${wastage._id}-${itemIndex}`} variant="body2">
                          {getWastageItemDisplay(item)}
                          {item.reason ? ` • ${item.reason}` : ''}
                        </Typography>
                      ))}
                    </Stack>
                    {note !== undefined && note !== null && (
                      <Typography variant="caption" color="text.secondary">
                        {String(note)}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon fontSize="small" />}
                        onClick={() => {
                          if (canDeleteWastage) {
                            setWastageToDelete(wastage);
                          }
                        }}
                        disabled={deleteButtonDisabled || !canDeleteWastage}
                      >
                        Eliminar
                      </Button>
                    </Stack>
                    {index !== wastageLog.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  const forms: ManualTabConfig[] = [
    {
      value: 'wastage',
      selectorLabel: 'Mermas',
      registerLabel: 'Registro',
      listLabel: 'Mermas',
      component: <ManualWastageForm onSubmitted={handleSuccess} />,
      renderList: renderWastageLog
    },
    {
      value: 'sale',
      selectorLabel: 'Ventas',
      registerLabel: 'Registro',
      listLabel: 'Ventas',
      component: <ManualSaleForm onSubmitted={handleSuccess} />,
      renderList: renderSalesLog
    },
    {
      value: 'purchase',
      selectorLabel: 'Compras',
      registerLabel: 'Registro',
      listLabel: 'Compras',
      component: <ManualPurchaseForm onSubmitted={handleSuccess} />,
      renderList: renderPurchasesLog
    }
  ];

  const activeConfig = forms.find((form) => form.value === activeForm) ?? forms[0];
  const canCreate = hasPermission('manual', 'create');
  const renderInnerContent =
    activeInnerTab === 'form' && canCreate
      ? activeForm === 'wastage'
        ? <Stack spacing={3}>{activeConfig.component}</Stack>
        : activeConfig.component
      : activeInnerTab === 'list'
      ? activeConfig.renderList()
      : <Typography color="text.secondary">No tienes permisos para crear registros manuales</Typography>;

  return (
    <>
      <Box sx={{ py: 0 }}>
        <FormControl fullWidth sx={{ mb: 3, maxWidth: { xs: '100%', md: 320 } }}>
          <InputLabel id="manual-entry-selector">Registro</InputLabel>
          <Select
            labelId="manual-entry-selector"
            label="Registro"
            value={activeForm}
            onChange={(event) => setActiveForm(event.target.value as typeof activeForm)}
          >
            {forms.map((form) => (
              <MenuItem key={form.value} value={form.value}>
                {form.selectorLabel}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ mb: 2 }}>
          <Tabs
            value={activeInnerTab}
            onChange={(_, value) => setActiveInnerTab(value)}
            textColor="primary"
            indicatorColor="primary"
            variant={isMobile ? 'fullWidth' : 'standard'}
          >
            <Tab value="form" label={activeConfig.registerLabel} />
            <Tab value="list" label={activeConfig.listLabel} />
          </Tabs>
        </Box>

        <Box key={`${activeForm}-${activeInnerTab}`}>{renderInnerContent}</Box>
      </Box>
      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} message="Operación registrada" />
      <Dialog open={Boolean(wastageToDelete)} onClose={() => setWastageToDelete(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción es irreversible. Se revertirán los cambios en el inventario.
          </Alert>
          <Typography>
            ¿Deseas eliminar la merma registrada el {wastageToDelete ? formatDateTime(wastageToDelete.timestamp) : ''}?
          </Typography>
          {wastageToDelete && wastageToDelete.items.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Items de la merma:
              </Typography>
              <Stack spacing={0.5}>
                {wastageToDelete.items.map((item, itemIndex) => (
                  <Typography key={itemIndex} variant="body2">
                    • {getWastageItemDisplay(item)}
                    {item.reason ? ` • ${item.reason}` : ''}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWastageToDelete(null)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!wastageToDelete) return;
              void deleteWastage(wastageToDelete._id).finally(() => setWastageToDelete(null));
            }}
            color="error"
            variant="contained"
            disabled={!wastageToDelete}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ManualEntryPage;

