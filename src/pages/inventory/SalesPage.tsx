import { useState, useEffect, ChangeEvent, useMemo } from 'react';
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
    IconButton
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import type { SaleRecord } from '../../types';

const SalesPage = () => {
    const {
        salesLog,
        logsLoading,
        manualFilters,
        fetchManualLogs,
        setManualFilters,
        fetchSnapshot
    } = useInventoryStore((state) => ({
        salesLog: state.salesLog,
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
    const [allSalesData, setAllSalesData] = useState<SaleRecord[]>([]);
    const [initialLoad, setInitialLoad] = useState<boolean>(true);

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
        if (salesLog.length > 0 && (allSalesData.length === 0 || salesLog.length > allSalesData.length)) {
            setAllSalesData(salesLog);
        }
    }, [salesLog]);

    // Filtrar los datos localmente según las fechas
    const filteredSales = useMemo(() => {
        if (allSalesData.length === 0) return [];

        let filtered = [...allSalesData];

        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(sale => {
                const saleDate = new Date(sale.timestamp);
                return saleDate >= fromDate;
            });
        }

        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(sale => {
                const saleDate = new Date(sale.timestamp);
                return saleDate <= toDate;
            });
        }

        return filtered;
    }, [allSalesData, dateFrom, dateTo]);

    // Calcular items paginados (mostrar las últimas 20 primero)
    const paginatedSales = useMemo(() => {
        if (filteredSales.length === 0) return [];
        // Los datos ya vienen ordenados por timestamp descendente (más recientes primero)
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredSales.slice(startIndex, endIndex);
    }, [filteredSales, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
    }, [filteredSales.length]);

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

    return (
        <Grid container spacing={3} sx={{ py: 0 }}>
            <Grid item xs={12}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h4">Ventas</Typography>
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
                            disabled
                        >
                            Actualizar
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

            {initialLoad && logsLoading ? (
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                </Grid>
            ) : filteredSales.length === 0 ? (
                <Grid item xs={12}>
                    <Alert severity="info">No hay ventas registradas en el rango de fechas seleccionado.</Alert>
                </Grid>
            ) : (
                <>
                    {paginatedSales.map((sale: SaleRecord) => (
                        <Grid key={sale._id} item xs={12} md={6}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                Venta #{sale._id.slice(-6)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(sale.timestamp)}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            Origen: {sale.source === 'pos' ? 'TPV' : 'Manual'}
                                        </Typography>
                                        <Divider />
                                        <Stack spacing={1}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Items:
                                            </Typography>
                                            {sale.lines.map((line, index) => {
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
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {filteredSales.length > 0 && (
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

export default SalesPage;
