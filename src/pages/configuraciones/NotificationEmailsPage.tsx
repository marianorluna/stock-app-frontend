import { useState, useEffect } from 'react';
import {
    Grid,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Alert,
    CircularProgress,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
    Tooltip,
    InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';

interface EmailEntry {
    _id: string;
    email: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NotificationEmailsPage = () => {
    const navigate = useNavigate();

    // Lista de emails
    const [emails, setEmails] = useState<EmailEntry[]>([]);
    const [loadingEmails, setLoadingEmails] = useState(true);

    // Nuevo email
    const [newEmail, setNewEmail] = useState('');
    const [addingEmail, setAddingEmail] = useState(false);

    // Edición inline
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Eliminar
    const [deleteTarget, setDeleteTarget] = useState<EmailEntry | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Feedback
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadEmails();
    }, []);

    const loadEmails = async () => {
        try {
            setLoadingEmails(true);
            const { data } = await apiClient.get<{ success: boolean; emails: EmailEntry[] }>(
                '/config/notification-emails'
            );
            setEmails(data.emails ?? []);
        } catch (err) {
            console.error('Error cargando emails:', err);
            setError('Error al cargar los emails de notificación');
        } finally {
            setLoadingEmails(false);
        }
    };

    const showSuccess = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3000);
    };

    // ── Agregar ──────────────────────────────────────────────────────────────────
    const handleAddEmail = async () => {
        const trimmed = newEmail.trim().toLowerCase();
        if (!trimmed) { setError('El email no puede estar vacío'); return; }
        if (!EMAIL_REGEX.test(trimmed)) { setError('El formato del email no es válido'); return; }

        setError(null);
        setAddingEmail(true);
        try {
            const { data } = await apiClient.post<{ success: boolean; emailEntry: EmailEntry }>(
                '/config/notification-emails',
                { email: trimmed }
            );
            setEmails(prev => [...prev, data.emailEntry]);
            setNewEmail('');
            showSuccess('Email agregado exitosamente');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al agregar el email');
        } finally {
            setAddingEmail(false);
        }
    };

    // ── Iniciar edición ───────────────────────────────────────────────────────────
    const startEdit = (entry: EmailEntry) => {
        setEditingId(entry._id);
        setEditingValue(entry.email);
        setError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingValue('');
    };

    // ── Guardar edición ───────────────────────────────────────────────────────────
    const handleSaveEdit = async () => {
        const trimmed = editingValue.trim().toLowerCase();
        if (!trimmed) { setError('El email no puede estar vacío'); return; }
        if (!EMAIL_REGEX.test(trimmed)) { setError('El formato del email no es válido'); return; }

        setError(null);
        setSavingEdit(true);
        try {
            const { data } = await apiClient.put<{ success: boolean; emailEntry: EmailEntry }>(
                `/config/notification-emails/${editingId}`,
                { email: trimmed }
            );
            setEmails(prev =>
                prev.map(e => (e._id === editingId ? data.emailEntry : e))
            );
            cancelEdit();
            showSuccess('Email actualizado exitosamente');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al actualizar el email');
        } finally {
            setSavingEdit(false);
        }
    };

    // ── Confirmar eliminación ─────────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await apiClient.delete(`/config/notification-emails/${deleteTarget._id}`);
            setEmails(prev => prev.filter(e => e._id !== deleteTarget._id));
            setDeleteTarget(null);
            showSuccess('Email eliminado exitosamente');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al eliminar el email');
            setDeleteTarget(null);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Grid container spacing={3} sx={{ py: 0 }}>
            {/* Cabecera */}
            <Grid item xs={12}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Button variant="text" onClick={() => navigate('/configuraciones')}>
                        ← Volver
                    </Button>
                    <Typography variant="h4">Admin emails</Typography>
                </Stack>
            </Grid>

            <Grid item xs={12} md={8}>
                <Stack spacing={3}>

                    {/* Alertas */}
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" onClose={() => setSuccess(null)}>
                            {success}
                        </Alert>
                    )}

                    {/* Card: agregar nuevo email */}
                    <Card variant="outlined">
                        <CardContent>
                            <Stack spacing={2}>
                                <Typography variant="h6">Emails de notificación</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Ingresa una dirección de correo electrónico para recibir notificaciones del sistema.
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        fullWidth
                                        label="Nuevo email"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        placeholder="ejemplo@correo.com"
                                        size="small"
                                        disabled={addingEmail}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAddEmail(); }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailIcon fontSize="small" color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        startIcon={addingEmail ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                                        onClick={handleAddEmail}
                                        disabled={addingEmail || !newEmail.trim()}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        Agregar
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Card: lista de emails */}
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Emails configurados
                            </Typography>
                            {loadingEmails ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : emails.length === 0 ? (
                                <Box sx={{ py: 3, textAlign: 'center' }}>
                                    <EmailIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        No hay emails configurados. Agrega uno arriba.
                                    </Typography>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {emails.map((entry, index) => (
                                        <Box key={entry._id}>
                                            {index > 0 && <Divider />}
                                            <ListItem
                                                disableGutters
                                                sx={{ py: 1.5, pr: editingId === entry._id ? 0 : 12 }}
                                            >
                                                {editingId === entry._id ? (
                                                    // Modo edición inline
                                                    <Stack direction="row" spacing={1} sx={{ width: '100%' }} alignItems="center">
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            value={editingValue}
                                                            onChange={e => setEditingValue(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleSaveEdit();
                                                                if (e.key === 'Escape') cancelEdit();
                                                            }}
                                                            autoFocus
                                                            disabled={savingEdit}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        <EmailIcon fontSize="small" color="action" />
                                                                    </InputAdornment>
                                                                )
                                                            }}
                                                        />
                                                        <Tooltip title="Guardar">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={handleSaveEdit}
                                                                    disabled={savingEdit || !editingValue.trim()}
                                                                >
                                                                    {savingEdit ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title="Cancelar">
                                                            <IconButton size="small" onClick={cancelEdit} disabled={savingEdit}>
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                ) : (
                                                    // Modo vista
                                                    <>
                                                        <ListItemText
                                                            primary={entry.email}
                                                            primaryTypographyProps={{ variant: 'body1' }}
                                                        />
                                                        <ListItemSecondaryAction>
                                                            <Tooltip title="Editar">
                                                                <IconButton
                                                                    edge="end"
                                                                    size="small"
                                                                    onClick={() => startEdit(entry)}
                                                                    sx={{ mr: 0.5 }}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Eliminar">
                                                                <IconButton
                                                                    edge="end"
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => setDeleteTarget(entry)}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </ListItemSecondaryAction>
                                                    </>
                                                )}
                                            </ListItem>
                                        </Box>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Stack>
            </Grid>

            {/* Diálogo de confirmación de eliminación */}
            <Dialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Eliminar email</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas eliminar el email{' '}
                        <strong>{deleteTarget?.email}</strong>? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        variant="contained"
                        color="error"
                        disabled={deleting}
                    >
                        {deleting ? <CircularProgress size={24} /> : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Grid>
    );
};

export default NotificationEmailsPage;
