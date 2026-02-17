import { useState, useEffect, ChangeEvent, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import type { PurchaseRecord } from '../../types';
import apiClient from '../../services/apiClient';

const PurchasesPage = () => {
  const {
    purchasesLog,
    logsLoading,
    manualFilters,
    fetchManualLogs,
    setManualFilters,
    fetchSnapshot
  } = useInventoryStore((state) => ({
    purchasesLog: state.purchasesLog,
    logsLoading: state.logsLoading,
    manualFilters: state.manualFilters,
    fetchManualLogs: state.fetchManualLogs,
    setManualFilters: state.setManualFilters,
    fetchSnapshot: state.fetchSnapshot
  }));

  const [dateFrom, setDateFrom] = useState<string>(
    manualFilters.from || ''
  );
  const [dateTo, setDateTo] = useState<string>(
    manualFilters.to || ''
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allPurchasesData, setAllPurchasesData] = useState<PurchaseRecord[]>([]);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [processingPdfs, setProcessingPdfs] = useState<boolean>(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState<boolean>(false);
  const [pdfPreviewData, setPdfPreviewData] = useState<any>(null);
  const [pdfInvoiceIds, setPdfInvoiceIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 20;

  // Cargar todos los datos una vez al inicio (sin filtros)
  useEffect(() => {
    const loadAllData = async () => {
      setInitialLoad(true);
      await fetchManualLogs({}); // Cargar sin filtros
      setInitialLoad(false);
    };
    void loadAllData();
    setCurrentPage(1);
  }, [fetchManualLogs]);

  // Guardar todos los datos cuando se cargan inicialmente
  useEffect(() => {
    if (purchasesLog.length > 0 && (allPurchasesData.length === 0 || purchasesLog.length > allPurchasesData.length)) {
      setAllPurchasesData(purchasesLog);
    }
  }, [purchasesLog]);

  // Filtrar los datos localmente según las fechas
  const filteredPurchases = useMemo(() => {
    if (allPurchasesData.length === 0) return [];

    let filtered = [...allPurchasesData];

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(purchase => {
        const purchaseDate = new Date(purchase.timestamp);
        return purchaseDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(purchase => {
        const purchaseDate = new Date(purchase.timestamp);
        return purchaseDate <= toDate;
      });
    }

    return filtered;
  }, [allPurchasesData, dateFrom, dateTo]);

  // Calcular items paginados (mostrar las últimas 20 primero)
  const paginatedPurchases = useMemo(() => {
    if (filteredPurchases.length === 0) return [];
    // Los datos ya vienen ordenados por timestamp descendente (más recientes primero)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPurchases.slice(startIndex, endIndex);
  }, [filteredPurchases, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE);
  }, [filteredPurchases.length]);

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

  const handleDateFromChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDateFrom(event.target.value);
  };

  const handleDateToChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDateTo(event.target.value);
  };

  const handleFilter = () => {
    const newFilters = {
      from: dateFrom || undefined,
      to: dateTo || undefined
    };
    setManualFilters(newFilters);
    setCurrentPage(1); // Resetear a la primera página al filtrar
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      alert('Por favor, selecciona un archivo JSON válido');
      return;
    }

    // Validar tamaño (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Máximo permitido: 2 MB`);
      return;
    }

    setUploading(true);

    try {
      // Leer archivo como texto
      const fileContent = await file.text();
      const invoiceData = JSON.parse(fileContent);

      // Validar estructura básica
      if (!invoiceData.lista_items || !Array.isArray(invoiceData.lista_items)) {
        alert('El archivo JSON no tiene la estructura correcta. Debe contener lista_items como array.');
        setUploading(false);
        return;
      }

      // Subir archivo
      const uploadResponse = await apiClient.post('/invoices/upload', invoiceData);

      if (uploadResponse.data.success) {
        const invoiceId = uploadResponse.data.invoiceId;
        setCurrentInvoiceId(invoiceId);

        // Generar preview
        const previewResponse = await apiClient.post(`/invoices/preview/${invoiceId}`);

        if (previewResponse.data.success) {
          setPreviewData(previewResponse.data);
          setPreviewOpen(true);
        } else {
          alert('Error generando preview: ' + previewResponse.data.message);
        }
      } else {
        alert('Error subiendo archivo: ' + uploadResponse.data.message);
      }

    } catch (error: any) {
      console.error('Error procesando archivo:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error procesando archivo';
      alert(errorMessage);
    } finally {
      setUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmInvoice = async () => {
    if (!currentInvoiceId) return;

    setConfirming(true);

    try {
      const response = await apiClient.post(`/invoices/confirm/${currentInvoiceId}`);

      if (response.data.success) {
        alert('Factura procesada y aplicada exitosamente');
        setPreviewOpen(false);
        setPreviewData(null);
        setCurrentInvoiceId(null);

        // Recargar datos
        await fetchManualLogs({});
        await fetchSnapshot();
      } else {
        alert('Error confirmando factura: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Error confirmando factura:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error confirmando factura';
      alert(errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
    setCurrentInvoiceId(null);
  };

  const handleUpdatePdfs = async () => {
    setProcessingPdfs(true);
    setPdfPreviewOpen(true);
    setPdfPreviewData(null);
    setPdfInvoiceIds([]);

    try {
      const response = await apiClient.post('/invoices/process-pdfs');

      if (response.data.success) {
        const invoices = response.data.invoices || [];

        if (invoices.length === 0) {
          alert('No hay facturas nuevas para procesar');
          setPdfPreviewOpen(false);
          setProcessingPdfs(false);
          return;
        }

        // Recopilar todos los IDs de facturas procesadas
        const allInvoiceIds = invoices
          .filter((inv: any) => inv.invoiceId)
          .map((inv: any) => inv.invoiceId);
        setPdfInvoiceIds(allInvoiceIds);

        // Si hay múltiples facturas, mostrar la primera (o todas en una lista)
        // Por ahora, mostramos la primera factura procesada con preview
        const firstInvoice = invoices.find((inv: any) => inv.preview) || invoices[0];

        if (firstInvoice && firstInvoice.preview) {
          setPdfPreviewData({
            summary: firstInvoice.preview.summary,
            nuevosIngredientes: firstInvoice.preview.nuevosIngredientes || [],
            ingredientesActualizados: firstInvoice.preview.ingredientesActualizados || [],
            errors: firstInvoice.preview.errors || [],
            fileName: firstInvoice.fileName,
            invoiceData: firstInvoice.invoiceData,
            totalInvoices: invoices.length
          });
        } else {
          alert('Error: No se pudo generar el preview de las facturas procesadas');
          setPdfPreviewOpen(false);
        }
      } else {
        alert('Error procesando facturas PDF: ' + (response.data.message || 'Error desconocido'));
        setPdfPreviewOpen(false);
      }
    } catch (error: any) {
      console.error('Error procesando facturas PDF:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error procesando facturas PDF';
      alert(errorMessage);
      setPdfPreviewOpen(false);
    } finally {
      setProcessingPdfs(false);
    }
  };

  const handleCancelPdfPreview = async () => {
    // Cancelar todas las facturas procesadas
    if (pdfInvoiceIds.length > 0) {
      try {
        for (const invoiceId of pdfInvoiceIds) {
          await apiClient.delete(`/invoices/cancel-pdf/${invoiceId}`);
        }
      } catch (error: any) {
        console.error('Error cancelando facturas:', error);
        // Continuar con el cierre del diálogo aunque haya error
      }
    }

    setPdfPreviewOpen(false);
    setPdfPreviewData(null);
    setPdfInvoiceIds([]);
  };

  const handleAcceptPdfPreview = () => {
    // Por ahora, solo mostrar un mensaje
    alert('Funcionalidad de aceptar aún no implementada');
    // TODO: Implementar funcionalidad de aceptar
  };

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Compras</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={handleFilter}
            >
              Filtrar
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: '#424242',
                '&:hover': {
                  backgroundColor: '#616161'
                }
              }}
              onClick={handleUpdatePdfs}
              //disabled={processingPdfs}
              disabled={true}
              startIcon={processingPdfs ? <CircularProgress size={20} /> : null}
            >
              {processingPdfs ? 'Procesando...' : 'Actualizar'}
            </Button>
          </Stack>
        </Stack>
      </Grid>
      <Grid item xs={12}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Fecha desde"
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            InputLabelProps={{
              shrink: true
            }}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            label="Fecha hasta"
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            InputLabelProps={{
              shrink: true
            }}
            sx={{ flexGrow: 1 }}
          />
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ width: '100%' }}
        >
          <input
            type="file"
            accept=".json,application/json"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={() => fileInputRef.current?.click()}
            //disabled={uploading}
            disabled={true}
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
            sx={{ flex: 1 }}
            style={{ marginLeft: '0' }}
          >
            {uploading ? 'Procesando...' : 'Factura JSON'}
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              // TODO: Implementar funcionalidad de sincronizar
            }}
            startIcon={<PictureAsPdfIcon />}
            sx={{ flex: 1 }}
            disabled={true}
          >
            Factura PDF
          </Button>
        </Stack>
      </Grid>

      {/* Diálogo de Preview para PDFs */}
      <Dialog
        open={pdfPreviewOpen}
        onClose={handleCancelPdfPreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {processingPdfs ? 'Procesando Facturas PDF...' : 'Vista Previa de Factura PDF'}
            </Typography>
            {pdfPreviewData?.summary && (
              <Chip
                label={`${pdfPreviewData.summary.totalItems} items`}
                color="primary"
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {processingPdfs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <Stack spacing={2} alignItems="center">
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Procesando facturas PDF con Gemini. No cierre esta ventana.
                </Typography>
              </Stack>
            </Box>
          ) : pdfPreviewData ? (
            <Stack spacing={3}>
              {/* Resumen */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Resumen
                </Typography>
                <Stack spacing={1}>
                  {pdfPreviewData.summary && (
                    <>
                      <Typography variant="body2">
                        <strong>Total items:</strong> {pdfPreviewData.summary.totalItems}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nuevos ingredientes:</strong> {pdfPreviewData.summary.nuevosIngredientes}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Ingredientes actualizados:</strong> {pdfPreviewData.summary.ingredientesActualizados}
                      </Typography>
                      {pdfPreviewData.summary.errores > 0 && (
                        <Typography variant="body2" color="error">
                          <strong>Errores:</strong> {pdfPreviewData.summary.errores}
                        </Typography>
                      )}
                    </>
                  )}
                  {pdfPreviewData.fileName && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Archivo:</strong> {pdfPreviewData.fileName}
                    </Typography>
                  )}
                  {pdfPreviewData.totalInvoices && pdfPreviewData.totalInvoices > 1 && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Total facturas procesadas:</strong> {pdfPreviewData.totalInvoices}
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Nuevos Ingredientes */}
              {pdfPreviewData.nuevosIngredientes && pdfPreviewData.nuevosIngredientes.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Nuevos Ingredientes ({pdfPreviewData.nuevosIngredientes.length})
                  </Typography>
                  <List dense>
                    {pdfPreviewData.nuevosIngredientes.map((item: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.nombre}
                          secondary={
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Chip label={`SKU: ${item.sku}`} size="small" variant="outlined" />
                              <Chip label={`${item.cantidad}g`} size="small" variant="outlined" />
                              {item.unidad_interpretada && (
                                <Chip label={item.unidad_interpretada} size="small" variant="outlined" />
                              )}
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Ingredientes Actualizados */}
              {pdfPreviewData.ingredientesActualizados && pdfPreviewData.ingredientesActualizados.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Ingredientes Actualizados ({pdfPreviewData.ingredientesActualizados.length})
                  </Typography>
                  <List dense>
                    {pdfPreviewData.ingredientesActualizados.map((item: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.nombre}
                          secondary={
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Chip
                                label={`Stock anterior: ${item.cantidadAnterior}g`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={`+${item.cantidadAgregada}g`}
                                size="small"
                                color="success"
                              />
                              {item.unidad_interpretada && (
                                <Chip label={item.unidad_interpretada} size="small" variant="outlined" />
                              )}
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Errores */}
              {pdfPreviewData.errors && pdfPreviewData.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom color="error">
                    Errores ({pdfPreviewData.errors.length})
                  </Typography>
                  <List dense>
                    {pdfPreviewData.errors.map((error: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={error.descripcion || error.codigo}
                          secondary={error.error}
                          primaryTypographyProps={{ color: 'error' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Stack>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPdfPreview} disabled={processingPdfs}>
            Cancelar
          </Button>
          <Button
            onClick={handleAcceptPdfPreview}
            variant="contained"
            disabled={processingPdfs || !pdfPreviewData}
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Preview */}
      <Dialog
        open={previewOpen}
        onClose={handleCancelPreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Vista Previa de Factura</Typography>
            {previewData?.summary && (
              <Chip
                label={`${previewData.summary.totalItems} items`}
                color="primary"
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {previewData ? (
            <Stack spacing={3}>
              {/* Resumen */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Resumen
                </Typography>
                <Stack spacing={1}>
                  {previewData.summary && (
                    <>
                      <Typography variant="body2">
                        <strong>Total items:</strong> {previewData.summary.totalItems}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nuevos ingredientes:</strong> {previewData.summary.nuevosIngredientes}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Ingredientes actualizados:</strong> {previewData.summary.ingredientesActualizados}
                      </Typography>
                      {previewData.summary.errores > 0 && (
                        <Typography variant="body2" color="error">
                          <strong>Errores:</strong> {previewData.summary.errores}
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Nuevos Ingredientes */}
              {previewData.nuevosIngredientes && previewData.nuevosIngredientes.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Nuevos Ingredientes ({previewData.nuevosIngredientes.length})
                  </Typography>
                  <List dense>
                    {previewData.nuevosIngredientes.map((item: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.nombre}
                          secondary={
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Chip label={`SKU: ${item.sku}`} size="small" variant="outlined" />
                              <Chip label={`${item.cantidad}g`} size="small" variant="outlined" />
                              {item.unidad_interpretada && (
                                <Chip label={item.unidad_interpretada} size="small" variant="outlined" />
                              )}
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Ingredientes Actualizados */}
              {previewData.ingredientesActualizados && previewData.ingredientesActualizados.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Ingredientes Actualizados ({previewData.ingredientesActualizados.length})
                  </Typography>
                  <List dense>
                    {previewData.ingredientesActualizados.map((item: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.nombre}
                          secondary={
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Chip
                                label={`Stock anterior: ${item.cantidadAnterior}g`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={`+${item.cantidadAgregada}g`}
                                size="small"
                                color="success"
                              />
                              {item.unidad_interpretada && (
                                <Chip label={item.unidad_interpretada} size="small" variant="outlined" />
                              )}
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Errores */}
              {previewData.errors && previewData.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom color="error">
                    Errores ({previewData.errors.length})
                  </Typography>
                  <List dense>
                    {previewData.errors.map((error: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={error.descripcion || error.codigo}
                          secondary={error.error}
                          primaryTypographyProps={{ color: 'error' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Stack>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPreview} disabled={confirming}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmInvoice}
            variant="contained"
            disabled={confirming || !previewData}
            startIcon={confirming ? <CircularProgress size={20} /> : null}
          >
            {confirming ? 'Aplicando...' : 'Confirmar y Aplicar'}
          </Button>
        </DialogActions>
      </Dialog>

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
                        Compra #{purchase._id.slice(-6)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(purchase.timestamp)}
                      </Typography>
                    </Stack>
                    {purchase.supplier && (
                      <Typography variant="body2" color="text.secondary">
                        Proveedor: {purchase.supplier}
                      </Typography>
                    )}
                    {purchase.invoiceNumber && (
                      <Typography variant="body2" color="text.secondary">
                        Factura: {purchase.invoiceNumber}
                      </Typography>
                    )}
                    <Divider />
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Items:
                      </Typography>
                      {purchase.items.map((item, index) => {
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
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {filteredPurchases.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
                <IconButton
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  Página {currentPage} de {totalPages}
                </Typography>
                <IconButton
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  aria-label="Página siguiente"
                >
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
