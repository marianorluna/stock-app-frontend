import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useInventoryStore } from '../hooks/useInventoryStore';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission } from '../components/auth/RequirePermission';
import SearchIcon from '@mui/icons-material/Search';
import type { Ingredient } from '../types';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type DrinkFormValues = {
  name: string;
  sku: string;
  stock: number;
  stockUnit: 'u' | 'g' | 'ml';
  purchaseUnit: string;
  conversionFactor: number;
  conversionUnit: 'u' | 'g' | 'ml';
  reorderPoint: number;
  allergens: string[];
  codeArticlePurchase: string;
};

const defaultValues: DrinkFormValues = {
  name: '',
  sku: '',
  stock: 0,
  stockUnit: 'u',
  purchaseUnit: 'unidad',
  conversionFactor: 1,
  conversionUnit: 'u',
  reorderPoint: 0,
  allergens: [],
  codeArticlePurchase: ''
};

// Alérgenos comunes
const commonAllergens = ['huevo', 'lacteos', 'gluten', 'frutos secos', 'pescado'];

const DrinksPage = () => {
  const { ingredients, fetchIngredients, error } = useInventoryStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    error: state.error
  }));

  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [selectedDrink, setSelectedDrink] = useState<Ingredient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ingredient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting }
  } = useForm<DrinkFormValues>({ defaultValues });

  useEffect(() => {
    void fetchIngredients();
  }, [fetchIngredients]);

  // Mostrar ingredientes de bebidas
  const drinks = useMemo(
    () => ingredients.filter((ingredient) => ingredient.category === 'bebida'),
    [ingredients]
  );

  const filteredDrinks = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return drinks;
    return drinks.filter((drink) => {
      const nameMatch = drink.name.toLowerCase().includes(normalizedTerm);
      return nameMatch;
    });
  }, [drinks, searchTerm]);

  const handleOpen = () => {
    setDialogMode('create');
    setSelectedDrink(null);
    reset(defaultValues);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDrink(null);
  };

  const handleEdit = (drink: Ingredient) => {
    setDialogMode('edit');
    setSelectedDrink(drink);
    reset({
      name: drink.name,
      sku: drink.sku ?? '',
      stock: drink.stock,
      stockUnit: drink.stockUnit ?? 'u',
      purchaseUnit: drink.purchaseUnit ?? 'unidad',
      conversionFactor: drink.conversionFactor ?? 1,
      conversionUnit: drink.conversionUnit ?? 'u',
      reorderPoint: drink.reorderPoint ?? 0,
      allergens: drink.allergens ?? [],
      codeArticlePurchase: drink.codeArticlePurchase ?? ''
    });
    setOpen(true);
  };

  const handleDuplicate = (drink: Ingredient) => {
    setDialogMode('duplicate');
    setSelectedDrink(drink);
    reset({
      name: `${drink.name} (copia)`,
      sku: `${drink.sku ?? ''}-COPY`,
      stock: drink.stock,
      stockUnit: drink.stockUnit ?? 'u',
      purchaseUnit: drink.purchaseUnit ?? 'unidad',
      conversionFactor: drink.conversionFactor ?? 1,
      conversionUnit: drink.conversionUnit ?? 'u',
      reorderPoint: drink.reorderPoint ?? 0,
      allergens: drink.allergens ?? [],
      codeArticlePurchase: drink.codeArticlePurchase ?? ''
    });
    setOpen(true);
  };

  const handleDelete = (drink: Ingredient) => {
    setConfirmDelete(drink);
  };

  const confirmDeleteDrink = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/ingredients/${confirmDelete._id}`);
    setConfirmDelete(null);
    await fetchIngredients();
  };

  const onSubmit = handleSubmit(async (values) => {
    // Asegurar que la categoría sea 'bebida'
    const payload = {
      ...values,
      category: 'bebida'
    };

    if (dialogMode === 'edit' && selectedDrink) {
      await apiClient.put<Ingredient>(`/ingredients/${selectedDrink._id}`, payload);
    } else {
      await apiClient.post<Ingredient>('/ingredients', payload);
    }

    setOpen(false);
    setSelectedDrink(null);
    await fetchIngredients();
  });

  const dialogTitle =
    dialogMode === 'edit'
      ? 'Editar bebida'
      : dialogMode === 'duplicate'
      ? 'Duplicar bebida'
      : 'Nueva bebida';

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Bebidas</Typography>
          <RequirePermission resource="ingredients" action="create" hide>
            <Button variant="contained" onClick={handleOpen}>
              Nueva bebida
            </Button>
          </RequirePermission>
        </Stack>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      <Grid item xs={12}>
        <TextField
          fullWidth
          placeholder="Buscar bebidas"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {filteredDrinks.length} {filteredDrinks.length === 1 ? 'bebida' : 'bebidas'}
        </Typography>
      </Grid>

      {filteredDrinks.map((drink) => (
        <Grid item xs={12} md={6} key={drink._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{drink.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Stock: {drink.stock} {drink.stockUnit ?? 'u'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Punto de pedido: {drink.reorderPoint} {drink.stockUnit ?? 'u'}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <RequirePermission resource="ingredients" action="update" hide>
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => handleEdit(drink)}
                  >
                    Editar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="ingredients" action="create" hide>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={() => handleDuplicate(drink)}
                  >
                    Duplicar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="ingredients" action="delete" hide>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => handleDelete(drink)}
                  >
                    Eliminar
                  </Button>
                </RequirePermission>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" {...register('name', { required: true })} />
            <TextField label="SKU" {...register('sku', { required: true })} />
            <TextField label="Stock inicial" type="number" {...register('stock', { valueAsNumber: true })} />
            <TextField label="Unidad de stock" select {...register('stockUnit', { required: true })}>
              <MenuItem value="u">Unidades (u)</MenuItem>
              <MenuItem value="g">Gramos (g)</MenuItem>
              <MenuItem value="ml">Mililitros (ml)</MenuItem>
            </TextField>
            <TextField label="Unidad de compra" {...register('purchaseUnit', { required: true })} />
            <TextField label="Factor de conversión" type="number" {...register('conversionFactor', { valueAsNumber: true, required: true })} />
            <TextField label="Unidad de conversión" select {...register('conversionUnit', { required: true })}>
              <MenuItem value="u">Unidades (u)</MenuItem>
              <MenuItem value="g">Gramos (g)</MenuItem>
              <MenuItem value="ml">Mililitros (ml)</MenuItem>
            </TextField>
            <TextField label="Punto de pedido" type="number" {...register('reorderPoint', { valueAsNumber: true })} />
            <Controller
              control={control}
              name="allergens"
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={commonAllergens}
                  value={value || []}
                  onChange={(_, newValue) => {
                    onChange(newValue);
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={index}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Alérgenos"
                      placeholder="Seleccionar o escribir alérgenos"
                    />
                  )}
                />
              )}
            />
            <TextField label="Código artículo compra" {...register('codeArticlePurchase')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar la bebida "{confirmDelete?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteDrink}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default DrinksPage;


