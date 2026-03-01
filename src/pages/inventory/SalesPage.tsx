import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import { useAuth } from '../../contexts/AuthContext';
import type { SaleRecord } from '../../types';
import apiClient from '../../services/apiClient';

// ─── Types para el flujo de actualización de stock desde TPV ─────────────────

type UpdateStep = {
  step: number | string;
  name: string;
  success: boolean;
  error?: string;
  details?: Record<string, number>;
};

type UnmatchedItem = {
  productId: string;
  productName?: string | null;
  quantity: number;
  reason: string;
};

type UpdatedIngredient = {
  name: string;
  sku: string;
  stockAnterior: number;
  stockMermaAnterior: number;
  stockRestado: number;
  stockMermaRestada: number;
  stockNuevo: number;
  stockMermaNuevo: number;
};

type UpdatedBeverage = {
  name: string;
  sku: string;
  stockAnterior: number;
  stockRestado: number;
  stockNuevo: number;
};

type UpdateStockResult = {
  success: boolean;
  noTickets?: boolean;
  isDuplicateImport?: boolean;
  message?: string;
  steps?: UpdateStep[];
  summary?: {
    date?: string;
    totalTickets?: number;
    productosUnicos?: number;
    ingredientesActualizados?: number;
    bebidasActualizadas?: number;
    itemsSinMatch?: number;
  };
  updatedIngredients?: UpdatedIngredient[];
  updatedBeverages?: UpdatedBeverage[];
  unmatchedItems?: UnmatchedItem[];
};

// ─── DateFilterInput ─────────────────────────────────────────────────────────
// Input de fecha compacto (DD-MMM-AA) que abre el selector nativo del navegador.

const formatShortDate = (iso: string): string => {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

const DateFilterInput = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const nativeRef = useRef<HTMLInputElement>(null);
  const handleClick = () => {
    try { nativeRef.current?.showPicker?.(); } catch { /* ignorar */ }
  };
  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        size="small"
        label={label}
        value={value ? formatShortDate(value) : ''}
        placeholder="DD-MMM-AA"
        InputLabelProps={{ shrink: true }}
        onClick={handleClick}
        inputProps={{ readOnly: true, style: { cursor: 'pointer', fontSize: '0.8rem' } }}
        sx={{ width: '100%' }}
        InputProps={{
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
                edge="end"
                sx={{ mr: -0.75 }}
              >
                <ClearIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </InputAdornment>
          ) : null
        }}
      />
      <input
        ref={nativeRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />
    </Box>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const SalesPage = () => {
  const {
    salesLog,
    logsLoading,
    fetchManualLogs,
    fetchSnapshot
  } = useInventoryStore((state) => ({
    salesLog: state.salesLog,
    logsLoading: state.logsLoading,
    fetchManualLogs: state.fetchManualLogs,
    fetchSnapshot: state.fetchSnapshot
  }));

  const { hasAnyRole } = useAuth();
  const canUpdateStock = hasAnyRole(['admin', 'manager']);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allSalesData, setAllSalesData] = useState<SaleRecord[]>([]);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);

  // ── Estados para el flujo de actualización de stock desde TPV ─────────────
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateStockResult | null>(null);
  const [updateResultOpen, setUpdateResultOpen] = useState(false);
  const [updateDate, setUpdateDate] = useState<string>('');

  // ── Estados para dialog de configuraciones ───────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [salesCloseTime, setSalesCloseTime] = useState('17:30');
  const [tempSchedule, setTempSchedule] = useState('17:30');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const handleOpenSettings = async () => {
    setEditingSchedule(false);
    setSettingsOpen(true);
    setScheduleLoading(true);
    try {
      const { data } = await apiClient.get('/config/sales-schedule');
      if (data.success && data.salesCloseTime) {
        setSalesCloseTime(data.salesCloseTime);
        setTempSchedule(data.salesCloseTime);
      }
    } catch {
      // Mantener valor por defecto si falla
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleEditSchedule = () => {
    setTempSchedule(salesCloseTime);
    setEditingSchedule(true);
  };
  const handleCancelSchedule = () => {
    setTempSchedule(salesCloseTime);
    setEditingSchedule(false);
  };
  const handleConfirmSchedule = async () => {
    setScheduleSaving(true);
    try {
      const { data } = await apiClient.put('/config/sales-schedule', { salesCloseTime: tempSchedule });
      if (data.success) {
        setSalesCloseTime(data.salesCloseTime);
      }
    } catch {
      // Silently keep old value
    } finally {
      setScheduleSaving(false);
      setEditingSchedule(false);
    }
  };

  // ── Estados para eliminar una venta ─────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = (sale: SaleRecord) => {
    setSaleToDelete(sale);
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/manual/sales/${saleToDelete._id}`);
      setDeleteConfirmOpen(false);
      setSaleToDelete(null);
      // Refrescar lista de ventas + snapshot del inventario (para que el dashboard y stock actual reflejen el revert)
      void Promise.all([fetchManualLogs({}), fetchSnapshot()]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al eliminar la venta')
          : (err instanceof Error ? err.message : 'Error desconocido');
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Estado para expandir items de cada tarjeta ───────────────────────────
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const ITEMS_VISIBLE = 4;

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const toggleItemsExpanded = (saleId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
  };

  const ITEMS_PER_PAGE = 20;

  // Cargar todos los datos una vez al inicio
  useEffect(() => {
    const loadAllData = async () => {
      setInitialLoad(true);
      await fetchManualLogs({});
      setInitialLoad(false);
    };
    void loadAllData();
    setCurrentPage(1);
  }, [fetchManualLogs]);

  useEffect(() => {
    setAllSalesData(salesLog);
  }, [salesLog]);

  // Debounce para el texto de búsqueda (300 ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchText, filterDateFrom, filterDateTo]);

  const filteredSalesData = useMemo(() => {
    let data = allSalesData;

    if (filterDateFrom) {
      const from = new Date(filterDateFrom + 'T00:00:00');
      data = data.filter(s => new Date(s.timestamp) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + 'T23:59:59');
      data = data.filter(s => new Date(s.timestamp) <= to);
    }
    if (debouncedSearchText.trim()) {
      const q = debouncedSearchText.toLowerCase().trim();
      data = data.filter(s => {
        const invoiceCode = (typeof s.metadata?.invoiceCode === 'string' ? s.metadata.invoiceCode : '').toLowerCase();
        const tableCode = (typeof s.metadata?.tableCode === 'string' ? s.metadata.tableCode : '').toLowerCase();
        const placeName = (typeof s.metadata?.placeName === 'string' ? s.metadata.placeName : '').toLowerCase();
        if (invoiceCode.includes(q) || tableCode.includes(q) || placeName.includes(q)) return true;
        const inDishes = s.lines.some(line => {
          const name = typeof line.dish === 'object' && line.dish !== null
            ? ((line.dish as { name?: string }).name ?? '').toLowerCase()
            : '';
          return name.includes(q);
        });
        if (inDishes) return true;
        const rawBev = s.metadata?.beverageLines;
        if (Array.isArray(rawBev)) {
          return (rawBev as Array<{ beverageName?: string }>).some(b =>
            (b.beverageName ?? '').toLowerCase().includes(q)
          );
        }
        return false;
      });
    }
    return data;
  }, [allSalesData, debouncedSearchText, filterDateFrom, filterDateTo]);

  const paginatedSales = useMemo(() => {
    if (filteredSalesData.length === 0) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSalesData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSalesData, currentPage]);

  const totalPages = useMemo(
    () => Math.ceil(filteredSalesData.length / ITEMS_PER_PAGE),
    [filteredSalesData.length]
  );

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

  // ── Actualización de stock desde TPV ──────────────────────────────────────

  const handleUpdateStockConfirm = async () => {
    setUpdateConfirmOpen(false);
    setUpdateLoading(true);
    try {
      const requestBody = updateDate ? { date: updateDate } : {};
      const response = await apiClient.post<UpdateStockResult>('/pos/update-stock', requestBody);
      const data = response.data;
      setUpdateResult(data);
      if (data.success && !data.noTickets) {
        void Promise.all([fetchSnapshot(), fetchManualLogs({})]);
      }
    } catch (err: unknown) {
      const axiosData =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data?: UpdateStockResult } }).response?.data
          : undefined;

      if (axiosData) {
        setUpdateResult(axiosData);
      } else {
        const message =
          err instanceof Error ? err.message : 'Error desconocido al actualizar el stock';
        setUpdateResult({ success: false, message });
      }
    } finally {
      setUpdateLoading(false);
      setUpdateResultOpen(true);
      setUpdateDate(''); // Limpiar la fecha después de la actualización
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      {/* Header */}
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Ventas</Typography>
          {canUpdateStock && (
            <IconButton
              onClick={handleOpenSettings}
              title="Configuraciones"
              aria-label="Abrir configuraciones"
              sx={{ color: 'text.secondary' }}
            >
              <SettingsIcon />
            </IconButton>
          )}
        </Stack>
      </Grid>

      {/* ── Diálogo de Configuraciones ────────────────────────────────────── */}
      <Dialog
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); setEditingSchedule(false); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <SettingsIcon fontSize="small" />
            Configuraciones
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {scheduleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={500}>
                    Horario de cierre de ventas
                  </Typography>
                  {!editingSchedule && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {salesCloseTime}hs
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={handleEditSchedule}
                        title="Modificar horario"
                        aria-label="Modificar horario"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
                {editingSchedule && (
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <TextField
                      type="time"
                      value={tempSchedule}
                      onChange={(e) => setTempSchedule(e.target.value)}
                      size="small"
                      fullWidth
                      inputProps={{ step: 300 }}
                      disabled={scheduleSaving}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={handleCancelSchedule} disabled={scheduleSaving}>
                        Cancelar
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleConfirmSchedule}
                        disabled={!tempSchedule || scheduleSaving}
                        startIcon={scheduleSaving ? <CircularProgress size={14} color="inherit" /> : null}
                      >
                        {scheduleSaving ? 'Guardando…' : 'Confirmar'}
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSettingsOpen(false); setEditingSchedule(false); }} disabled={scheduleSaving}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo confirmación actualización de stock desde TPV ─────────── */}
      <Dialog
        open={updateConfirmOpen}
        onClose={() => {
          setUpdateConfirmOpen(false);
          setUpdateDate(''); // Limpiar fecha al cerrar
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <SyncIcon color="primary" />
            Actualizar Registro de Ventas
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {/* Selector de fecha */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Fecha de actualización (opcional)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Si no seleccionas una fecha, se utilizará el día de hoy.
              </Typography>
              <DateFilterInput
                label="Fecha"
                value={updateDate}
                onChange={setUpdateDate}
              />
            </Box>
            <Typography>
              Se realizará el siguiente proceso de forma <strong>automática e irreversible</strong>:
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 } }}>
              <li>
                <Typography variant="body2">
                  <strong>Obtención de tickets PAID del día</strong> desde el TPV Qamarero para la fecha {updateDate ? formatShortDate(updateDate) : 'de hoy'}.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Verificación de duplicados:</strong> se comprueba que no se hayan importado ya las ventas {updateDate ? `del ${formatShortDate(updateDate)}` : 'de hoy'}.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Guardado en la base de datos</strong> del registro de ventas del TPV para auditoría.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Descuento de stock de ingredientes</strong> según la receta de cada plato vendido
                  (campo <em>stockMerma</em> y <em>stock</em> con factor de merma natural).
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Descuento de stock de bebidas</strong> según las unidades vendidas.
                </Typography>
              </li>
            </Box>
            <Alert severity="warning" icon={<WarningAmberIcon />}>
              Este proceso puede tardar unos momentos. No cierres la aplicación hasta que finalice.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setUpdateConfirmOpen(false);
              setUpdateDate(''); // Limpiar fecha al cancelar
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleUpdateStockConfirm}
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Loading overlay (no se puede cerrar) ──────────────────────────── */}
      <Dialog
        open={updateLoading}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        onClose={() => { /* bloqueado intencionalmente */ }}
      >
        <DialogTitle>Actualizando stock desde TPV…</DialogTitle>
        <DialogContent>
          <Stack spacing={3} alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={64} />
            <Typography variant="body1" textAlign="center">
              El proceso está en ejecución. Esto puede tomar unos momentos.
              <br />
              <strong>Por favor, no cierres ni recargues la página.</strong>
            </Typography>
            <Box sx={{ width: '100%' }}>
              <LinearProgress />
            </Box>
            <Stack spacing={0.5} sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary">① Obteniendo tickets del día desde Qamarero…</Typography>
              <Typography variant="caption" color="text.secondary">② Verificando duplicados…</Typography>
              <Typography variant="caption" color="text.secondary">③ Guardando registro en la base de datos…</Typography>
              <Typography variant="caption" color="text.secondary">④ Descontando stock de ingredientes y bebidas…</Typography>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo resultado actualización ────────────────────────────────── */}
      <Dialog
        open={updateResultOpen}
        onClose={() => setUpdateResultOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            {updateResult?.success
              ? <CheckCircleOutlineIcon color="success" />
              : updateResult?.isDuplicateImport
                ? <WarningAmberIcon color="warning" />
                : <ErrorOutlineIcon color="error" />}
            {updateResult?.success
              ? 'Actualización completada'
              : updateResult?.isDuplicateImport
                ? 'Ventas ya registradas hoy'
                : 'Error en la actualización'}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {updateResult && (
            <Stack spacing={3}>

              {/* Importación duplicada */}
              {updateResult.isDuplicateImport && (
                <Alert severity="warning" icon={<WarningAmberIcon />}>
                  <strong>Las ventas de hoy ya fueron registradas</strong>
                  <br />
                  {updateResult.message}
                  <br />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Solo se permite una importación de ventas por día para evitar duplicados en el stock.
                  </Typography>
                </Alert>
              )}

              {/* Sin tickets */}
              {!updateResult.isDuplicateImport && updateResult.noTickets && (
                <Alert severity="info">
                  {updateResult.message ?? 'No se encontraron tickets PAID para el día de hoy en Qamarero.'}
                </Alert>
              )}

              {/* Error general */}
              {!updateResult.isDuplicateImport && !updateResult.success && !updateResult.noTickets && (
                <Alert severity="error">
                  {updateResult.message ?? 'Ha ocurrido un error desconocido.'}
                </Alert>
              )}

              {/* Pasos ejecutados */}
              {(updateResult.steps ?? []).length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Pasos del proceso</Typography>
                  <Stack spacing={1}>
                    {updateResult.steps!.map((step) => (
                      <Stack key={step.step} direction="row" alignItems="flex-start" gap={1}>
                        {step.success
                          ? <CheckCircleOutlineIcon color="success" fontSize="small" sx={{ mt: 0.2 }} />
                          : <ErrorOutlineIcon color="error" fontSize="small" sx={{ mt: 0.2 }} />}
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{step.step}. {step.name}</Typography>
                          {step.details && (
                            <Typography variant="caption" color="text.secondary">
                              {Object.entries(step.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </Typography>
                          )}
                          {step.error && (
                            <Typography variant="caption" color="error.main">Error: {step.error}</Typography>
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Resumen con chips */}
              {updateResult.summary && !updateResult.noTickets && updateResult.success && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Resumen</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {updateResult.summary.date && (
                        <Chip label={`Fecha: ${updateResult.summary.date}`} size="small" color="primary" variant="outlined" />
                      )}
                      <Chip label={`${updateResult.summary.totalTickets ?? 0} tickets procesados`} size="small" color="info" variant="outlined" />
                      <Chip label={`${updateResult.summary.productosUnicos ?? 0} productos únicos`} size="small" variant="outlined" />
                      <Chip label={`${updateResult.summary.ingredientesActualizados ?? 0} ingredientes actualizados`} size="small" color="success" variant="outlined" />
                      <Chip label={`${updateResult.summary.bebidasActualizadas ?? 0} bebidas actualizadas`} size="small" color="success" variant="outlined" />
                      {(updateResult.summary.itemsSinMatch ?? 0) > 0 && (
                        <Chip label={`${updateResult.summary.itemsSinMatch} sin match`} size="small" color="warning" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </>
              )}

              {/* Ingredientes actualizados */}
              {(updateResult.updatedIngredients ?? []).length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Ingredientes actualizados
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Ingrediente</strong></TableCell>
                            <TableCell align="right"><strong>Stock anterior</strong></TableCell>
                            <TableCell align="right"><strong>Restado</strong></TableCell>
                            <TableCell align="right"><strong>Stock nuevo</strong></TableCell>
                            <TableCell align="right"><strong>StockMerma anterior</strong></TableCell>
                            <TableCell align="right"><strong>Merma restada</strong></TableCell>
                            <TableCell align="right"><strong>StockMerma nuevo</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {updateResult.updatedIngredients!.map((ing, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>{ing.name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">{ing.sku}</Typography>
                              </TableCell>
                              <TableCell align="right">{ing.stockAnterior}g</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main' }}>−{ing.stockRestado}g</TableCell>
                              <TableCell align="right">{ing.stockNuevo}g</TableCell>
                              <TableCell align="right">{ing.stockMermaAnterior}g</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main' }}>−{ing.stockMermaRestada}g</TableCell>
                              <TableCell align="right">{ing.stockMermaNuevo}g</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </>
              )}

              {/* Bebidas actualizadas */}
              {(updateResult.updatedBeverages ?? []).length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Bebidas actualizadas
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Bebida</strong></TableCell>
                            <TableCell align="right"><strong>Stock anterior</strong></TableCell>
                            <TableCell align="right"><strong>Restado</strong></TableCell>
                            <TableCell align="right"><strong>Stock nuevo</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {updateResult.updatedBeverages!.map((bev, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>{bev.name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">{bev.sku}</Typography>
                              </TableCell>
                              <TableCell align="right">{bev.stockAnterior} u</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main' }}>−{bev.stockRestado} u</TableCell>
                              <TableCell align="right">{bev.stockNuevo} u</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </>
              )}

              {/* Items sin match */}
              {(updateResult.unmatchedItems ?? []).length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Stack direction="row" alignItems="center" gap={1} mb={1}>
                      <WarningAmberIcon color="warning" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Productos sin coincidencia
                      </Typography>
                    </Stack>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Los siguientes productos del TPV no tienen el campo <em>productId</em> configurado
                      en ningún plato ni bebida de la base de datos. Configúralos para que se descuenten
                      automáticamente en futuras actualizaciones.
                    </Alert>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>ID Producto (Qamarero)</strong></TableCell>
                            <TableCell><strong>Nombre</strong></TableCell>
                            <TableCell align="right"><strong>Cantidad</strong></TableCell>
                            <TableCell><strong>Motivo</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {updateResult.unmatchedItems!.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography fontFamily="monospace" variant="body2">{item.productId}</Typography>
                              </TableCell>
                              <TableCell>{item.productName ?? '—'}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">{item.reason}</Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </>
              )}

              {/* Todo ok sin items sin match */}
              {updateResult.success && !updateResult.noTickets &&
                (updateResult.unmatchedItems ?? []).length === 0 && (
                  <Alert severity="success">
                    ¡Todo correcto! El stock se ha actualizado con todas las ventas del TPV de hoy.
                    Ya puedes seguir usando la aplicación con normalidad.
                  </Alert>
                )}

            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setUpdateResultOpen(false)}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo confirmación eliminar venta ──────────────────────────── */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => { if (!deleteLoading) { setDeleteConfirmOpen(false); setSaleToDelete(null); } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <DeleteOutlineIcon color="error" />
            Eliminar venta
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {saleToDelete && (
              <Typography>
                ¿Eliminar{' '}
                <strong>
                  {typeof saleToDelete.metadata?.invoiceCode === 'string'
                    ? saleToDelete.metadata.invoiceCode
                    : `Venta #${saleToDelete._id.slice(-6)}`}
                </strong>
                ?
              </Typography>
            )}
            <Alert severity="error">
              <strong>Esta acción es irreversible.</strong>
              <br />
              Se eliminarán los datos del ticket de la base de datos y se desharán todos los descuentos
              de stock aplicados (ingredientes{saleToDelete?.source === 'pos' ? ' y bebidas' : ''}).
              {saleToDelete?.source === 'pos' && (
                <>
                  <br />
                  Si es la última venta del día importada desde el TPV, también se eliminará el registro
                  de importación, permitiendo volver a importar ese día.
                </>
              )}
            </Alert>
            {deleteError && (
              <Alert severity="error">{deleteError}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setDeleteConfirmOpen(false); setSaleToDelete(null); }}
            disabled={deleteLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />}
          >
            {deleteLoading ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Botón Actualizar Registro de Ventas ──────────────────────────── */}
      {canUpdateStock && (
        <Grid item xs={12}>
          <Button
            variant="contained"
            fullWidth
            sx={{ backgroundColor: '#424242', '&:hover': { backgroundColor: '#616161' } }}
            onClick={() => setUpdateConfirmOpen(true)}
            startIcon={<SyncIcon />}
          >
            Actualizar Registro de Ventas
          </Button>
        </Grid>
      )}

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <Grid item xs={12}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          sx={{ width: '100%' }}
        >
          <TextField
            size="small"
            placeholder="Indica una palabra para buscar…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ flex: 3, minWidth: 0, pb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchText ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchText('')} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, flex: 2, minWidth: 0 }}>
            <DateFilterInput label="Desde" value={filterDateFrom} onChange={setFilterDateFrom} />
            <DateFilterInput label="Hasta" value={filterDateTo} onChange={setFilterDateTo} />
          </Box>
          {(searchText || filterDateFrom || filterDateTo) && (
            <Button
              size="small"
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={() => { setSearchText(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            >
              Limpiar
            </Button>
          )}
        </Stack>
      </Grid>

      {/* ── Lista de ventas ────────────────────────────────────────────────── */}
      {initialLoad && logsLoading ? (
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : filteredSalesData.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity="info">
            {allSalesData.length === 0
              ? 'No hay ventas registradas.'
              : 'No se encontraron ventas con los filtros aplicados.'}
          </Alert>
        </Grid>
      ) : (
        <>
          {paginatedSales.map((sale: SaleRecord) => {
            const invoiceCode =
              typeof sale.metadata?.invoiceCode === 'string'
                ? sale.metadata.invoiceCode
                : null;
            const tableCode =
              typeof sale.metadata?.tableCode === 'string'
                ? sale.metadata.tableCode
                : null;
            const placeName =
              typeof sale.metadata?.placeName === 'string'
                ? sale.metadata.placeName
                : null;
            const totalAmount =
              typeof sale.metadata?.totalAmount === 'number'
                ? (sale.metadata.totalAmount as number)
                : null;

            return (
              <Grid key={sale._id} item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-all' }}>
                            {invoiceCode ?? `Venta #${sale._id.slice(-6)}`}
                          </Typography>
                          {(tableCode || placeName) && (
                            <Typography variant="caption" color="text.secondary">
                              {[tableCode, placeName].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                        </Box>
                        {canUpdateStock && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(sale)}
                            title="Eliminar venta"
                            aria-label="Eliminar venta"
                            sx={{ ml: 1, flexShrink: 0 }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Origen: {sale.source === 'pos' ? 'TPV' : 'Manual'}
                        </Typography>
                        <Stack alignItems="flex-end" spacing={0.25}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(sale.timestamp)}
                          </Typography>
                          {totalAmount !== null && (
                            <Typography variant="caption" color="text.secondary">
                              {totalAmount.toFixed(2)} €
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                      <Divider />
                      <Stack spacing={1}>
                        {sale.lines.length > 0 && (
                          <Typography variant="subtitle2" color="text.secondary">Platos:</Typography>
                        )}
                        {sale.lines.slice(0, ITEMS_VISIBLE).map((line, index) => {
                          const dishName =
                            typeof line.dish === 'string'
                              ? 'Plato desconocido'
                              : line.dish?.name || 'Plato desconocido';
                          return (
                            <Box key={index}>
                              <Typography variant="body2">
                                • {dishName}: {line.quantity} unidad(es)
                              </Typography>
                            </Box>
                          );
                        })}
                        {sale.lines.length > ITEMS_VISIBLE && (
                          <>
                            <Collapse in={expandedItems.has(sale._id)}>
                              <Stack spacing={1}>
                                {sale.lines.slice(ITEMS_VISIBLE).map((line, index) => {
                                  const dishName =
                                    typeof line.dish === 'string'
                                      ? 'Plato desconocido'
                                      : line.dish?.name || 'Plato desconocido';
                                  return (
                                    <Box key={index}>
                                      <Typography variant="body2">
                                        • {dishName}: {line.quantity} unidad(es)
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Stack>
                            </Collapse>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => toggleItemsExpanded(sale._id)}
                              endIcon={expandedItems.has(sale._id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              sx={{ alignSelf: 'flex-start', px: 0, color: 'text.secondary' }}
                            >
                              {expandedItems.has(sale._id)
                                ? 'Ver menos'
                                : `Ver ${sale.lines.length - ITEMS_VISIBLE} más`}
                            </Button>
                          </>
                        )}
                        {/* Bebidas de la venta (ventas TPV) */}
                        {(() => {
                          const rawBevLines = sale.metadata?.beverageLines;
                          const beverageLines = Array.isArray(rawBevLines)
                            ? (rawBevLines as Array<{ beverageId: string; beverageName?: string; quantity: number }>)
                            : [];
                          if (beverageLines.length === 0) return null;
                          return (
                            <>
                              <Divider sx={{ my: 0.5 }} />
                              <Typography variant="subtitle2" color="text.secondary">Bebidas:</Typography>
                              {beverageLines.map((bl, idx) => (
                                <Box key={idx}>
                                  <Typography variant="body2">
                                    • {bl.beverageName ?? 'Bebida'}: {bl.quantity} unidad(es)
                                  </Typography>
                                </Box>
                              ))}
                            </>
                          );
                        })()}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {filteredSalesData.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
                <IconButton onClick={handlePreviousPage} disabled={currentPage === 1} aria-label="Página anterior">
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  Página {currentPage} de {totalPages}
                </Typography>
                <IconButton onClick={handleNextPage} disabled={currentPage >= totalPages} aria-label="Página siguiente">
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Grid>
          )}
        </>
      )}

    </Grid>
  );
};

export default SalesPage;
