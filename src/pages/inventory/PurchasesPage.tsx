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
  DialogActions
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import { useAuth } from '../../contexts/AuthContext';
import type { PurchaseRecord } from '../../types';
import apiClient from '../../services/apiClient';

// ─── Types para el flujo de actualización de stock ───────────────────────────

type UpdateStep = {
  step: number | string;
  name: string;
  success: boolean;
  error?: string;
  details?: Record<string, number>;
};

type UnmatchedItem = {
  codigoArticulo: string;
  descripcionArticulo?: string | null;
  cantidadFactura: number;
  cantidadTotalGramos: number;
  razon: string;
};

type CreatedPurchase = {
  id: string;
  invoiceNumber: string | null;
  supplier: string | null;
  date: string;
  ingredientItemsCount: number;
  totalItemsInInvoice: number;
};

type UpdateStockResult = {
  success: boolean;
  noNewInvoices?: boolean;
  isDuplicateInvoice?: boolean;
  message?: string;
  steps?: UpdateStep[];
  createdPurchases?: CreatedPurchase[];
  updatedIngredients?: {
    name: string;
    sku: string;
    stockAnterior: number;
    stockSumado: number;
    stockNuevo: number;
  }[];
  updatedBeverages?: {
    name: string;
    sku: string;
    stockAnterior: number;
    stockSumado: number;
    stockNuevo: number;
  }[];
  unmatchedItems?: UnmatchedItem[];
  summary?: Record<string, number>;
};

// ─── Componente principal ─────────────────────────────────────────────────────

const PurchasesPage = () => {
  const {
    purchasesLog,
    logsLoading,
    fetchManualLogs,
    fetchSnapshot,
    suppliers,
    fetchSuppliers
  } = useInventoryStore((state) => ({
    purchasesLog: state.purchasesLog,
    logsLoading: state.logsLoading,
    fetchManualLogs: state.fetchManualLogs,
    fetchSnapshot: state.fetchSnapshot,
    suppliers: state.suppliers,
    fetchSuppliers: state.fetchSuppliers
  }));

  const { hasAnyRole } = useAuth();
  const canUpdateStock = hasAnyRole(['admin', 'manager']);

  // Ref para el input de archivo PDF oculto
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allPurchasesData, setAllPurchasesData] = useState<PurchaseRecord[]>([]);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);

  // ── Estados para el flujo de actualización de stock (bucket o PDF cargado) ─
  // 'bucket' → botón Actualizar (lee del bucket GCS)
  // 'pdf'    → botón Cargar PDF (usa el archivo seleccionado)
  const [updateMode, setUpdateMode] = useState<'bucket' | 'pdf'>('bucket');
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfFileError, setPdfFileError] = useState<string | null>(null);

  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateStockResult | null>(null);
  const [updateResultOpen, setUpdateResultOpen] = useState(false);

  // ── Estados para dialog de configuraciones ───────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [dailySchedule, setDailySchedule] = useState('18:00');
  const [tempSchedule, setTempSchedule] = useState('18:00');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const handleOpenSettings = async () => {
    setEditingSchedule(false);
    setSettingsOpen(true);
    // Cargar horario actual desde la BD
    setScheduleLoading(true);
    try {
      const { data } = await apiClient.get('/config/schedule');
      if (data.success && data.dailyUpdateSchedule) {
        setDailySchedule(data.dailyUpdateSchedule);
        setTempSchedule(data.dailyUpdateSchedule);
      }
    } catch (err) {
      // Mantener valor por defecto si falla
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleEditSchedule = () => {
    setTempSchedule(dailySchedule);
    setEditingSchedule(true);
  };
  const handleCancelSchedule = () => {
    setTempSchedule(dailySchedule);
    setEditingSchedule(false);
  };
  const handleConfirmSchedule = async () => {
    setScheduleSaving(true);
    try {
      const { data } = await apiClient.put('/config/schedule', { dailyUpdateSchedule: tempSchedule });
      if (data.success) {
        setDailySchedule(data.dailyUpdateSchedule);
      }
    } catch (err) {
      // Silently keep old value on error — backend validation will have fired
    } finally {
      setScheduleSaving(false);
      setEditingSchedule(false);
    }
  };

  // ── Estado para expandir items de cada tarjeta ───────────────────────────
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const ITEMS_VISIBLE = 4;

  const toggleItemsExpanded = (purchaseId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(purchaseId)) next.delete(purchaseId);
      else next.add(purchaseId);
      return next;
    });
  };

  // ── Estados para eliminación de compra ────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<PurchaseRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const ITEMS_PER_PAGE = 20;

  // Mapa SKU → nombre de proveedor para lookup rápido en las tarjetas
  const supplierNameBySku = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach(s => { if (s.sku) map.set(s.sku, s.name); });
    return map;
  }, [suppliers]);

  // Cargar todos los datos una vez al inicio (sin filtros)
  useEffect(() => {
    const loadAllData = async () => {
      setInitialLoad(true);
      await Promise.all([fetchManualLogs({}), suppliers.length === 0 ? fetchSuppliers() : Promise.resolve()]);
      setInitialLoad(false);
    };
    void loadAllData();
    setCurrentPage(1);
  }, [fetchManualLogs, fetchSuppliers]);

  useEffect(() => {
    // Siempre sincronizar allPurchasesData con purchasesLog cuando este cambie
    setAllPurchasesData(purchasesLog);
  }, [purchasesLog]);

  const filteredPurchases = useMemo(() => allPurchasesData, [allPurchasesData]);

  const paginatedPurchases = useMemo(() => {
    if (filteredPurchases.length === 0) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPurchases.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPurchases, currentPage]);

  const totalPages = useMemo(
    () => Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE),
    [filteredPurchases.length]
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

  // ── Cargar PDF: abre el selector de archivos ─────────────────────────────

  const handleCargarPdfClick = () => {
    setPdfFileError(null);
    // Limpiar valor anterior para permitir re-seleccionar el mismo archivo
    if (pdfInputRef.current) pdfInputRef.current.value = '';
    pdfInputRef.current?.click();
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    // Validar formato
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfFileError('Solo se permiten archivos PDF.');
      setSelectedPdf(null);
      return;
    }

    // Validar tamaño (máx 2 MB)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setPdfFileError(`El archivo supera el tamaño máximo de 2 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      setSelectedPdf(null);
      return;
    }

    setPdfFileError(null);
    setSelectedPdf(file);
    setUpdateMode('pdf');
    setUpdateConfirmOpen(true);
  };

  // ── Actualización de stock (desde bucket o desde PDF cargado) ─────────────

  const handleUpdateStockConfirm = async () => {
    setUpdateConfirmOpen(false);
    setUpdateLoading(true);
    try {
      let data: UpdateStockResult;

      if (updateMode === 'pdf' && selectedPdf) {
        // Leer el PDF como base64
        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Eliminar el prefijo "data:application/pdf;base64,"
            resolve(result.split(',')[1]);
          };
          reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
          reader.readAsDataURL(selectedPdf);
        });

        const response = await apiClient.post<UpdateStockResult>('/suppliers/upload-pdf-stock', {
          pdfBase64,
          fileName: selectedPdf.name
        });
        data = response.data;
      } else {
        // Modo bucket (botón Actualizar)
        const response = await apiClient.post<UpdateStockResult>('/suppliers/update-stock');
        data = response.data;
      }

      setUpdateResult(data);
      // Refrescar snapshot (inventario/dashboard) y lista de compras en paralelo
      if (data.success && !data.noNewInvoices) {
        void Promise.all([fetchSnapshot(), fetchManualLogs({})]);
      }
    } catch (err: unknown) {
      // Extraer la respuesta de error de Axios si está disponible
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
      setSelectedPdf(null);
    }
  };

  // ── Eliminación de compra ─────────────────────────────────────────────────

  const handleDeleteClick = (purchase: PurchaseRecord) => {
    setDeletingPurchaseId(purchase._id);
    setDeletingPurchase(purchase);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPurchaseId) return;
    setDeleteConfirmOpen(false);
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/manual/purchases/${deletingPurchaseId}`);
      // Actualizar la lista local eliminando el registro
      setAllPurchasesData(prev => prev.filter(p => p._id !== deletingPurchaseId));
      // Refrescar snapshot de stock
      await fetchSnapshot();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido al eliminar la compra';
      alert(`Error al eliminar la compra: ${message}`);
    } finally {
      setDeleteLoading(false);
      setDeletingPurchaseId(null);
      setDeletingPurchase(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDeletingPurchaseId(null);
    setDeletingPurchase(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      {/* Header */}
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Compras</Typography>
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

      {/* Input PDF oculto */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handlePdfFileSelect}
      />

      {/* Botones de acción */}
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleCargarPdfClick}
            startIcon={<PictureAsPdfIcon />}
            sx={{ flex: 1 }}
          >
            Cargar PDF
          </Button>
          {canUpdateStock && (
            <Button
              variant="contained"
              fullWidth
              sx={{ flex: 1, backgroundColor: '#424242', '&:hover': { backgroundColor: '#616161' } }}
              onClick={() => { setUpdateMode('bucket'); setUpdateConfirmOpen(true); }}
              startIcon={<SyncIcon />}
            >
              Actualizar
            </Button>
          )}
        </Stack>
        {pdfFileError && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setPdfFileError(null)}>
            {pdfFileError}
          </Alert>
        )}
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
              {/* Configuración: Horario de actualización diaria */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={500}>
                    Horario de actualización diaria
                  </Typography>
                  {!editingSchedule && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {dailySchedule}hs
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

      {/* ── Diálogo confirmación actualización de stock (bucket o PDF cargado) ─ */}
      <Dialog
        open={updateConfirmOpen}
        onClose={() => { setUpdateConfirmOpen(false); setSelectedPdf(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            {updateMode === 'pdf' ? <PictureAsPdfIcon color="primary" /> : <SyncIcon color="primary" />}
            {updateMode === 'pdf'
              ? 'Procesar factura PDF cargada'
              : 'Actualizar stock desde facturas'}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {updateMode === 'pdf' && selectedPdf && (
              <Alert severity="info" icon={<PictureAsPdfIcon />}>
                <strong>Archivo seleccionado:</strong> {selectedPdf.name}{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({(selectedPdf.size / 1024).toFixed(0)} KB)
                </Typography>
              </Alert>
            )}
            <Typography>
              Se realizará el siguiente proceso de forma <strong>automática e irreversible</strong>:
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 } }}>
              <li>
                <Typography variant="body2">
                  {updateMode === 'pdf' ? (
                    <><strong>Procesamiento del PDF cargado</strong> mediante IA (Gemini) para extraer los datos de la factura.</>
                  ) : (
                    <><strong>Búsqueda de facturas nuevas</strong> en el bucket de Google Cloud Storage. Cada PDF nuevo será procesado con IA (Gemini) para extraer sus datos.</>
                  )}
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Unificación de items</strong> de la{updateMode === 'pdf' ? '' : 's'} factura{updateMode === 'pdf' ? '' : 's'}, agrupando por código de artículo.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Actualización de stock</strong> en ingredientes y bebidas mediante el código de artículo (<em>codeArticlePurchase</em>). Los items sin coincidencia se mostrarán al finalizar para agregarlos manualmente.
                </Typography>
              </li>
            </Box>
            <Alert severity="warning" icon={<WarningAmberIcon />}>
              Este proceso puede tardar varios minutos. No cierres la aplicación hasta que finalice.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setUpdateConfirmOpen(false); setSelectedPdf(null); }}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={updateMode === 'pdf' ? <PictureAsPdfIcon /> : <SyncIcon />}
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
        <DialogTitle>Actualizando stock…</DialogTitle>
        <DialogContent>
          <Stack spacing={3} alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={64} />
            <Typography variant="body1" textAlign="center">
              El proceso está en ejecución. Esto puede tomar varios minutos.
              <br />
              <strong>Por favor, no cierres ni recargues la página.</strong>
            </Typography>
            <Box sx={{ width: '100%' }}>
              <LinearProgress />
            </Box>
            <Stack spacing={0.5} sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary">
                ① {updateMode === 'pdf' ? 'Procesando el PDF cargado con IA (Gemini)…' : 'Procesando PDFs del bucket con IA (Gemini)…'}
              </Typography>
              <Typography variant="caption" color="text.secondary">② Unificando items de facturas…</Typography>
              <Typography variant="caption" color="text.secondary">③ Registrando compras en el historial…</Typography>
              <Typography variant="caption" color="text.secondary">④ Actualizando stock en ingredientes y bebidas…</Typography>
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
              : updateResult?.isDuplicateInvoice
                ? <WarningAmberIcon color="warning" />
                : <ErrorOutlineIcon color="error" />}
            {updateResult?.success
              ? 'Actualización completada'
              : updateResult?.isDuplicateInvoice
                ? 'Factura ya registrada'
                : 'Error en la actualización'}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {updateResult && (
            <Stack spacing={3}>

              {/* Factura duplicada */}
              {updateResult.isDuplicateInvoice && (
                <Alert severity="warning" icon={<WarningAmberIcon />}>
                  <strong>Factura ya registrada</strong>
                  <br />
                  {updateResult.message}
                  <br />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Si necesitas corregir un error, elimina primero la compra existente y vuelve a subir el PDF.
                  </Typography>
                </Alert>
              )}

              {/* Sin facturas nuevas */}
              {!updateResult.isDuplicateInvoice && updateResult.noNewInvoices && (
                <Alert severity="info">
                  {updateResult.message ?? 'No se encontraron facturas nuevas en el bucket.'}
                </Alert>
              )}

              {/* Error general */}
              {!updateResult.isDuplicateInvoice && !updateResult.success && !updateResult.noNewInvoices && (
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
              {updateResult.summary && !updateResult.noNewInvoices && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Resumen</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <Chip label={`${updateResult.summary.facturasNuevas ?? 0} facturas nuevas`} size="small" color="primary" variant="outlined" />
                      <Chip label={`${updateResult.summary.purchasesCreados ?? 0} compras registradas`} size="small" color="info" variant="outlined" />
                      <Chip label={`${updateResult.summary.itemsUnificados ?? 0} items unificados`} size="small" variant="outlined" />
                      <Chip label={`${updateResult.summary.ingredientesActualizados ?? 0} ingredientes actualizados`} size="small" color="success" variant="outlined" />
                      <Chip label={`${updateResult.summary.bebidasActualizadas ?? 0} bebidas actualizadas`} size="small" color="success" variant="outlined" />
                      {(updateResult.summary.itemsSinMatch ?? 0) > 0 && (
                        <Chip label={`${updateResult.summary.itemsSinMatch} sin match`} size="small" color="warning" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </>
              )}

              {/* Compras registradas */}
              {(updateResult.createdPurchases ?? []).length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Compras registradas en el historial
                    </Typography>
                    <Stack spacing={1}>
                      {updateResult.createdPurchases!.map((p, idx) => (
                        <Stack key={idx} direction="row" alignItems="center" gap={1} flexWrap="wrap">
                          <CheckCircleOutlineIcon color="success" fontSize="small" />
                          <Typography variant="body2">
                            <strong>Factura {p.invoiceNumber ?? '—'}</strong>
                            {p.supplier ? ` · ${p.supplier}` : ''}
                          </Typography>
                          <Chip
                            label={`${p.ingredientItemsCount}/${p.totalItemsInInvoice} items de ingredientes`}
                            size="small"
                            variant="outlined"
                            color={p.ingredientItemsCount > 0 ? 'success' : 'default'}
                          />
                        </Stack>
                      ))}
                    </Stack>
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
                        Items sin coincidencia — deben agregarse manualmente
                      </Typography>
                    </Stack>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Los siguientes artículos no pudieron asociarse a ningún ingrediente o bebida.
                      Verifica que el campo <em>codeArticlePurchase</em> esté configurado o agrégalos
                      manualmente.
                    </Alert>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Código</strong></TableCell>
                            <TableCell><strong>Descripción</strong></TableCell>
                            <TableCell align="right"><strong>Cant. factura</strong></TableCell>
                            <TableCell align="right"><strong>Gramos</strong></TableCell>
                            <TableCell><strong>Motivo</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {updateResult.unmatchedItems!.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Typography fontFamily="monospace" variant="body2">{item.codigoArticulo}</Typography>
                              </TableCell>
                              <TableCell>{item.descripcionArticulo ?? '—'}</TableCell>
                              <TableCell align="right">{item.cantidadFactura}</TableCell>
                              <TableCell align="right">{item.cantidadTotalGramos}</TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">{item.razon}</Typography>
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
              {updateResult.success && !updateResult.noNewInvoices && (updateResult.unmatchedItems ?? []).length === 0 && (
                <Alert severity="success">
                  ¡Todo correcto! El stock se ha actualizado para todos los artículos de las facturas
                  nuevas. Ya puedes seguir usando la aplicación con normalidad.
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

      {/* ── Diálogo de confirmación eliminación de compra ─────────────────── */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <DeleteOutlineIcon color="error" />
            Revertir factura de compra
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {deletingPurchase && (
              <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                {deletingPurchase.invoiceNumber && (
                  <Typography variant="body2"><strong>Factura:</strong> {deletingPurchase.invoiceNumber}</Typography>
                )}
                {deletingPurchase.supplier && (
                  <Typography variant="body2">
                    <strong>Proveedor:</strong> {supplierNameBySku.get(deletingPurchase.supplier) ?? deletingPurchase.supplier}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Fecha:</strong> {formatDate(deletingPurchase.timestamp)}
                </Typography>
                <Typography variant="body2">
                  <strong>Items:</strong> {deletingPurchase.items.length}
                </Typography>
              </Box>
            )}
            <Typography>
              Se va a <strong>revertir por completo</strong> esta factura de compra. El proceso realizará
              lo siguiente de forma automática:
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.5 } }}>
              <li>
                <Typography variant="body2">Se restará del stock de cada ingrediente la cantidad que se sumó al registrar esta compra.</Typography>
              </li>
              <li>
                <Typography variant="body2">Se restará del stock de las bebidas correspondientes.</Typography>
              </li>
              <li>
                <Typography variant="body2">Se eliminará el registro de la base de datos, permitiendo volver a subir esta factura en otro momento.</Typography>
              </li>
            </Box>
            <Alert severity="error" icon={<WarningAmberIcon />}>
              <strong>Esta acción es irreversible.</strong> Asegúrate de que deseas revertir esta carga de stock antes de continuar.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteLoading}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={18} color="inherit" /> : <DeleteOutlineIcon />}
          >
            {deleteLoading ? 'Revirtiendo…' : 'Aceptar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Lista de compras ───────────────────────────────────────────────── */}
      {initialLoad && logsLoading ? (
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : filteredPurchases.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity="info">No hay compras registradas en el rango de fechas seleccionado.</Alert>
        </Grid>
      ) : (
        <>
          {paginatedPurchases.map((purchase: PurchaseRecord) => (
            <Grid key={purchase._id} item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={600}>
                        {purchase.invoiceNumber ?? `Compra #${purchase._id.slice(-6)}`}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(purchase.timestamp)}
                        </Typography>
                        {canUpdateStock && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(purchase)}
                            disabled={deleteLoading && deletingPurchaseId === purchase._id}
                            aria-label="Eliminar compra"
                            title="Revertir factura"
                          >
                            {deleteLoading && deletingPurchaseId === purchase._id
                              ? <CircularProgress size={16} color="error" />
                              : <DeleteOutlineIcon fontSize="small" />}
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                    {purchase.supplier && (
                      <Typography variant="body2" color="text.secondary">
                        Proveedor: {supplierNameBySku.get(purchase.supplier) ?? purchase.supplier}
                      </Typography>
                    )}
                    <Divider />
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">Items:</Typography>
                      {purchase.items.slice(0, ITEMS_VISIBLE).map((item, index) => {
                        const ingredientName =
                          typeof item.ingredient === 'string'
                            ? 'Ingrediente desconocido'
                            : item.ingredient?.name || 'Ingrediente desconocido';
                        return (
                          <Box key={index}>
                            <Typography variant="body2">
                              • {ingredientName}: {item.quantityInGrams}g
                              {item.unitPrice && ` - $${item.unitPrice.toFixed(2)}`}
                            </Typography>
                          </Box>
                        );
                      })}
                      {purchase.items.length > ITEMS_VISIBLE && (
                        <>
                          <Collapse in={expandedItems.has(purchase._id)}>
                            <Stack spacing={1}>
                              {purchase.items.slice(ITEMS_VISIBLE).map((item, index) => {
                                const ingredientName =
                                  typeof item.ingredient === 'string'
                                    ? 'Ingrediente desconocido'
                                    : item.ingredient?.name || 'Ingrediente desconocido';
                                return (
                                  <Box key={index}>
                                    <Typography variant="body2">
                                      • {ingredientName}: {item.quantityInGrams}g
                                      {item.unitPrice && ` - $${item.unitPrice.toFixed(2)}`}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Collapse>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => toggleItemsExpanded(purchase._id)}
                            endIcon={expandedItems.has(purchase._id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ alignSelf: 'flex-start', px: 0, color: 'text.secondary' }}
                          >
                            {expandedItems.has(purchase._id)
                              ? 'Ver menos'
                              : `Ver ${purchase.items.length - ITEMS_VISIBLE} más`}
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {filteredPurchases.length > 0 && (
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

export default PurchasesPage;
